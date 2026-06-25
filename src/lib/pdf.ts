import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DocItem } from './api';

interface DocMeta {
  doc_number: string;
  doc_type: 'income' | 'outcome';
  party: string;
  created_at?: string;
}

// jsPDF поддерживает только TTF/OTF (не WOFF!)
const FONT_URL = 'https://cdn.jsdelivr.net/gh/google/fonts/apache/roboto/static/Roboto-Regular.ttf';
let fontBase64: string | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function ensureFont(pdf: jsPDF): Promise<boolean> {
  try {
    if (!fontBase64) {
      const res = await fetch(FONT_URL);
      if (!res.ok) return false;
      const buf = await res.arrayBuffer();
      fontBase64 = arrayBufferToBase64(buf);
    }
    pdf.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    return true;
  } catch {
    return false;
  }
}

export async function generateInvoicePdf(doc: DocMeta, items: DocItem[]) {
  const pdf = new jsPDF();
  const ok = await ensureFont(pdf);
  const font = ok ? 'Roboto' : 'helvetica';

  const title = doc.doc_type === 'income' ? 'ПРИХОДНАЯ НАКЛАДНАЯ' : 'РАСХОДНАЯ НАКЛАДНАЯ';

  pdf.setFont(font, 'normal');
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
    styles: { fontSize: 9, font },
    headStyles: { fillColor: [37, 64, 220], font, textColor: 255 },
    footStyles: { fillColor: [240, 240, 245], textColor: 20, fontStyle: 'bold', font },
    foot: [['', '', '', '', '', 'Итого:', total.toFixed(2)]],
  });

  const fileName = `${doc.doc_number}.pdf`;

  // Надёжное скачивание: на мобильных pdf.save может не сработать,
  // поэтому открываем blob через ссылку вручную.
  try {
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch {
    pdf.save(fileName);
  }
}
