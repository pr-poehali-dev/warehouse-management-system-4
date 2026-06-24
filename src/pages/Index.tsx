import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

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

const STOCK = [
  { name: 'Дверь межкомнатная «Орион»', barcode: '4601234567890', cell: 'A-01-03', qty: 48 },
  { name: 'Ручка дверная хром', barcode: '4609876543210', cell: 'B-04-12', qty: 220 },
  { name: 'Петля скрытая 120мм', barcode: '4605558881234', cell: 'C-02-08', qty: 540 },
  { name: 'Уплотнитель самоклеящийся', barcode: '4601112223334', cell: 'A-03-01', qty: 132 },
  { name: 'Замок врезной магнитный', barcode: '4607778889990', cell: 'D-01-05', qty: 76 },
];

const INCOME = [
  { doc: 'ПР-000142', date: '24.06.2026', supplier: 'ДверьПром ООО', items: 12, sum: '184 500 ₽' },
  { doc: 'ПР-000141', date: '23.06.2026', supplier: 'ФурнитураОпт', items: 5, sum: '42 100 ₽' },
  { doc: 'ПР-000140', date: '21.06.2026', supplier: 'СтальКомплект', items: 28, sum: '310 900 ₽' },
];

const OUTCOME = [
  { doc: 'РС-000098', date: '24.06.2026', client: 'Магазин «Двери+»', items: 8, sum: '96 200 ₽' },
  { doc: 'РС-000097', date: '22.06.2026', client: 'ИП Сидоров', items: 3, sum: '21 400 ₽' },
];

const STAFF = [
  { name: 'Виктор Ермихин', login: 'v.ermikhin@door.su', role: 'Администратор', active: true },
  { name: 'Анна Кравцова', login: 'a.kravtsova@door.su', role: 'Оператор', active: true },
  { name: 'Дмитрий Лосев', login: 'd.losev@door.su', role: 'Кладовщик', active: false },
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

function SectionHead({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}

function ScannerBar() {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Icon name="ScanLine" size={20} />
      </div>
      <Input placeholder="Отсканируйте или введите штрих-код товара…" className="border-0 bg-transparent text-base shadow-none focus-visible:ring-0" />
      <Badge variant="secondary" className="hidden gap-1 sm:flex"><Icon name="Wifi" size={12} /> Сканер готов</Badge>
    </div>
  );
}

function Index() {
  const [active, setActive] = useState<SectionId>('dashboard');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
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
              <button
                key={n.id}
                onClick={() => setActive(n.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  active === n.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
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

        {/* Main */}
        <main className="flex-1">
          {/* Topbar */}
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
              <Badge variant="secondary" className="gap-1.5 py-1.5"><Icon name="MapPin" size={13} className="text-primary" /> Склад №1 · Москва</Badge>
              <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">ВЕ</div>
                <span className="hidden text-sm font-medium sm:block">Виктор Е.</span>
              </div>
            </div>
          </header>

          <div className="grid-bg">
            <div className="mx-auto max-w-6xl p-5 md:p-8">
              {active === 'dashboard' && (
                <div className="animate-fade-in">
                  <SectionHead title="Обзор склада" desc="Ключевые показатели и активность за сегодня" />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard icon="Boxes" label="Товаров на складе" value="1 016" sub="по 5 позициям" />
                    <StatCard icon="ArrowDownToLine" label="Приход за день" value="184 500 ₽" sub="1 накладная" accent />
                    <StatCard icon="ArrowUpFromLine" label="Расход за день" value="96 200 ₽" sub="1 отгрузка" />
                    <StatCard icon="MapPin" label="Занято ячеек" value="42 / 120" sub="адресное хранение" />
                  </div>
                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
                      <h3 className="mb-4 font-display text-lg font-bold">Последние операции</h3>
                      <div className="space-y-2">
                        {[
                          ...INCOME.slice(0, 2).map((r) => ({ doc: r.doc, party: r.supplier, date: r.date, sum: r.sum, income: true })),
                          ...OUTCOME.slice(0, 1).map((r) => ({ doc: r.doc, party: r.client, date: r.date, sum: r.sum, income: false })),
                        ].map((r, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${r.income ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary'}`}>
                              <Icon name={r.income ? 'ArrowDownToLine' : 'ArrowUpFromLine'} size={16} />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold">{r.doc}</div>
                              <div className="text-xs text-muted-foreground">{r.party} · {r.date}</div>
                            </div>
                            <div className="text-sm font-bold">{r.sum}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-primary p-5 text-primary-foreground glow-primary">
                      <Icon name="ScanLine" size={28} />
                      <h3 className="mt-3 font-display text-lg font-bold">Быстрое сканирование</h3>
                      <p className="mt-1 text-sm text-primary-foreground/80">Поднесите товар к сканеру для приёмки или отгрузки за секунду.</p>
                      <Button onClick={() => setActive('income')} variant="secondary" className="mt-4 w-full">Начать приёмку</Button>
                    </div>
                  </div>
                </div>
              )}

              {active === 'income' && (
                <div className="animate-fade-in">
                  <SectionHead title="Приход" desc="Приёмка товара и формирование приходных накладных"
                    action={<Button className="gap-2"><Icon name="Plus" size={16} /> Новая накладная</Button>} />
                  <ScannerBar />
                  <div className="overflow-hidden rounded-2xl border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Накладная</TableHead><TableHead>Дата</TableHead>
                          <TableHead>Поставщик</TableHead><TableHead>Позиций</TableHead>
                          <TableHead>Сумма</TableHead><TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {INCOME.map((r) => (
                          <TableRow key={r.doc}>
                            <TableCell className="font-semibold">{r.doc}</TableCell>
                            <TableCell>{r.date}</TableCell>
                            <TableCell>{r.supplier}</TableCell>
                            <TableCell>{r.items}</TableCell>
                            <TableCell className="font-bold">{r.sum}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="gap-1.5"><Icon name="FileDown" size={14} /> PDF</Button>
                                <Button size="sm" variant="ghost" className="text-destructive"><Icon name="Trash2" size={14} /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {active === 'outcome' && (
                <div className="animate-fade-in">
                  <SectionHead title="Расход" desc="Отгрузка товара и расходные накладные"
                    action={<Button className="gap-2"><Icon name="Plus" size={16} /> Новая отгрузка</Button>} />
                  <ScannerBar />
                  <div className="overflow-hidden rounded-2xl border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Накладная</TableHead><TableHead>Дата</TableHead>
                          <TableHead>Получатель</TableHead><TableHead>Позиций</TableHead>
                          <TableHead>Сумма</TableHead><TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {OUTCOME.map((r) => (
                          <TableRow key={r.doc}>
                            <TableCell className="font-semibold">{r.doc}</TableCell>
                            <TableCell>{r.date}</TableCell>
                            <TableCell>{r.client}</TableCell>
                            <TableCell>{r.items}</TableCell>
                            <TableCell className="font-bold">{r.sum}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="gap-1.5"><Icon name="FileDown" size={14} /> PDF</Button>
                                <Button size="sm" variant="ghost" className="text-destructive"><Icon name="Trash2" size={14} /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {active === 'stock' && (
                <div className="animate-fade-in">
                  <SectionHead title="Остаток" desc="Актуальные остатки с привязкой к адресу хранения"
                    action={<div className="relative"><Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Поиск товара…" className="w-56 pl-9" /></div>} />
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
                        {STOCK.map((r) => (
                          <TableRow key={r.barcode}>
                            <TableCell className="font-semibold">{r.name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{r.barcode}</TableCell>
                            <TableCell><Badge variant="secondary" className="gap-1 font-mono"><Icon name="MapPin" size={11} className="text-primary" />{r.cell}</Badge></TableCell>
                            <TableCell><span className={`font-bold ${r.qty < 80 ? 'text-destructive' : ''}`}>{r.qty} шт</span></TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" className="text-destructive"><Icon name="Trash2" size={14} /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {active === 'inventory' && (
                <div className="animate-fade-in">
                  <SectionHead title="Инвентаризация" desc="Сверка фактических остатков со складскими данными"
                    action={<Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Icon name="ClipboardCheck" size={16} /> Начать инвентаризацию</Button>} />
                  <ScannerBar />
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { l: 'Проверено позиций', v: '38 / 120', i: 'ListChecks', c: 'text-primary' },
                      { l: 'Совпадает', v: '34', i: 'CircleCheck', c: 'text-accent' },
                      { l: 'Расхождения', v: '4', i: 'TriangleAlert', c: 'text-destructive' },
                    ].map((s) => (
                      <div key={s.l} className="rounded-2xl border bg-card p-5">
                        <Icon name={s.i} size={22} className={s.c} />
                        <div className="mt-3 text-2xl font-display font-bold">{s.v}</div>
                        <div className="text-sm text-muted-foreground">{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
                    <Icon name="Info" size={18} className="text-primary" />
                    Сканируйте товары на полках — система автоматически сверит количество и подсветит расхождения.
                  </div>
                </div>
              )}

              {active === 'catalog' && (
                <div className="animate-fade-in">
                  <SectionHead title="База товаров" desc="Справочник номенклатуры со штрих-кодами"
                    action={<div className="flex gap-2">
                      <Button variant="outline" className="gap-2"><Icon name="FileSpreadsheet" size={16} /> Импорт Excel</Button>
                      <Button className="gap-2"><Icon name="Plus" size={16} /> Добавить</Button>
                    </div>} />
                  <div className="mb-6 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-card p-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Icon name="CloudUpload" size={28} /></div>
                    <div className="font-display text-lg font-bold">Загрузите файл Excel</div>
                    <p className="max-w-md text-sm text-muted-foreground">Колонки: <span className="font-semibold text-foreground">Наименование товара</span> и <span className="font-semibold text-foreground">Штрих-код</span>. Поддерживается .xlsx и .xls</p>
                    <Button className="mt-2 gap-2"><Icon name="FileSpreadsheet" size={16} /> Выбрать файл</Button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Наименование товара</TableHead><TableHead>Штрих-код</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {STOCK.map((r) => (
                          <TableRow key={r.barcode}>
                            <TableCell className="font-semibold">{r.name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{r.barcode}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" className="text-destructive"><Icon name="Trash2" size={14} /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {active === 'staff' && (
                <div className="animate-fade-in">
                  <SectionHead title="Сотрудники" desc="Управление доступом · регистрация только администратором"
                    action={<Button className="gap-2"><Icon name="UserPlus" size={16} /> Зарегистрировать</Button>} />
                  <div className="overflow-hidden rounded-2xl border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Сотрудник</TableHead><TableHead>Логин</TableHead>
                          <TableHead>Роль</TableHead><TableHead>Статус</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {STAFF.map((r) => (
                          <TableRow key={r.login}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                  {r.name.split(' ').map((w) => w[0]).join('')}
                                </div>
                                <span className="font-semibold">{r.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{r.login}</TableCell>
                            <TableCell>
                              <Badge variant={r.role === 'Администратор' ? 'default' : 'secondary'}>{r.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 text-sm ${r.active ? 'text-accent' : 'text-muted-foreground'}`}>
                                <span className={`h-2 w-2 rounded-full ${r.active ? 'bg-accent' : 'bg-muted-foreground'}`} />
                                {r.active ? 'Активен' : 'Отключён'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" className="text-destructive"><Icon name="Trash2" size={14} /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Index;