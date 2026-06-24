"""
Авторизация сотрудников, регистрация (только админом), список и удаление сотрудников.
Действия через query-параметр action: login, register, list, delete, me.
"""
import json
import os
import hashlib
import secrets
import psycopg2

ADMIN_LOGIN = 'v.ermikhin@door.su'
ADMIN_PASSWORD = 'heps458loktю'


def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _hash(password: str) -> str:
    return hashlib.sha256(('door_salt::' + password).encode('utf-8')).hexdigest()


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        'Access-Control-Max-Age': '86400',
    }


def _resp(status: int, body: dict):
    return {
        'statusCode': status,
        'headers': {**_cors(), 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def _ensure_schema(cur):
    cur.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            login VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'operator',
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token VARCHAR(128) PRIMARY KEY,
            employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(500) NOT NULL,
            barcode VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS stock (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            cell VARCHAR(50) NOT NULL DEFAULT '',
            qty INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            doc_number VARCHAR(50) NOT NULL,
            doc_type VARCHAR(20) NOT NULL,
            party VARCHAR(255) NOT NULL DEFAULT '',
            total_sum NUMERIC(14,2) NOT NULL DEFAULT 0,
            items_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS document_items (
            id SERIAL PRIMARY KEY,
            document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
            name VARCHAR(500) NOT NULL,
            barcode VARCHAR(100) NOT NULL DEFAULT '',
            cell VARCHAR(50) NOT NULL DEFAULT '',
            qty INTEGER NOT NULL DEFAULT 0,
            price NUMERIC(14,2) NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id);
        CREATE INDEX IF NOT EXISTS idx_docitems_doc ON document_items(document_id);
        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    """)


def _seed_admin(cur):
    cur.execute("SELECT password_hash FROM employees WHERE login=%s", (ADMIN_LOGIN,))
    row = cur.fetchone()
    h = _hash(ADMIN_PASSWORD)
    if row is None:
        cur.execute(
            "INSERT INTO employees (name, login, password_hash, role, active) VALUES (%s,%s,%s,'admin',TRUE)",
            ('Виктор Ермихин', ADMIN_LOGIN, h),
        )
    elif row[0] in ('PENDING_SEED', ''):
        cur.execute("UPDATE employees SET password_hash=%s WHERE login=%s", (h, ADMIN_LOGIN))


def _current(cur, token):
    if not token:
        return None
    cur.execute(
        "SELECT e.id, e.name, e.login, e.role, e.active FROM sessions s "
        "JOIN employees e ON e.id=s.employee_id WHERE s.token=%s", (token,))
    r = cur.fetchone()
    if not r:
        return None
    return {'id': r[0], 'name': r[1], 'login': r[2], 'role': r[3], 'active': r[4]}


def handler(event: dict, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        body = {}

    conn = _db()
    conn.autocommit = True
    cur = conn.cursor()
    try:
        _ensure_schema(cur)
        _seed_admin(cur)

        if action == 'login':
            login = (body.get('login') or '').strip()
            password = body.get('password') or ''
            cur.execute(
                "SELECT id, name, login, role, active, password_hash FROM employees WHERE login=%s", (login,))
            r = cur.fetchone()
            if not r or r[5] != _hash(password):
                return _resp(401, {'error': 'Неверный логин или пароль'})
            if not r[4]:
                return _resp(403, {'error': 'Сотрудник отключён'})
            new_token = secrets.token_hex(32)
            cur.execute("INSERT INTO sessions (token, employee_id) VALUES (%s,%s)", (new_token, r[0]))
            return _resp(200, {'token': new_token, 'user': {'id': r[0], 'name': r[1], 'login': r[2], 'role': r[3]}})

        user = _current(cur, token)
        if not user:
            return _resp(401, {'error': 'Требуется авторизация'})

        if action == 'me':
            return _resp(200, {'user': user})

        if action == 'list':
            cur.execute("SELECT id, name, login, role, active FROM employees ORDER BY id")
            rows = [{'id': x[0], 'name': x[1], 'login': x[2], 'role': x[3], 'active': x[4]} for x in cur.fetchall()]
            return _resp(200, {'employees': rows})

        if action == 'register':
            if user['role'] != 'admin':
                return _resp(403, {'error': 'Только администратор может регистрировать сотрудников'})
            name = (body.get('name') or '').strip()
            login = (body.get('login') or '').strip()
            password = body.get('password') or ''
            role = body.get('role') or 'operator'
            if not name or not login or not password:
                return _resp(400, {'error': 'Заполните имя, логин и пароль'})
            cur.execute("SELECT 1 FROM employees WHERE login=%s", (login,))
            if cur.fetchone():
                return _resp(409, {'error': 'Сотрудник с таким логином уже существует'})
            cur.execute(
                "INSERT INTO employees (name, login, password_hash, role, active) "
                "VALUES (%s,%s,%s,%s,TRUE) RETURNING id",
                (name, login, _hash(password), role))
            new_id = cur.fetchone()[0]
            return _resp(200, {'id': new_id, 'name': name, 'login': login, 'role': role, 'active': True})

        if action == 'delete':
            if user['role'] != 'admin':
                return _resp(403, {'error': 'Только администратор может удалять сотрудников'})
            emp_id = body.get('id')
            cur.execute("SELECT login FROM employees WHERE id=%s", (emp_id,))
            row = cur.fetchone()
            if row and row[0] == ADMIN_LOGIN:
                return _resp(400, {'error': 'Нельзя удалить главного администратора'})
            cur.execute("DELETE FROM employees WHERE id=%s", (emp_id,))
            return _resp(200, {'deleted': True})

        return _resp(400, {'error': 'Неизвестное действие'})
    finally:
        cur.close()
        conn.close()