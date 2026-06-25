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


INTAKE_CELL = 'Зона приёмки'


def _auth(cur, token):
    if not token:
        return None
    cur.execute(
        "SELECT e.id, e.role FROM sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token=%s",
        (token,))
    r = cur.fetchone()
    return {'id': r[0], 'role': r[1]} if r else None


def _adjust_stock(cur, product_id, cell, delta):
    cur.execute("SELECT id, qty FROM stock WHERE product_id=%s AND cell=%s", (product_id, cell))
    srow = cur.fetchone()
    if srow:
        new_qty = srow[1] + delta
        if new_qty <= 0:
            cur.execute("DELETE FROM stock WHERE id=%s", (srow[0],))
        else:
            cur.execute("UPDATE stock SET qty=%s, updated_at=now() WHERE id=%s", (new_qty, srow[0]))
    elif delta > 0:
        cur.execute("INSERT INTO stock (product_id, cell, qty) VALUES (%s,%s,%s)", (product_id, cell, delta))


def _resolve_product(cur, name, barcode, fallback):
    cur.execute("SELECT id FROM products WHERE barcode=%s", (barcode,))
    prow = cur.fetchone()
    if prow:
        return prow[0]
    cur.execute(
        "INSERT INTO products (name, barcode) VALUES (%s,%s) "
        "ON CONFLICT (barcode) DO UPDATE SET name=EXCLUDED.name RETURNING id",
        (name, barcode or fallback))
    return cur.fetchone()[0]


def _apply_document_items(cur, doc_id, doc_type, items):
    """Создаёт позиции накладной и обновляет остатки. Приход -> Зона приёмки."""
    for it in items:
        name = (it.get('name') or '').strip()
        barcode = (it.get('barcode') or '').strip()
        qty = int(it.get('qty') or 0)
        price = float(it.get('price') or 0)
        if doc_type == 'income':
            cell = INTAKE_CELL
        else:
            cell = (it.get('cell') or '').strip()
        pid = _resolve_product(cur, name, barcode, f'NB{doc_id}{qty}')
        cur.execute(
            "INSERT INTO document_items (document_id, product_id, name, barcode, cell, qty, price) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s)", (doc_id, pid, name, barcode, cell, qty, price))
        delta = qty if doc_type == 'income' else -qty
        _adjust_stock(cur, pid, cell, delta)


def _revert_document(cur, doc_id, doc_type):
    """Откатывает влияние позиций накладной на остатки и удаляет позиции."""
    cur.execute("SELECT product_id, cell, qty FROM document_items WHERE document_id=%s", (doc_id,))
    for pid, cell, qty in cur.fetchall():
        if pid is None:
            continue
        delta = -qty if doc_type == 'income' else qty
        _adjust_stock(cur, pid, cell, delta)
    cur.execute("DELETE FROM document_items WHERE document_id=%s", (doc_id,))


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
            _apply_document_items(cur, doc_id, doc_type, items)
            return _resp(200, {'id': doc_id, 'doc_number': doc_number, 'total_sum': total, 'items_count': len(items)})

        if action == 'document_update':
            doc_id = body.get('id')
            cur.execute("SELECT doc_type FROM documents WHERE id=%s", (doc_id,))
            drow = cur.fetchone()
            if not drow:
                return _resp(404, {'error': 'Накладная не найдена'})
            doc_type = drow[0]
            party = (body.get('party') or '').strip()
            items = body.get('items') or []
            _revert_document(cur, doc_id, doc_type)
            _apply_document_items(cur, doc_id, doc_type, items)
            total = sum(float(i.get('price', 0)) * int(i.get('qty', 0)) for i in items)
            cur.execute(
                "UPDATE documents SET party=%s, total_sum=%s, items_count=%s WHERE id=%s",
                (party, total, len(items), doc_id))
            return _resp(200, {'id': doc_id, 'total_sum': total, 'items_count': len(items)})

        if action == 'document_delete':
            cur.execute("SELECT doc_type FROM documents WHERE id=%s", (body.get('id'),))
            drow = cur.fetchone()
            if drow:
                _revert_document(cur, body.get('id'), drow[0])
            cur.execute("DELETE FROM documents WHERE id=%s", (body.get('id'),))
            return _resp(200, {'deleted': True})

        # ----- РАЗМЕЩЕНИЕ / ПЕРЕМЕЩЕНИЕ -----
        if action == 'stock_move':
            barcode = (body.get('barcode') or '').strip()
            from_cell = (body.get('from_cell') or '').strip()
            to_cell = (body.get('to_cell') or '').strip()
            qty = int(body.get('qty') or 0)
            if not barcode or not to_cell or qty <= 0:
                return _resp(400, {'error': 'Укажите товар, ячейку назначения и количество'})
            cur.execute("SELECT id, name FROM products WHERE barcode=%s", (barcode,))
            prow = cur.fetchone()
            if not prow:
                return _resp(404, {'error': 'Товар не найден'})
            pid = prow[0]
            cur.execute("SELECT qty FROM stock WHERE product_id=%s AND cell=%s", (pid, from_cell))
            srow = cur.fetchone()
            available = srow[0] if srow else 0
            if available < qty:
                return _resp(400, {'error': f'В ячейке «{from_cell or "—"}» доступно только {available} шт'})
            _adjust_stock(cur, pid, from_cell, -qty)
            _adjust_stock(cur, pid, to_cell, qty)
            return _resp(200, {'moved': qty, 'name': prow[1], 'from': from_cell, 'to': to_cell})

        if action == 'intake_items':
            cur.execute(
                "SELECT s.id, p.name, p.barcode, s.cell, s.qty FROM stock s "
                "JOIN products p ON p.id=s.product_id WHERE s.cell=%s AND s.qty>0 ORDER BY s.id DESC",
                (INTAKE_CELL,))
            return _resp(200, {'intake_cell': INTAKE_CELL, 'items': [
                {'id': r[0], 'name': r[1], 'barcode': r[2], 'cell': r[3], 'qty': r[4]} for r in cur.fetchall()]})

        # ----- ИНВЕНТАРИЗАЦИЯ -----
        if action == 'inventory_check':
            barcode = (params.get('barcode') or '').strip()
            cur.execute("SELECT id, name FROM products WHERE barcode=%s", (barcode,))
            prow = cur.fetchone()
            if not prow:
                return _resp(404, {'error': 'Товар не найден в базе'})
            pid = prow[0]
            cur.execute(
                "SELECT cell, qty FROM stock WHERE product_id=%s AND qty>0 ORDER BY cell", (pid,))
            cells = [{'cell': r[0], 'qty': r[1]} for r in cur.fetchall()]
            total = sum(c['qty'] for c in cells)
            return _resp(200, {
                'product': {'id': pid, 'name': prow[1], 'barcode': barcode},
                'system_qty': total, 'cells': cells})

        return _resp(400, {'error': 'Неизвестное действие'})
    finally:
        cur.close()
        conn.close()