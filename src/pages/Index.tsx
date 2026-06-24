import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import SectionHead from '@/components/sections/SectionHead';
import ScannerBar from '@/components/sections/ScannerBar';
import DocumentsSection from '@/components/sections/DocumentsSection';
import StockSection from '@/components/sections/StockSection';
import CatalogSection from '@/components/sections/CatalogSection';
import StaffSection from '@/components/sections/StaffSection';
import { whApi } from '@/lib/api';

type SectionId = 'dashboard' | 'income' | 'outcome' | 'stock' | 'inventory' | 'catalog' | 'staff';

const NAV: { id: SectionId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Обзор', icon: 'LayoutDashboard' },
  { id: 'income', label: 'Приход', icon: 'ArrowDownToLine' },
  { id: 'outcome', label: 'Расход', icon: 'ArrowUpFromLine' },
  { id: 'stock', label: 'Остаток', icon: 'Boxes' },
  { id: 'inventory', label: 'Инвентаризация', icon: 'ClipboardCheck' },
  { id: 'catalog', label: 'База товаров', icon: 'Database' },
  { id: 'staff', label: 'Сотрудники', icon: 'Users' },
];

function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-card p-5 animate-fade-in ${accent ? 'glow-accent' : ''}`}>
      <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="text-3xl font-display font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Dashboard({ go }: { go: (s: SectionId) => void }) {
  const [stats, setStats] = useState({ products: 0, stockQty: 0, cells: 0, income: 0, outcome: 0 });

  useEffect(() => {
    Promise.all([whApi.products(), whApi.stock(), whApi.documents('income'), whApi.documents('outcome')])
      .then(([p, s, di, dout]) => {
        const stockRows = s.stock as { qty: number; cell: string }[];
        setStats({
          products: p.products.length,
          stockQty: stockRows.reduce((a, r) => a + r.qty, 0),
          cells: new Set(stockRows.map((r) => r.cell).filter(Boolean)).size,
          income: (di.documents as { total_sum: number }[]).reduce((a, r) => a + r.total_sum, 0),
          outcome: (dout.documents as { total_sum: number }[]).reduce((a, r) => a + r.total_sum, 0),
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in">
      <SectionHead title="Обзор склада" desc="Ключевые показатели и активность" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="Boxes" label="Товаров на складе" value={stats.stockQty.toLocaleString('ru-RU')} sub={`${stats.products} позиций в базе`} />
        <StatCard icon="ArrowDownToLine" label="Приход, всего" value={`${stats.income.toLocaleString('ru-RU')} ₽`} sub="по накладным" accent />
        <StatCard icon="ArrowUpFromLine" label="Расход, всего" value={`${stats.outcome.toLocaleString('ru-RU')} ₽`} sub="по отгрузкам" />
        <StatCard icon="MapPin" label="Занято ячеек" value={String(stats.cells)} sub="адресное хранение" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-bold">Быстрые действия</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="h-auto justify-start gap-3 py-4" onClick={() => go('income')}>
              <Icon name="ArrowDownToLine" size={20} className="text-accent" />
              <div className="text-left"><div className="font-semibold">Принять товар</div><div className="text-xs text-muted-foreground">создать накладную</div></div>
            </Button>
            <Button variant="outline" className="h-auto justify-start gap-3 py-4" onClick={() => go('outcome')}>
              <Icon name="ArrowUpFromLine" size={20} className="text-primary" />
              <div className="text-left"><div className="font-semibold">Отгрузить</div><div className="text-xs text-muted-foreground">расходная накладная</div></div>
            </Button>
            <Button variant="outline" className="h-auto justify-start gap-3 py-4" onClick={() => go('catalog')}>
              <Icon name="FileSpreadsheet" size={20} className="text-accent" />
              <div className="text-left"><div className="font-semibold">Импорт Excel</div><div className="text-xs text-muted-foreground">загрузить товары</div></div>
            </Button>
            <Button variant="outline" className="h-auto justify-start gap-3 py-4" onClick={() => go('stock')}>
              <Icon name="Boxes" size={20} className="text-primary" />
              <div className="text-left"><div className="font-semibold">Остатки</div><div className="text-xs text-muted-foreground">по ячейкам</div></div>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border bg-primary p-5 text-primary-foreground glow-primary">
          <Icon name="ScanLine" size={28} />
          <h3 className="mt-3 font-display text-lg font-bold">Быстрое сканирование</h3>
          <p className="mt-1 text-sm text-primary-foreground/80">Поднесите товар к сканеру для приёмки или отгрузки за секунду.</p>
          <Button onClick={() => go('income')} variant="secondary" className="mt-4 w-full">Начать приёмку</Button>
        </div>
      </div>
    </div>
  );
}

function InventorySection() {
  return (
    <div className="animate-fade-in">
      <SectionHead title="Инвентаризация" desc="Сверка фактических остатков со складскими данными"
        action={<Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Icon name="ClipboardCheck" size={16} /> Начать инвентаризацию</Button>} />
      <ScannerBar />
      <div className="flex items-center gap-3 rounded-2xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
        <Icon name="Info" size={18} className="text-primary" />
        Сканируйте товары на полках — система сверит количество с остатками и подсветит расхождения.
      </div>
    </div>
  );
}

function Index() {
  const { user, loading, logout } = useAuth();
  const [active, setActive] = useState<SectionId>('dashboard');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Icon name="LoaderCircle" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const initials = user.name.split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground glow-primary">
              <Icon name="Warehouse" size={22} />
            </div>
            <div>
              <div className="font-display text-lg font-bold leading-none">СкладOS</div>
              <div className="text-xs text-muted-foreground">учёт · адресация</div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setActive(n.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  active === n.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}>
                <Icon name={n.icon} size={18} />
                {n.label}
              </button>
            ))}
          </nav>
          <div className="m-3 rounded-xl bg-secondary p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Icon name="CloudCheck" size={16} className="text-accent" /> Автосохранение</div>
            <p className="mt-1 text-xs text-muted-foreground">Все изменения сохраняются мгновенно</p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-card/80 px-5 py-3 backdrop-blur md:px-8">
            <div className="flex items-center gap-2 overflow-x-auto lg:hidden">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => setActive(n.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${active === n.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  <Icon name={n.icon} size={14} /> {n.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Badge variant="secondary" className="hidden gap-1.5 py-1.5 sm:flex"><Icon name="MapPin" size={13} className="text-primary" /> Склад №1</Badge>
              <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{initials}</div>
                <span className="hidden text-sm font-medium sm:block">{user.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Выйти"><Icon name="LogOut" size={18} /></Button>
            </div>
          </header>

          <div className="grid-bg">
            <div className="mx-auto max-w-6xl p-5 md:p-8">
              {active === 'dashboard' && <Dashboard go={setActive} />}
              {active === 'income' && <DocumentsSection type="income" />}
              {active === 'outcome' && <DocumentsSection type="outcome" />}
              {active === 'stock' && <StockSection />}
              {active === 'inventory' && <InventorySection />}
              {active === 'catalog' && <CatalogSection />}
              {active === 'staff' && <StaffSection />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Index;
