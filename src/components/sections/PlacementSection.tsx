import { useEffect, useState } from 'react';
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
import ScannerBar from './ScannerBar';

interface IntakeItem { id: number; name: string; barcode: string; cell: string; qty: number }

const INTAKE_CELL = 'Зона приёмки';

export default function PlacementSection() {
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<IntakeItem | null>(null);
  const [toCell, setToCell] = useState('');
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = () => whApi.intakeItems().then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => { load(); }, []);

  const startPlacement = (it: IntakeItem) => {
    setCurrent(it);
    setQty(it.qty);
    setToCell('');
    setOpen(true);
  };

  const onScanItem = async (barcode: string) => {
    const found = items.find((it) => it.barcode === barcode);
    if (found) {
      startPlacement(found);
      toast.success(`Размещаем: ${found.name}`);
    } else {
      toast.error('Этого товара нет в зоне приёмки');
    }
  };

  const confirm = async () => {
    if (!current) return;
    if (!toCell.trim()) return toast.error('Укажите ячейку назначения');
    if (qty <= 0 || qty > current.qty) return toast.error(`Доступно ${current.qty} шт`);
    setSaving(true);
    try {
      await whApi.stockMove({
        barcode: current.barcode,
        from_cell: INTAKE_CELL,
        to_cell: toCell.trim(),
        qty,
      });
      toast.success(`Размещено ${qty} шт в ячейку ${toCell.trim()}`);
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <SectionHead title="Размещение" desc="Распределение принятого товара из зоны приёмки по ячейкам" />

      <ScannerBar onScan={onScanItem} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Куда разместить товар?</DialogTitle>
          </DialogHeader>
          {current && (
            <div className="space-y-4">
              <div className="rounded-xl bg-secondary p-4">
                <div className="font-semibold">{current.name}</div>
                <div className="text-xs text-muted-foreground">{current.barcode} · в зоне приёмки: {current.qty} шт</div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Отсканируйте или введите ячейку назначения</label>
                <Input autoFocus placeholder="Например: A-01-03" value={toCell}
                  onChange={(e) => setToCell(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Количество</label>
                <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={confirm} disabled={saving} className="gap-2">
              {saving ? <Icon name="LoaderCircle" size={16} className="animate-spin" /> : <Icon name="PackageCheck" size={16} />}
              Разместить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Наименование</TableHead><TableHead>Штрих-код</TableHead>
              <TableHead>В зоне приёмки</TableHead><TableHead className="text-right">Действие</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Зона приёмки пуста — весь товар размещён</TableCell></TableRow>
            )}
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-semibold">{it.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{it.barcode}</TableCell>
                <TableCell><Badge variant="secondary" className="font-bold">{it.qty} шт</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" className="gap-1.5" onClick={() => startPlacement(it)}>
                    <Icon name="ArrowRightLeft" size={14} /> Разместить
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