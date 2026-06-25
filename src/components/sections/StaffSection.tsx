import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import SectionHead from './SectionHead';

interface Emp { id: number; name: string; login: string; role: string; active: boolean }

const ROLE_LABEL: Record<string, string> = { admin: 'Администратор', operator: 'Оператор', storekeeper: 'Кладовщик' };

export default function StaffSection() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rows, setRows] = useState<Emp[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', login: '', password: '', role: 'operator' });

  const load = () => authApi.list().then((d) => setRows(d.employees)).catch(() => {});
  useEffect(() => { load(); }, []);

  const register = async () => {
    if (!form.name || !form.login || !form.password) return toast.error('Заполните все поля');
    try {
      await authApi.register(form);
      toast.success('Сотрудник зарегистрирован');
      setForm({ name: '', login: '', password: '', role: 'operator' });
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const remove = async (id: number) => {
    try {
      await authApi.remove(id);
      toast.success('Удалено');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  return (
    <div className="animate-fade-in">
      <SectionHead title="Сотрудники" desc="Управление доступом · регистрация только администратором"
        action={isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Icon name="UserPlus" size={16} /> Зарегистрировать</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Новый сотрудник</DialogTitle></DialogHeader>
              <Input placeholder="ФИО" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Логин (email)" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
              <Input type="password" placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Оператор</SelectItem>
                  <SelectItem value="storekeeper">Кладовщик</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
              <DialogFooter><Button onClick={register} className="gap-2"><Icon name="Check" size={16} /> Зарегистрировать</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )} />
      {/* Десктоп */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead><TableHead>Логин</TableHead>
              <TableHead>Роль</TableHead><TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {r.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                    </div>
                    <span className="font-semibold">{r.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.login}</TableCell>
                <TableCell><Badge variant={r.role === 'admin' ? 'default' : 'secondary'}>{ROLE_LABEL[r.role] || r.role}</Badge></TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 text-sm ${r.active ? 'text-accent' : 'text-muted-foreground'}`}>
                    <span className={`h-2 w-2 rounded-full ${r.active ? 'bg-accent' : 'bg-muted-foreground'}`} />
                    {r.active ? 'Активен' : 'Отключён'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {isAdmin && r.login !== 'v.ermikhin@door.su' && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}>
                      <Icon name="Trash2" size={14} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Мобильный */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {r.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{r.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.login}</div>
                </div>
              </div>
              {isAdmin && r.login !== 'v.ermikhin@door.su' && (
                <Button size="sm" variant="ghost" className="shrink-0 text-destructive" onClick={() => remove(r.id)}>
                  <Icon name="Trash2" size={14} />
                </Button>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3 border-t pt-3">
              <Badge variant={r.role === 'admin' ? 'default' : 'secondary'}>{ROLE_LABEL[r.role] || r.role}</Badge>
              <span className={`inline-flex items-center gap-1.5 text-sm ${r.active ? 'text-accent' : 'text-muted-foreground'}`}>
                <span className={`h-2 w-2 rounded-full ${r.active ? 'bg-accent' : 'bg-muted-foreground'}`} />
                {r.active ? 'Активен' : 'Отключён'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}