import urls from '../../backend/func2url.json';

const AUTH_URL = (urls as Record<string, string>).auth || '';
const WAREHOUSE_URL = (urls as Record<string, string>).warehouse || '';

function token(): string {
  return localStorage.getItem('wh_token') || '';
}

async function call(base: string, action: string, opts: { method?: string; body?: unknown; query?: Record<string, string> } = {}) {
  const q = new URLSearchParams({ action, ...(opts.query || {}) }).toString();
  const res = await fetch(`${base}?${q}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': token(),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

export const authApi = {
  login: (login: string, password: string) =>
    call(AUTH_URL, 'login', { method: 'POST', body: { login, password } }),
  me: () => call(AUTH_URL, 'me'),
  list: () => call(AUTH_URL, 'list'),
  register: (data: { name: string; login: string; password: string; role: string }) =>
    call(AUTH_URL, 'register', { method: 'POST', body: data }),
  remove: (id: number) => call(AUTH_URL, 'delete', { method: 'POST', body: { id } }),
};

export const whApi = {
  products: () => call(WAREHOUSE_URL, 'products'),
  productAdd: (name: string, barcode: string) =>
    call(WAREHOUSE_URL, 'product_add', { method: 'POST', body: { name, barcode } }),
  productDelete: (id: number) => call(WAREHOUSE_URL, 'product_delete', { method: 'POST', body: { id } }),
  productsImport: (rows: { name: string; barcode: string }[]) =>
    call(WAREHOUSE_URL, 'products_import', { method: 'POST', body: { rows } }),
  stock: () => call(WAREHOUSE_URL, 'stock'),
  stockDelete: (id: number) => call(WAREHOUSE_URL, 'stock_delete', { method: 'POST', body: { id } }),
  documents: (type: 'income' | 'outcome') => call(WAREHOUSE_URL, 'documents', { query: { type } }),
  documentItems: (id: number) => call(WAREHOUSE_URL, 'document_items', { query: { id: String(id) } }),
  documentCreate: (data: { doc_type: 'income' | 'outcome'; party: string; items: DocItem[] }) =>
    call(WAREHOUSE_URL, 'document_create', { method: 'POST', body: data }),
  documentDelete: (id: number) => call(WAREHOUSE_URL, 'document_delete', { method: 'POST', body: { id } }),
};

export interface DocItem {
  name: string;
  barcode: string;
  cell: string;
  qty: number;
  price: number;
}

export function setToken(t: string) {
  localStorage.setItem('wh_token', t);
}
export function clearToken() {
  localStorage.removeItem('wh_token');
}
export function hasToken() {
  return !!token();
}
