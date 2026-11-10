import axios from 'axios'
import type {
  CategoryReportRow,
  Category,
  DashboardCharts,
  DashboardSummary,
  InventoryItem,
  ListParams,
  MovementReport,
  Paginated,
  Product,
  PurchaseOrder,
  ReportSummary,
  Settings,
  StockAdjustment,
  StockMovement,
  StockTransfer,
  Supplier,
  User,
  ValuationRow,
  Warehouse,
  WarehouseReportRow,
} from '../types'

const serverUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const apiBase = `${serverUrl}/api/v1`

export const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

export function sanitizeParams(params?: ListParams): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {}
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) result[key] = value
  })
  return result
}

async function csrf(): Promise<void> {
  await axios.get(`${serverUrl}/sanctum/csrf-cookie`, { withCredentials: true })
}

export async function signIn(email: string, password: string): Promise<User> {
  await csrf()
  await api.post('/login', { email, password })
  const response = await api.get<{ data: User }>('/user')
  return response.data.data
}

export async function signOut(): Promise<void> {
  await api.post('/logout')
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await api.get<{ data: User }>('/user')
  return response.data.data
}

export async function changePassword(payload: { current_password: string; password: string; password_confirmation: string }): Promise<void> {
  await api.put('/user/password', payload)
}

export const dashboardApi = {
  summary: () => api.get<{ data: DashboardSummary }>('/dashboard/summary').then((r) => r.data.data),
  charts: () => api.get<{ data: DashboardCharts }>('/dashboard/charts').then((r) => r.data.data),
  recentMovements: (limit = 8) =>
    api.get<{ data: StockMovement[] }>('/dashboard/recent-movements', { params: { limit } }).then((r) => r.data.data),
  lowStock: (limit = 8) =>
    api.get<{ data: InventoryItem[] }>('/dashboard/low-stock', { params: { limit } }).then((r) => r.data.data),
}

export const productApi = {
  list: (params?: ListParams) => api.get<Paginated<Product>>('/products', { params: sanitizeParams(params) }).then((r) => r.data),
  get: (id: number) => api.get<{ data: Product }>(`/products/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => api.post<{ data: Product }>('/products', payload).then((r) => r.data.data),
  update: (id: number, payload: Record<string, unknown>) => api.put<{ data: Product }>(`/products/${id}`, payload).then((r) => r.data.data),
  archive: (id: number) => api.delete(`/products/${id}`),
  uploadImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return api.post<{ data: Product }>(`/products/${id}/image`, form).then((r) => r.data.data)
  },
  deleteImage: (id: number) => api.delete<{ data: Product }>(`/products/${id}/image`).then((r) => r.data.data),
}

export const categoryApi = {
  list: (params?: ListParams) => api.get<Paginated<Category>>('/categories', { params: sanitizeParams(params) }).then((r) => r.data),
  tree: () => api.get<{ data: Category[] }>('/categories', { params: { tree: true } }).then((r) => r.data.data),
  get: (id: number) => api.get<{ data: Category }>(`/categories/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => api.post<{ data: Category }>('/categories', payload).then((r) => r.data.data),
  update: (id: number, payload: Record<string, unknown>) => api.put<{ data: Category }>(`/categories/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) => api.delete(`/categories/${id}`),
}

export const supplierApi = {
  list: (params?: ListParams) => api.get<Paginated<Supplier>>('/suppliers', { params: sanitizeParams(params) }).then((r) => r.data),
  get: (id: number) => api.get<{ data: Supplier }>(`/suppliers/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => api.post<{ data: Supplier }>('/suppliers', payload).then((r) => r.data.data),
  update: (id: number, payload: Record<string, unknown>) => api.put<{ data: Supplier }>(`/suppliers/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) => api.delete(`/suppliers/${id}`),
}

export const warehouseApi = {
  list: (params?: ListParams) => api.get<Paginated<Warehouse>>('/warehouses', { params: sanitizeParams(params) }).then((r) => r.data),
  get: (id: number) => api.get<{ data: Warehouse }>(`/warehouses/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => api.post<{ data: Warehouse }>('/warehouses', payload).then((r) => r.data.data),
  update: (id: number, payload: Record<string, unknown>) => api.put<{ data: Warehouse }>(`/warehouses/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) => api.delete(`/warehouses/${id}`),
  updateEmployees: (id: number, userIds: number[]) =>
    api.put<{ data: Warehouse }>(`/warehouses/${id}/employees`, { user_ids: userIds }).then((r) => r.data.data),
}

export const inventoryApi = {
  list: (params?: ListParams) => api.get<Paginated<InventoryItem>>('/inventory', { params: sanitizeParams(params) }).then((r) => r.data),
  forProduct: (productId: number) =>
    api.get<Paginated<InventoryItem>>(`/inventory/${productId}`, { params: { per_page: 100 } }).then((r) => r.data),
  stockIn: (payload: Record<string, unknown>) => api.post<{ data: InventoryItem }>('/inventory/stock-in', payload).then((r) => r.data.data),
  stockOut: (payload: Record<string, unknown>) => api.post<{ data: InventoryItem }>('/inventory/stock-out', payload).then((r) => r.data.data),
}

export const movementApi = {
  list: (params?: ListParams) => api.get<Paginated<StockMovement>>('/stock-movements', { params: sanitizeParams(params) }).then((r) => r.data),
  get: (id: number) => api.get<{ data: StockMovement }>(`/stock-movements/${id}`).then((r) => r.data.data),
  exportUrl: (params?: ListParams) => {
    const query = new URLSearchParams()
    Object.entries(sanitizeParams(params)).forEach(([key, value]) => query.set(key, String(value)))
    return `${apiBase}/stock-movements/export${query.size ? `?${query.toString()}` : ''}`
  },
}

export const purchaseOrderApi = {
  list: (params?: ListParams) => api.get<Paginated<PurchaseOrder>>('/purchase-orders', { params: sanitizeParams(params) }).then((r) => r.data),
  get: (id: number) => api.get<{ data: PurchaseOrder }>(`/purchase-orders/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => api.post<{ data: PurchaseOrder }>('/purchase-orders', payload).then((r) => r.data.data),
  update: (id: number, payload: Record<string, unknown>) => api.put<{ data: PurchaseOrder }>(`/purchase-orders/${id}`, payload).then((r) => r.data.data),
  submit: (id: number) => api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/submit`).then((r) => r.data.data),
  receive: (id: number, items: { product_id: number; quantity: number }[]) =>
    api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/receive`, { items }).then((r) => r.data.data),
  cancel: (id: number) => api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/cancel`).then((r) => r.data.data),
}

export const transferApi = {
  list: (params?: ListParams) => api.get<Paginated<StockTransfer>>('/transfers', { params: sanitizeParams(params) }).then((r) => r.data),
  get: (id: number) => api.get<{ data: StockTransfer }>(`/transfers/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => api.post<{ data: StockTransfer }>('/transfers', payload).then((r) => r.data.data),
  submit: (id: number) => api.post<{ data: StockTransfer }>(`/transfers/${id}/submit`).then((r) => r.data.data),
  complete: (id: number) => api.post<{ data: StockTransfer }>(`/transfers/${id}/complete`).then((r) => r.data.data),
  cancel: (id: number) => api.post<{ data: StockTransfer }>(`/transfers/${id}/cancel`).then((r) => r.data.data),
}

export const adjustmentApi = {
  list: (params?: ListParams) => api.get<Paginated<StockAdjustment>>('/adjustments', { params: sanitizeParams(params) }).then((r) => r.data),
  get: (id: number) => api.get<{ data: StockAdjustment }>(`/adjustments/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => api.post<{ data: StockAdjustment }>('/adjustments', payload).then((r) => r.data.data),
  submit: (id: number) => api.post<{ data: StockAdjustment }>(`/adjustments/${id}/submit`).then((r) => r.data.data),
}

export const reportApi = {
  summary: () => api.get<{ data: ReportSummary }>('/reports/summary').then((r) => r.data.data),
  valuation: (params?: ListParams) => api.get<Paginated<ValuationRow>>('/reports/inventory-valuation', { params: sanitizeParams(params) }).then((r) => r.data),
  byWarehouse: () => api.get<{ data: WarehouseReportRow[] }>('/reports/inventory-by-warehouse').then((r) => r.data.data),
  byCategory: () => api.get<{ data: CategoryReportRow[] }>('/reports/inventory-by-category').then((r) => r.data.data),
  lowStock: (params?: ListParams) => api.get<Paginated<InventoryItem>>('/reports/low-stock', { params: sanitizeParams(params) }).then((r) => r.data),
  stockMovements: (params?: ListParams) => api.get<{ data: MovementReport }>('/reports/stock-movements', { params: sanitizeParams(params) }).then((r) => r.data.data),
  purchaseHistory: (params?: ListParams) => api.get<Paginated<PurchaseOrder>>('/reports/purchase-history', { params: sanitizeParams(params) }).then((r) => r.data),
  exportUrl: (report: 'inventory-valuation' | 'low-stock' | 'movements', params?: ListParams) => {
    const query = new URLSearchParams()
    Object.entries(sanitizeParams(params)).forEach(([key, value]) => query.set(key, String(value)))
    return `${apiBase}/reports/${report}.csv${query.size ? `?${query.toString()}` : ''}`
  },
}

export const userApi = {
  list: (params?: ListParams) => api.get<Paginated<User>>('/users', { params: sanitizeParams(params) }).then((r) => r.data),
  get: (id: number) => api.get<{ data: User }>(`/users/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) => api.post<{ data: User }>('/users', payload).then((r) => r.data.data),
  update: (id: number, payload: Record<string, unknown>) => api.put<{ data: User }>(`/users/${id}`, payload).then((r) => r.data.data),
  updateStatus: (id: number, isActive: boolean) => api.patch<{ data: User }>(`/users/${id}/status`, { is_active: isActive }).then((r) => r.data.data),
}

export const settingsApi = {
  get: () => api.get<{ data: Settings }>('/settings').then((r) => r.data.data),
  update: (payload: Settings) => api.put<{ data: Settings }>('/settings', payload).then((r) => r.data.data),
}

export { serverUrl }
