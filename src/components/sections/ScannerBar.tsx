import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ScannerBar({ onScan }: { onScan?: (code: string) => void }) {
  const [value, setValue] = useState('');

  const submit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onScan?.(value.trim());
      setValue('');
    }
  };

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Icon name="ScanLine" size={20} />
      </div>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={submit}
        placeholder="Отсканируйте или введите штрих-код и нажмите Enter…"
        className="border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
      />
      <Badge variant="secondary" className="hidden gap-1 sm:flex"><Icon name="Wifi" size={12} /> Сканер готов</Badge>
    </div>
  );
}
