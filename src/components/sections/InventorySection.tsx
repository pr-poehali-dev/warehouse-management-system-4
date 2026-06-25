import { useState } from 'react';
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
import ScannerBar from './ScannerBar';

interface CheckRow {
  barcode: string;
  name: string;
  systemQty: number;
  factQty: number;
  cells: { cell: string; qty: number }[];
}

export default function InventorySection() {
  const [started, setStarted] = useState(false);
  const [rows, setRows] = useState<CheckRow[]>([]);

  const onScan = async (barcode: string) => {
    try {
      const res = await whApi.inventoryCheck(barcode);
      setRows((arr) => {
        const idx = arr.findIndex((r) => r.barcode === barcode);
        if (idx >= 0) {
          return arr.map((r, i) => (i === idx ? { ...r, factQty: r.factQty + 1 } : r));
        }
        return [
          {
            barcode,
            name: res.product.name,
            systemQty: res.system_qty,
            factQty: 1,
            cells: res.cells,
          },
          ...arr,
        ];
      });
      toast.success(`Учтено: ${res.product.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Товар не найден');
    }
  };

  const setFact = (barcode: string, val: number) =>
    setRows((arr) => arr.map((r) => (r.barcode === barcode ? { ...r, factQty: val } : r)));

  const matched = rows.filter((r) => r.factQty === r.systemQty).length;
  const diffs = rows.filter((r) => r.factQty !== r.systemQty).length;

  if (!started) {
    return (
      <div className="animate-fade-in">
        <SectionHead title="Инвентаризация" desc="Сверка фактических остатков со складскими данными" />
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon name="ClipboardCheck" size={32} />
          </div>
          <div className="font-display text-xl font-bold">Готовы начать инвентаризацию?</div>
          <p className="max-w-md text-sm text-muted-foreground">
            Сканируйте товары на полках — система сравнит фактическое количество с учётом и подсветит расхождения.
          </p>
          <Button className="mt-2 gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setStarted(true)}>
            <Icon name="Play" size={16} /> Начать инвентаризацию
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <SectionHead title="Инвентаризация" desc="Сканируйте товар — количество растёт автоматически, факт можно поправить вручную"
        action={
          <Button variant="outline" className="gap-2" onClick={() => { setStarted(false); setRows([]); }}>
            <Icon name="Square" size={16} /> Завершить
          </Button>
        } />
      <ScannerBar onScan={onScan} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <Icon name="ListChecks" size={22} className="text-primary" />
          <div className="mt-3 text-2xl font-display font-bold">{rows.length}</div>
          <div className="text-sm text-muted-foreground">Проверено позиций</div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <Icon name="CircleCheck" size={22} className="text-accent" />
          <div className="mt-3 text-2xl font-display font-bold">{matched}</div>
          <div className="text-sm text-muted-foreground">Совпадает</div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <Icon name="TriangleAlert" size={22} className="text-destructive" />
          <div className="mt-3 text-2xl font-display font-bold">{diffs}</div>
          <div className="text-sm text-muted-foreground">Расхождения</div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border bg-card py-10 text-center text-muted-foreground">Отсканируйте первый товар</div>
      )}

      {/* Десктоп */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Наименование</TableHead><TableHead>Штрих-код</TableHead>
              <TableHead>Ячейки</TableHead><TableHead>Учёт</TableHead>
              <TableHead>Факт</TableHead><TableHead>Расхождение</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const diff = r.factQty - r.systemQty;
              return (
                <TableRow key={r.barcode}>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.barcode}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.cells.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {r.cells.map((c) => (
                        <Badge key={c.cell} variant="secondary" className="font-mono text-xs">{c.cell}: {c.qty}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{r.systemQty}</TableCell>
                  <TableCell>
                    <Input type="number" value={r.factQty} className="h-8 w-20"
                      onChange={(e) => setFact(r.barcode, Number(e.target.value))} />
                  </TableCell>
                  <TableCell>
                    {diff === 0 ? (
                      <span className="inline-flex items-center gap-1 text-sm text-accent"><Icon name="Check" size={14} /> ОК</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-sm font-bold ${diff > 0 ? 'text-primary' : 'text-destructive'}`}>
                        <Icon name={diff > 0 ? 'TrendingUp' : 'TrendingDown'} size={14} /> {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Мобильный */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => {
          const diff = r.factQty - r.systemQty;
          return (
            <div key={r.barcode} className="rounded-2xl border bg-card p-4">
              <div className="font-semibold">{r.name}</div>
              <div className="font-mono text-xs text-muted-foreground">{r.barcode}</div>
              {r.cells.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.cells.map((c) => (
                    <Badge key={c.cell} variant="secondary" className="font-mono text-xs">{c.cell}: {c.qty}</Badge>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Учёт: </span><b>{r.systemQty}</b>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Факт</span>
                  <Input type="number" value={r.factQty} className="h-9 w-20"
                    onChange={(e) => setFact(r.barcode, Number(e.target.value))} />
                </div>
                {diff === 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm text-accent"><Icon name="Check" size={14} /> ОК</span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-sm font-bold ${diff > 0 ? 'text-primary' : 'text-destructive'}`}>
                    <Icon name={diff > 0 ? 'TrendingUp' : 'TrendingDown'} size={14} /> {diff > 0 ? `+${diff}` : diff}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}