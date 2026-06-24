"""
Складские операции: товары, остатки, накладные приход/расход, инвентаризация, импорт Excel.
Действия через query-параметр action.
Требует X-Auth-Token (валидная сессия сотрудника).
"""
import json
import os
import psycopg2

def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        'Access-Control-Max-Age': '86400',
    }


def _resp(status: int, body):
    return {
        'statusCode': status,
        'headers': {**_cors(), 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def _auth(cur, token):
    if not token:
        return None
    cur.execute(
        "SELECT e.id, e.role FROM sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token=%s",
        (token,))
    r = cur.fetchone()
    return {'id': r[0], 'role': r[1]} if r else None


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
        user = _auth(cur, token)
        if not user:
            return _resp(401, {'error': 'Требуется авторизация'})

        # ----- ТОВАРЫ (база товаров) -----
        if action == 'products':
            cur.execute("SELECT id, name, barcode FROM products ORDER BY id DESC")
            return _resp(200, {'products': [{'id': r[0], 'name': r[1], 'barcode': r[2]} for r in cur.fetchall()]})

        if action == 'product_add':
            name = (body.get('name') or '').strip()
            barcode = (body.get('barcode') or '').strip()
            if not name or not barcode:
                return _resp(400, {'error': 'Укажите наименование и штрих-код'})
            cur.execute(
                "INSERT INTO products (name, barcode) VALUES (%s,%s) "
                "ON CONFLICT (barcode) DO UPDATE SET name=EXCLUDED.name RETURNING id",
                (name, barcode))
            return _resp(200, {'id': cur.fetchone()[0], 'name': name, 'barcode': barcode})

        if action == 'product_find':
            barcode = (params.get('barcode') or '').strip()
            cur.execute("SELECT id, name, barcode FROM products WHERE barcode=%s", (barcode,))
            r = cur.fetchone()
            if not r:
                return _resp(404, {'error': 'Товар не найден'})
            return _resp(200, {'product': {'id': r[0], 'name': r[1], 'barcode': r[2]}})

        if action == 'product_delete':
            cur.execute("DELETE FROM products WHERE id=%s", (body.get('id'),))
            return _resp(200, {'deleted': True})

        if action == 'products_import':
            rows = body.get('rows') or []
            added = 0
            for it in rows:
                name = (it.get('name') or '').strip()
                barcode = (it.get('barcode') or '').strip()
                if not name or not barcode:
                    continue
                cur.execute(
                    "INSERT INTO products (name, barcode) VALUES (%s,%s) "
                    "ON CONFLICT (barcode) DO UPDATE SET name=EXCLUDED.name", (name, barcode))
                added += 1
            return _resp(200, {'imported': added})

        # ----- ОСТАТКИ -----
        if action == 'stock':
            cur.execute(
                "SELECT s.id, p.name, p.barcode, s.cell, s.qty FROM stock s "
                "JOIN products p ON p.id=s.product_id ORDER BY s.id DESC")
            return _resp(200, {'stock': [
                {'id': r[0], 'name': r[1], 'barcode': r[2], 'cell': r[3], 'qty': r[4]} for r in cur.fetchall()]})

        if action == 'stock_delete':
            cur.execute("DELETE FROM stock WHERE id=%s", (body.get('id'),))
            return _resp(200, {'deleted': True})

        # ----- НАКЛАДНЫЕ (приход/расход) -----
        if action == 'documents':
            doc_type = params.get('type', 'income')
            cur.execute(
                "SELECT id, doc_number, doc_type, party, total_sum, items_count, created_at "
                "FROM documents WHERE doc_type=%s ORDER BY id DESC", (doc_type,))
            return _resp(200, {'documents': [
                {'id': r[0], 'doc_number': r[1], 'doc_type': r[2], 'party': r[3],
                 'total_sum': float(r[4]), 'items_count': r[5], 'created_at': str(r[6])}
                for r in cur.fetchall()]})

        if action == 'document_items':
            cur.execute(
                "SELECT name, barcode, cell, qty, price FROM document_items WHERE document_id=%s ORDER BY id",
                (params.get('id'),))
            return _resp(200, {'items': [
                {'name': r[0], 'barcode': r[1], 'cell': r[2], 'qty': r[3], 'price': float(r[4])}
                for r in cur.fetchall()]})

        if action == 'document_create':
            doc_type = body.get('doc_type', 'income')
            party = (body.get('party') or '').strip()
            items = body.get('items') or []
            prefix = 'ПР' if doc_type == 'income' else 'РС'
            cur.execute("SELECT COUNT(*) FROM documents WHERE doc_type=%s", (doc_type,))
            num = cur.fetchone()[0] + 1
            doc_number = f"{prefix}-{num:06d}"
            total = sum(float(i.get('price', 0)) * int(i.get('qty', 0)) for i in items)
            cur.execute(
                "INSERT INTO documents (doc_number, doc_type, party, total_sum, items_count) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                (doc_number, doc_type, party, total, len(items)))
            doc_id = cur.fetchone()[0]
            for it in items:
                name = (it.get('name') or '').strip()
                barcode = (it.get('barcode') or '').strip()
                cell = (it.get('cell') or '').strip()
                qty = int(it.get('qty') or 0)
                price = float(it.get('price') or 0)
                cur.execute("SELECT id FROM products WHERE barcode=%s", (barcode,))
                prow = cur.fetchone()
                if prow:
                    pid = prow[0]
                else:
                    cur.execute("INSERT INTO products (name, barcode) VALUES (%s,%s) ON CONFLICT (barcode) DO UPDATE SET name=EXCLUDED.name RETURNING id", (name, barcode or f'NB{doc_id}{qty}'))
                    pid = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO document_items (document_id, product_id, name, barcode, cell, qty, price) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s)", (doc_id, pid, name, barcode, cell, qty, price))
                delta = qty if doc_type == 'income' else -qty
                cur.execute("SELECT id, qty FROM stock WHERE product_id=%s AND cell=%s", (pid, cell))
                srow = cur.fetchone()
                if srow:
                    cur.execute("UPDATE stock SET qty=qty+%s, updated_at=now() WHERE id=%s", (delta, srow[0]))
                else:
                    cur.execute("INSERT INTO stock (product_id, cell, qty) VALUES (%s,%s,%s)", (pid, cell, max(delta, 0)))
            return _resp(200, {'id': doc_id, 'doc_number': doc_number, 'total_sum': total, 'items_count': len(items)})

        if action == 'document_delete':
            cur.execute("DELETE FROM documents WHERE id=%s", (body.get('id'),))
            return _resp(200, {'deleted': True})

        return _resp(400, {'error': 'Неизвестное действие'})
    finally:
        cur.close()
        conn.close()