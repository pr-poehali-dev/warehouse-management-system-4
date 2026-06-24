import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { whApi, DocItem } from '@/lib/api';
import { generateInvoicePdf } from '@/lib/pdf';
import SectionHead from './SectionHead';
import ScannerBar from './ScannerBar';

interface Doc {
  id: number;
  doc_number: string;
  doc_type: 'income' | 'outcome';
  party: string;
  total_sum: number;
  items_count: number;
  created_at: string;
}

const empty = (): DocItem => ({ name: '', barcode: '', cell: '', qty: 1, price: 0 });

export default function DocumentsSection({ type }: { type: 'income' | 'outcome' }) {
  const isIncome = type === 'income';
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState(false);
  const [party, setParty] = useState('');
  const [items, setItems] = useState<DocItem[]>([empty()]);
  const [saving, setSaving] = useState(false);

  const load = () => whApi.documents(type).then((d) => setDocs(d.documents)).catch(() => {});
  useEffect(() => { load(); }, [type]);

  const updateItem = (i: number, patch: Partial<DocItem>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const onScan = (barcode: string) => {
    const idx = items.findIndex((it) => !it.barcode);
    if (idx >= 0) updateItem(idx, { barcode });
    else setItems((a) => [...a, { ...empty(), barcode }]);
    toast.success('Штрих-код добавлен');
  };

  const create = async () => {
    const valid = items.filter((it) => it.name && it.qty > 0);
    if (!valid.length) return toast.error('Добавьте хотя бы одну позицию');
    setSaving(true);
    try {
      await whApi.documentCreate({ doc_type: type, party, items: valid });
      toast.success('Накладная сохранена');
      setOpen(false);
      setParty('');
      setItems([empty()]);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (d: Doc) => {
    const res = await whApi.documentItems(d.id);
    generateInvoicePdf(d, res.items);
  };

  const remove = async (id: number) => {
    await whApi.documentDelete(id);
    toast.success('Удалено');
    load();
  };

  return (
    <div className="animate-fade-in">
      <SectionHead
        title={isIncome ? 'Приход' : 'Расход'}
        desc={isIncome ? 'Приёмка товара и приходные накладные' : 'Отгрузка товара и расходные накладные'}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Icon name="Plus" size={16} /> {isIncome ? 'Новая накладная' : 'Новая отгрузка'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{isIncome ? 'Приходная накладная' : 'Расходная накладная'}</DialogTitle>
              </DialogHeader>
              <ScannerBar onScan={onScan} />
              <Input placeholder={isIncome ? 'Поставщик' : 'Получатель'} value={party} onChange={(e) => setParty(e.target.value)} />
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-4" placeholder="Наименование" value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} />
                    <Input className="col-span-3" placeholder="Штрих-код" value={it.barcode} onChange={(e) => updateItem(i, { barcode: e.target.value })} />
                    <Input className="col-span-2" placeholder="Ячейка" value={it.cell} onChange={(e) => updateItem(i, { cell: e.target.value })} />
                    <Input className="col-span-1" type="number" placeholder="Кол" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} />
                    <Input className="col-span-1" type="number" placeholder="Цена" value={it.price} onChange={(e) => updateItem(i, { price: Number(e.target.value) })} />
                    <Button variant="ghost" size="icon" className="col-span-1 text-destructive" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}>
                      <Icon name="X" size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setItems((a) => [...a, empty()])}>
                <Icon name="Plus" size={14} /> Добавить позицию
              </Button>
              <DialogFooter>
                <Button onClick={create} disabled={saving} className="gap-2">
                  {saving ? <Icon name="LoaderCircle" size={16} className="animate-spin" /> : <Icon name="Check" size={16} />}
                  Сохранить накладную
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="overflow-hidden rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Накладная</TableHead><TableHead>Дата</TableHead>
              <TableHead>{isIncome ? 'Поставщик' : 'Получатель'}</TableHead>
              <TableHead>Позиций</TableHead><TableHead>Сумма</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Накладных пока нет</TableCell></TableRow>
            )}
            {docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-semibold">{d.doc_number}</TableCell>
                <TableCell>{new Date(d.created_at).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell>{d.party || '—'}</TableCell>
                <TableCell>{d.items_count}</TableCell>
                <TableCell className="font-bold">{d.total_sum.toLocaleString('ru-RU')} ₽</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => downloadPdf(d)}>
                      <Icon name="FileDown" size={14} /> PDF
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(d.id)}>
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
