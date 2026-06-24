import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { whApi } from '@/lib/api';
import SectionHead from './SectionHead';

interface StockRow { id: number; name: string; barcode: string; cell: string; qty: number }

export default function StockSection() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [q, setQ] = useState('');

  const load = () => whApi.stock().then((d) => setRows(d.stock)).catch(() => {});
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => (r.name + r.barcode + r.cell).toLowerCase().includes(q.toLowerCase())),
    [rows, q]);

  const remove = async (id: number) => {
    await whApi.stockDelete(id);
    toast.success('Удалено');
    load();
  };

  return (
    <div className="animate-fade-in">
      <SectionHead title="Остаток" desc="Актуальные остатки с привязкой к адресу хранения"
        action={
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Поиск товара…" className="w-56 pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        } />
      <div className="overflow-hidden rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Наименование</TableHead><TableHead>Штрих-код</TableHead>
              <TableHead>Ячейка</TableHead><TableHead>Остаток</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Остатков пока нет</TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.barcode}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="gap-1 font-mono">
                    <Icon name="MapPin" size={11} className="text-primary" />{r.cell || '—'}
                  </Badge>
                </TableCell>
                <TableCell><span className={`font-bold ${r.qty < 80 ? 'text-destructive' : ''}`}>{r.qty} шт</span></TableCell>
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
    </div>
  );
}
