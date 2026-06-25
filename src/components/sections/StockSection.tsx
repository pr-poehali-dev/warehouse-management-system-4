import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { whApi } from '@/lib/api';
import SectionHead from './SectionHead';

interface StockRow { id: number; name: string; barcode: string; cell: string; qty: number }

export default function StockSection() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [q, setQ] = useState('');
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveRow, setMoveRow] = useState<StockRow | null>(null);
  const [toCell, setToCell] = useState('');
  const [moveQty, setMoveQty] = useState(1);
  const [saving, setSaving] = useState(false);

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

  const startMove = (r: StockRow) => {
    setMoveRow(r);
    setMoveQty(r.qty);
    setToCell('');
    setMoveOpen(true);
  };

  const confirmMove = async () => {
    if (!moveRow) return;
    if (!toCell.trim()) return toast.error('Укажите ячейку назначения');
    if (moveQty <= 0 || moveQty > moveRow.qty) return toast.error(`Доступно ${moveRow.qty} шт`);
    setSaving(true);
    try {
      await whApi.stockMove({
        barcode: moveRow.barcode,
        from_cell: moveRow.cell,
        to_cell: toCell.trim(),
        qty: moveQty,
      });
      toast.success(`Перемещено ${moveQty} шт в ${toCell.trim()}`);
      setMoveOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
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
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => startMove(r)}>
                      <Icon name="ArrowRightLeft" size={14} /> Переместить
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}>
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Перемещение товара</DialogTitle></DialogHeader>
          {moveRow && (
            <div className="space-y-4">
              <div className="rounded-xl bg-secondary p-4">
                <div className="font-semibold">{moveRow.name}</div>
                <div className="text-xs text-muted-foreground">
                  из ячейки <span className="font-mono font-semibold text-foreground">{moveRow.cell || '—'}</span> · доступно {moveRow.qty} шт
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Ячейка назначения</label>
                <Input autoFocus placeholder="Например: B-04-12" value={toCell} onChange={(e) => setToCell(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Количество</label>
                <Input type="number" value={moveQty} onChange={(e) => setMoveQty(Number(e.target.value))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={confirmMove} disabled={saving} className="gap-2">
              {saving ? <Icon name="LoaderCircle" size={16} className="animate-spin" /> : <Icon name="ArrowRightLeft" size={16} />}
              Переместить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}