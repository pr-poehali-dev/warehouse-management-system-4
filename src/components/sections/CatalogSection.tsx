import { useEffect, useRef, useState } from 'react';
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
import { whApi } from '@/lib/api';
import { parseExcel } from '@/lib/excel';
import SectionHead from './SectionHead';

interface Product { id: number; name: string; barcode: string }

export default function CatalogSection() {
  const [rows, setRows] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => whApi.products().then((d) => setRows(d.products)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim() || !barcode.trim()) return toast.error('Заполните оба поля');
    try {
      await whApi.productAdd(name.trim(), barcode.trim());
      toast.success('Товар добавлен');
      setName(''); setBarcode(''); setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const remove = async (id: number) => {
    await whApi.productDelete(id);
    toast.success('Удалено');
    load();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseExcel(file);
      if (!parsed.length) return toast.error('Не найдено строк с наименованием и штрих-кодом');
      const res = await whApi.productsImport(parsed);
      toast.success(`Импортировано товаров: ${res.imported}`);
      load();
    } catch {
      toast.error('Не удалось прочитать файл');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="animate-fade-in">
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
      <SectionHead title="База товаров" desc="Справочник номенклатуры со штрих-кодами"
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
              <Icon name="FileSpreadsheet" size={16} /> Импорт Excel
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Icon name="Plus" size={16} /> Добавить</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Новый товар</DialogTitle></DialogHeader>
                <Input placeholder="Наименование товара" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Штрих-код" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                <DialogFooter><Button onClick={add} className="gap-2"><Icon name="Check" size={16} /> Сохранить</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        } />

      <div className="mb-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-card p-6 text-center transition hover:border-primary sm:p-10"
        onClick={() => fileRef.current?.click()}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Icon name="CloudUpload" size={28} /></div>
        <div className="font-display text-lg font-bold">Загрузите файл Excel</div>
        <p className="max-w-md text-sm text-muted-foreground">
          Колонки: <span className="font-semibold text-foreground">Наименование товара</span> и <span className="font-semibold text-foreground">Штрих-код</span>. Поддерживается .xlsx и .xls
        </p>
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border bg-card py-10 text-center text-muted-foreground">База товаров пуста</div>
      )}

      {/* Десктоп */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Наименование товара</TableHead><TableHead>Штрих-код</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.barcode}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}>
                    <Icon name="Trash2" size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Мобильный */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-2xl border bg-card p-4">
            <div className="min-w-0">
              <div className="font-semibold">{r.name}</div>
              <div className="font-mono text-xs text-muted-foreground">{r.barcode}</div>
            </div>
            <Button size="sm" variant="ghost" className="shrink-0 text-destructive" onClick={() => remove(r.id)}>
              <Icon name="Trash2" size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}