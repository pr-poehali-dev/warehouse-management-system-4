import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DocItem } from './api';

interface DocMeta {
  doc_number: string;
  doc_type: 'income' | 'outcome';
  party: string;
  created_at?: string;
}

export function generateInvoicePdf(doc: DocMeta, items: DocItem[]) {
  const pdf = new jsPDF();
  const title = doc.doc_type === 'income' ? 'ПРИХОДНАЯ НАКЛАДНАЯ' : 'РАСХОДНАЯ НАКЛАДНАЯ';

  pdf.setFontSize(16);
  pdf.text(title, 14, 20);
  pdf.setFontSize(11);
  pdf.text(`Номер: ${doc.doc_number}`, 14, 30);
  pdf.text(`${doc.doc_type === 'income' ? 'Поставщик' : 'Получатель'}: ${doc.party || '-'}`, 14, 37);
  if (doc.created_at) pdf.text(`Дата: ${new Date(doc.created_at).toLocaleDateString('ru-RU')}`, 14, 44);

  const rows = items.map((it, i) => [
    i + 1,
    it.name,
    it.barcode,
    it.cell,
    it.qty,
    it.price.toFixed(2),
    (it.qty * it.price).toFixed(2),
  ]);
  const total = items.reduce((s, it) => s + it.qty * it.price, 0);

  autoTable(pdf, {
    startY: 50,
    head: [['№', 'Наименование', 'Штрих-код', 'Ячейка', 'Кол-во', 'Цена', 'Сумма']],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 64, 220] },
    foot: [['', '', '', '', '', 'Итого:', total.toFixed(2)]],
    footStyles: { fillColor: [240, 240, 245], textColor: 20, fontStyle: 'bold' },
  });

  pdf.save(`${doc.doc_number}.pdf`);
}
