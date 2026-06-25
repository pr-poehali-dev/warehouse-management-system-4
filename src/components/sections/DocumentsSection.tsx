import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
  const [editId, setEditId] = useState<number | null>(null);
  const [party, setParty] = useState('');
  const [items, setItems] = useState<DocItem[]>([empty()]);
  const [saving, setSaving] = useState(false);

  const load = () => whApi.documents(type).then((d) => setDocs(d.documents)).catch(() => {});
  useEffect(() => { load(); }, [type]);

  const updateItem = (i: number, patch: Partial<DocItem>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const openCreate = () => {
    setEditId(null);
    setParty('');
    setItems([empty()]);
    setOpen(true);
  };

  const openEdit = async (d: Doc) => {
    const res = await whApi.documentItems(d.id);
    setEditId(d.id);
    setParty(d.party);
    setItems(res.items.length ? res.items : [empty()]);
    setOpen(true);
  };

  const onScan = async (barcode: string) => {
    let product: { name: string } | null = null;
    try {
      const res = await whApi.productFind(barcode);
      product = res.product;
    } catch {
      product = null;
    }

    setItems((arr) => {
      const existing = arr.findIndex((it) => it.barcode === barcode);
      if (existing >= 0) {
        return arr.map((it, idx) => (idx === existing ? { ...it, qty: it.qty + 1 } : it));
      }
      const newItem: DocItem = { ...empty(), barcode, name: product?.name || '' };
      const emptyIdx = arr.findIndex((it) => !it.barcode && !it.name);
      if (emptyIdx >= 0) return arr.map((it, idx) => (idx === emptyIdx ? newItem : it));
      return [...arr, newItem];
    });

    if (product) toast.success(`Товар найден: ${product.name}`);
    else toast.warning('Товар не в базе — заполните наименование вручную');
  };

  const save = async () => {
    const valid = items.filter((it) => it.name && it.qty > 0);
    if (!valid.length) return toast.error('Добавьте хотя бы одну позицию');
    setSaving(true);
    try {
      if (editId) {
        await whApi.documentUpdate({ id: editId, party, items: valid });
        toast.success('Накладная обновлена');
      } else {
        await whApi.documentCreate({ doc_type: type, party, items: valid });
        toast.success(isIncome ? 'Принято в зону приёмки' : 'Накладная сохранена');
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (d: Doc) => {
    try {
      const res = await whApi.documentItems(d.id);
      await generateInvoicePdf(d, res.items);
      toast.success('Откройте печать → «Сохранить как PDF»');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сформировать PDF');
    }
  };

  const remove = async (id: number) => {
    await whApi.documentDelete(id);
    toast.success('Удалено, остатки пересчитаны');
    load();
  };

  return (
    <div className="animate-fade-in">
      <SectionHead
        title={isIncome ? 'Приход' : 'Расход'}
        desc={isIncome ? 'Приёмка товара в зону приёмки' : 'Отгрузка товара и расходные накладные'}
        action={
          <Button className="gap-2" onClick={openCreate}>
            <Icon name="Plus" size={16} /> {isIncome ? 'Новая накладная' : 'Новая отгрузка'}
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? 'Редактирование накладной' : isIncome ? 'Приходная накладная' : 'Расходная накладная'}
            </DialogTitle>
          </DialogHeader>
          {isIncome && (
            <div className="flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-sm text-foreground">
              <Icon name="Info" size={16} className="text-accent" />
              Весь принятый товар попадёт в «Зону приёмки». Распределите его по ячейкам во вкладке «Размещение».
            </div>
          )}
          <ScannerBar onScan={onScan} />
          <Input placeholder={isIncome ? 'Поставщик' : 'Получатель'} value={party} onChange={(e) => setParty(e.target.value)} />
          <div className="max-h-72 space-y-3 overflow-y-auto sm:space-y-2">
            {items.map((it, i) => (
              <div key={i} className="relative rounded-xl border p-3 sm:grid sm:grid-cols-12 sm:gap-2 sm:rounded-none sm:border-0 sm:p-0">
                <div className="mb-2 flex items-center justify-between sm:hidden">
                  <span className="text-xs font-semibold text-muted-foreground">Позиция {i + 1}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}>
                    <Icon name="X" size={14} />
                  </Button>
                </div>
                <Input className="mb-2 sm:col-span-4 sm:mb-0" placeholder="Наименование" value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} />
                <Input className={`mb-2 sm:mb-0 ${isIncome ? 'sm:col-span-4' : 'sm:col-span-3'}`} placeholder="Штрих-код" value={it.barcode} onChange={(e) => updateItem(i, { barcode: e.target.value })} />
                {!isIncome && (
                  <Input className="mb-2 sm:col-span-2 sm:mb-0" placeholder="Ячейка" value={it.cell} onChange={(e) => updateItem(i, { cell: e.target.value })} />
                )}
                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <Input className="sm:col-span-1" type="number" placeholder="Кол-во" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} />
                  <Input className="sm:col-span-2" type="number" placeholder="Цена" value={it.price} onChange={(e) => updateItem(i, { price: Number(e.target.value) })} />
                </div>
                <Button variant="ghost" size="icon" className="hidden text-destructive sm:col-span-1 sm:flex" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}>
                  <Icon name="X" size={14} />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setItems((a) => [...a, empty()])}>
            <Icon name="Plus" size={14} /> Добавить позицию
          </Button>
          <DialogFooter>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Icon name="LoaderCircle" size={16} className="animate-spin" /> : <Icon name="Check" size={16} />}
              {editId ? 'Сохранить изменения' : 'Сохранить накладную'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {docs.length === 0 && (
        <div className="rounded-2xl border bg-card py-10 text-center text-muted-foreground">Накладных пока нет</div>
      )}

      {/* Десктоп: таблица */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
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
            {docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-semibold">{d.doc_number}</TableCell>
                <TableCell>{new Date(d.created_at).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell>{d.party || '—'}</TableCell>
                <TableCell>{d.items_count}</TableCell>
                <TableCell className="font-bold">{d.total_sum.toLocaleString('ru-RU')} ₽</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => openEdit(d)}>
                      <Icon name="Pencil" size={14} /> Изменить
                    </Button>
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

      {/* Мобильный: карточки */}
      <div className="space-y-3 md:hidden">
        {docs.map((d) => (
          <div key={d.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display font-bold">{d.doc_number}</div>
                <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{d.total_sum.toLocaleString('ru-RU')} ₽</div>
                <div className="text-xs text-muted-foreground">{d.items_count} поз.</div>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">{isIncome ? 'Поставщик: ' : 'Получатель: '}</span>
              {d.party || '—'}
            </div>
            <div className="mt-3 flex gap-2 border-t pt-3">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => openEdit(d)}>
                <Icon name="Pencil" size={14} /> Изменить
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => downloadPdf(d)}>
                <Icon name="FileDown" size={14} /> PDF
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(d.id)}>
                <Icon name="Trash2" size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}