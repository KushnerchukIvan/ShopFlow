export type Role = 'admin' | 'manager' | 'warehouse_operator' | 'viewer'

export type User = {
  id: number
  name: string
  email: string
  role: Role
  is_active: boolean
  email_verified_at?: string | null
  warehouse_ids?: number[]
  warehouses?: WarehouseLite[]
  created_at?: string
}

export type WarehouseLite = { id: number; name: string; code: string }

export type PaginationMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type Paginated<T> = {
  data: T[]
  meta: PaginationMeta
}

export type ListParams = {
  page?: number
  per_page?: number
  search?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  [key: string]: string | number | boolean | undefined
}

export type Category = {
  id: number
  name: string
  slug: string
  description?: string | null
  parent_id?: number | null
  parent?: { id: number; name: string } | null
  products_count?: number
  children?: Category[]
  created_at?: string
}

export type Supplier = {
  id: number
  name: string
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  tax_number?: string | null
  notes?: string | null
  is_active: boolean
  products_count?: number
  purchase_orders_count?: number
  purchase_orders?: PurchaseOrder[]
  created_at?: string
}

export type Product = {
  id: number
  name: string
  sku: string
  barcode?: string | null
  description?: string | null
  category_id: number
  category?: Category | null
  supplier_id?: number | null
  supplier?: Supplier | null
  unit: string
  purchase_price: string
  selling_price: string
  minimum_stock: number
  image_path?: string | null
  image_url?: string | null
  is_active: boolean
  total_quantity?: number
  stock_by_warehouse?: { warehouse_id: number; warehouse: WarehouseLite | null; quantity: number }[]
  created_at?: string
}

export type WarehouseStats = {
  product_count: number
  stock_record_count: number
  unit_count: number
  stock_value: string
  low_stock_records: number
  pending_purchase_orders: number
}

export type Warehouse = {
  id: number
  name: string
  code: string
  address?: string | null
  city?: string | null
  description?: string | null
  is_active: boolean
  stock_balances_count?: number
  users_count?: number
  users?: User[]
  stats?: WarehouseStats
  created_at?: string
}

export type InventoryItem = {
  id: number
  product_id: number
  warehouse_id: number
  quantity: number
  minimum_stock: number
  purchase_price: string
  stock_value: string
  stock_status: 'ok' | 'low' | 'out'
  product?: { id: number; name: string; sku: string; unit: string; minimum_stock: number; purchase_price: string; category?: { id: number; name: string } | null }
  warehouse?: WarehouseLite
  updated_at?: string
}

export type MovementType = 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'

export type StockMovement = {
  id: number
  product_id: number
  warehouse_id: number
  user_id?: number
  type: MovementType
  quantity: number
  reference_type?: string | null
  reference_id?: number | null
  reason?: string | null
  notes?: string | null
  created_at: string
  product?: { id: number; name: string; sku: string }
  warehouse?: WarehouseLite
  user?: { id: number; name: string }
}

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

export type PurchaseOrderItem = {
  id: number
  product_id: number
  product?: { id: number; name: string; sku: string; unit: string } | null
  quantity_ordered: number
  quantity_received: number
  quantity_outstanding: number
  unit_cost: string
  line_total: string
}

export type PurchaseOrder = {
  id: number
  order_number: string
  supplier_id: number
  supplier?: Supplier | null
  warehouse_id: number
  warehouse?: Warehouse | null
  created_by: number
  creator?: { id: number; name: string } | null
  status: PurchaseOrderStatus
  expected_at?: string | null
  received_at?: string | null
  notes?: string | null
  total: number
  received_total: number
  items: PurchaseOrderItem[]
  created_at?: string
}

export type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'

export type StockTransfer = {
  id: number
  transfer_number: string
  source_warehouse_id: number
  source_warehouse?: WarehouseLite | null
  destination_warehouse_id: number
  destination_warehouse?: WarehouseLite | null
  created_by: number
  creator?: { id: number; name: string } | null
  status: TransferStatus
  notes?: string | null
  shipped_at?: string | null
  received_at?: string | null
  total_quantity?: number
  items: { id: number; product_id: number; product?: Product | null; quantity: number }[]
  created_at?: string
}

export type AdjustmentStatus = 'DRAFT' | 'SUBMITTED'

export type StockAdjustment = {
  id: number
  adjustment_number: string
  warehouse_id: number
  warehouse?: WarehouseLite | null
  created_by: number
  creator?: { id: number; name: string } | null
  status: AdjustmentStatus
  reason: string
  notes?: string | null
  items: {
    id: number
    product_id: number
    product?: { id: number; name: string; sku: string } | null
    system_quantity: number
    counted_quantity: number
    difference: number
  }[]
  created_at?: string
}

export type DashboardSummary = {
  total_products: number
  active_products: number
  total_stock_value: string
  total_warehouses: number
  low_stock_products: number
  pending_purchase_orders: number
  total_units: number
  total_suppliers: number
}

export type DashboardCharts = {
  inventory_value_series: { date: string; value: string }[]
  movement_series: { date: string; type: MovementType; movement_count: number; quantity: number }[]
  stock_by_category: { category_id: number; category: string; quantity: number; value: string }[]
  top_products: { id: number; name: string; sku: string; quantity: number; value: string }[]
}

export type ReportSummary = {
  product_count: number
  stock_record_count: number
  unit_count: number
  low_stock_record_count: number
  inventory_cost_value: string
}

export type ValuationRow = {
  product_id: number
  product: string
  sku: string
  unit: string
  category: string | null
  supplier: string | null
  quantity: number
  purchase_price: string
  value: string
}

export type WarehouseReportRow = {
  warehouse_id: number
  warehouse: string
  code: string
  product_count: number
  stock_record_count: number
  quantity: number
  value: string
  low_stock_records: number
}

export type CategoryReportRow = {
  category_id: number
  category: string
  product_count: number
  quantity: number
  value: string
}

export type MovementReport = {
  from: string | null
  to: string | null
  movement_count: number
  quantity_total: number
  by_type: { type: MovementType; movement_count: number; quantity_total: number }[]
  series: { date: string; type: MovementType; movement_count: number; quantity_total: number }[]
}

export type Settings = {
  company_name: string
  currency: string
  timezone: string
  date_format: string
}
