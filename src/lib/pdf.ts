import type { DocItem } from './api';

interface DocMeta {
  doc_number: string;
  doc_type: 'income' | 'outcome';
  party: string;
  created_at?: string;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function generateInvoicePdf(doc: DocMeta, items: DocItem[]) {
  const title = doc.doc_type === 'income' ? 'ПРИХОДНАЯ НАКЛАДНАЯ' : 'РАСХОДНАЯ НАКЛАДНАЯ';
  const partyLabel = doc.doc_type === 'income' ? 'Поставщик' : 'Получатель';
  const dateStr = doc.created_at ? new Date(doc.created_at).toLocaleDateString('ru-RU') : '';
  const total = items.reduce((s, it) => s + it.qty * it.price, 0);

  const rowsHtml = items
    .map(
      (it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="left">${esc(it.name)}</td>
        <td>${esc(it.barcode)}</td>
        <td>${esc(it.cell)}</td>
        <td>${esc(it.qty)}</td>
        <td>${it.price.toFixed(2)}</td>
        <td>${(it.qty * it.price).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>${esc(doc.doc_number)}</title>
<style>
  * { font-family: Arial, "Segoe UI", "Helvetica Neue", sans-serif; }
  body { margin: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 14px; }
  .meta { font-size: 13px; line-height: 1.6; margin-bottom: 18px; }
  .meta b { display: inline-block; min-width: 90px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #2540dc; color: #fff; padding: 7px 6px; text-align: center; }
  td { padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: center; }
  td.left { text-align: left; }
  tfoot td { font-weight: bold; background: #f0f0f5; }
  .right { text-align: right; }
  @media print { body { margin: 0; padding: 16px; } }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <div><b>Номер:</b> ${esc(doc.doc_number)}</div>
    <div><b>${partyLabel}:</b> ${esc(doc.party || '-')}</div>
    ${dateStr ? `<div><b>Дата:</b> ${dateStr}</div>` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>№</th><th>Наименование</th><th>Штрих-код</th><th>Ячейка</th>
        <th>Кол-во</th><th>Цена</th><th>Сумма</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="6" class="right">Итого:</td>
        <td>${total.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Разрешите всплывающие окна, чтобы скачать PDF');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
