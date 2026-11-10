import { useQuery } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, Building2, ClipboardList, Package, Plus, TrendingUp, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge, Button, EmptyState, ErrorState, PageHeader, PageSkeleton, SectionCard, StatCard, statusTone } from '../../components/ui'
import { useAuth, canManageCatalog, canOperateInventory } from '../../hooks/useAuth'
import { dashboardApi, purchaseOrderApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { dateTime, money, number, shortDate, titleCase } from '../../lib/format'
import type { DashboardCharts, StockMovement } from '../../types'

const chartColors = ['#059669', '#0ea5e9', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6', '#64748b', '#84cc16']

export function DashboardPage() {
  const { user } = useAuth()
  const summary = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: dashboardApi.summary })
  const charts = useQuery({ queryKey: ['dashboard', 'charts'], queryFn: dashboardApi.charts })
  const movements = useQuery({ queryKey: ['dashboard', 'movements'], queryFn: () => dashboardApi.recentMovements(8) })
  const lowStock = useQuery({ queryKey: ['dashboard', 'low-stock'], queryFn: () => dashboardApi.lowStock(6) })
  const orders = useQuery({ queryKey: ['dashboard', 'orders'], queryFn: () => purchaseOrderApi.list({ per_page: 4 }) })

  const isInitialLoading = summary.isLoading && charts.isLoading
  if (isInitialLoading) return <PageSkeleton />

  const data = summary.data
  const chartData = charts.data

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace overview"
        title={`Good to see you, ${user?.name.split(' ')[0] ?? 'there'}`}
        description="A live picture of stock value, inbound activity, and what needs attention."
        actions={
          <>
            {canOperateInventory(user) && (
              <Link to="/inventory?action=stock-in"><Button variant="secondary" icon={<ArrowDownToLine className="h-4 w-4" />}>Stock in</Button></Link>
            )}
            {canManageCatalog(user) && (
              <Link to="/purchase-orders/new"><Button icon={<Plus className="h-4 w-4" />}>New purchase order</Button></Link>
            )}
          </>
        }
      />

      {summary.isError && <ErrorState message={errorMessage(summary.error)} onRetry={() => void summary.refetch()} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total products" value={number(data?.total_products ?? 0)} hint={`${number(data?.active_products ?? 0)} active`} icon={<Package className="h-4 w-4" />} loading={summary.isLoading} />
        <StatCard title="Stock value" value={money(data?.total_stock_value ?? 0)} hint={`${number(data?.total_units ?? 0)} units on hand`} icon={<TrendingUp className="h-4 w-4" />} tone="sky" loading={summary.isLoading} />
        <StatCard title="Warehouses" value={number(data?.total_warehouses ?? 0)} hint="in your scope" icon={<Building2 className="h-4 w-4" />} tone="violet" loading={summary.isLoading} />
        <StatCard title="Low stock" value={number(data?.low_stock_products ?? 0)} hint="products at or below minimum" icon={<TriangleAlert className="h-4 w-4" />} tone="amber" loading={summary.isLoading} />
        <StatCard title="Pending orders" value={number(data?.pending_purchase_orders ?? 0)} hint="ordered or partially received" icon={<ClipboardList className="h-4 w-4" />} tone="rose" loading={summary.isLoading} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Inventory value over time" description="Cost value of stock across accessible warehouses." className="xl:col-span-2">
          <div className="h-64 px-2 pb-3 pt-4">
            {charts.isError ? (
              <ErrorState message={errorMessage(charts.error)} onRetry={() => void charts.refetch()} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(chartData?.inventory_value_series ?? []).map((point) => ({ ...point, value: Number(point.value) }))} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value: string) => shortDate(value)} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(value) => money(Number(value))} labelFormatter={(label) => shortDate(String(label))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} fill="url(#valueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Stock by category" description="Share of cost value.">
          <div className="h-64 px-2 pb-2">
            {charts.isLoading ? (
              <div className="h-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={(chartData?.stock_by_category ?? []).map((row) => ({ ...row, value: Number(row.value) }))} dataKey="value" nameKey="category" innerRadius={48} outerRadius={78} paddingAngle={2} strokeWidth={0}>
                    {(chartData?.stock_by_category ?? []).map((row, index) => <Cell key={row.category_id} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-4 pb-4">
            {(chartData?.stock_by_category ?? []).slice(0, 6).map((row, index) => (
              <div key={row.category_id} className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span className="truncate">{row.category}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Stock movement activity" description="Movements per day over the last 30 days." className="xl:col-span-2">
          <div className="h-56 px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movementByDay(chartData)} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value: string) => shortDate(value)} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip labelFormatter={(label) => shortDate(String(label))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="inbound" name="Inbound" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outbound" name="Outbound" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Top products by value" description="Highest inventory cost value.">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(chartData?.top_products ?? []).map((product, index) => {
              const max = Number(chartData?.top_products[0]?.value ?? 1)
              const width = Math.max(4, Math.round((Number(product.value) / max) * 100))
              return (
                <div key={product.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{index + 1}. {product.name}</span>
                    <span className="shrink-0 font-semibold text-slate-900 dark:text-white">{money(product.value)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
            {!chartData?.top_products.length && <EmptyState title="No stock value yet" />}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Recent stock movements" description="Latest entries in the inventory ledger." actions={<Link to="/stock-movements" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">View all</Link>}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {movements.isLoading && <div className="p-4"><div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>}
            {movements.isError && <ErrorState message={errorMessage(movements.error)} onRetry={() => void movements.refetch()} />}
            {(movements.data ?? []).map((movement) => <MovementRow key={movement.id} movement={movement} />)}
            {movements.data?.length === 0 && <EmptyState title="No movements yet" description="Stock in, transfer, or adjust inventory to populate the ledger." />}
          </div>
        </SectionCard>

        <SectionCard title="Low stock alerts" description="Products at or below their minimum level." actions={<Link to="/reports?tab=low-stock" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Low stock report</Link>}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {lowStock.isLoading && <div className="p-4"><div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>}
            {lowStock.isError && <ErrorState message={errorMessage(lowStock.error)} onRetry={() => void lowStock.refetch()} />}
            {(lowStock.data ?? []).map((item) => (
              <div key={`${item.product_id}-${item.warehouse_id}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{item.product?.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{item.warehouse?.name} · min {item.minimum_stock}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={item.quantity === 0 ? 'rose' : 'amber'}>{item.quantity === 0 ? 'Out of stock' : `${item.quantity} left`}</Badge>
                  {canManageCatalog(user) && (
                    <Link to={`/purchase-orders/new?productId=${item.product_id}`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800" aria-label={`Order ${item.product?.name}`}>
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {lowStock.data?.length === 0 && <EmptyState title="Everything is above minimum" description="No low-stock alerts in your warehouses." />}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard title="Recent purchase orders" actions={<Link to="/purchase-orders" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">View all</Link>}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.isLoading && <div className="p-4"><div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>}
            {(orders.data?.data ?? []).map((order) => (
              <Link key={order.id} to={`/purchase-orders/${order.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{order.order_number}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{order.supplier?.name} · {order.warehouse?.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{money(order.total)}</span>
                  <Badge tone={statusTone(order.status)}>{titleCase(order.status)}</Badge>
                </div>
              </Link>
            ))}
            {orders.data?.data.length === 0 && <EmptyState title="No purchase orders" />}
          </div>
        </SectionCard>

        <SectionCard title="Quick actions">
          <div className="grid grid-cols-2 gap-2 p-3">
            {[
              { to: '/inventory?action=stock-in', label: 'Stock in', icon: <ArrowDownToLine className="h-4 w-4" />, roles: ['admin', 'manager', 'warehouse_operator'] },
              { to: '/inventory?action=stock-out', label: 'Stock out', icon: <ArrowUpFromLine className="h-4 w-4" />, roles: ['admin', 'manager', 'warehouse_operator'] },
              { to: '/products/new', label: 'New product', icon: <Package className="h-4 w-4" />, roles: ['admin', 'manager'] },
              { to: '/transfers/new', label: 'New transfer', icon: <ArrowLeftRight className="h-4 w-4" />, roles: ['admin', 'manager', 'warehouse_operator'] },
              { to: '/adjustments/new', label: 'New count', icon: <ClipboardList className="h-4 w-4" />, roles: ['admin', 'manager', 'warehouse_operator'] },
              { to: '/reports', label: 'Reports', icon: <Boxes className="h-4 w-4" />, roles: ['admin', 'manager', 'warehouse_operator', 'viewer'] },
            ].filter((action) => user && action.roles.includes(user.role)).map((action) => (
              <Link key={action.to} to={action.to} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20">
                <span className="text-emerald-600 dark:text-emerald-400">{action.icon}</span>
                {action.label}
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function MovementRow({ movement }: { movement: StockMovement }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{movement.product?.name ?? `Product #${movement.product_id}`}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{movement.warehouse?.name} · {dateTime(movement.created_at)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{movement.quantity}</span>
        <Badge tone={movement.type.includes('IN') ? 'emerald' : 'amber'}>{titleCase(movement.type)}</Badge>
      </div>
    </div>
  )
}

function movementByDay(charts?: DashboardCharts): Array<{ date: string; inbound: number; outbound: number }> {
  const map = new Map<string, { date: string; inbound: number; outbound: number }>()
  ;(charts?.movement_series ?? []).forEach((point) => {
    const entry = map.get(point.date) ?? { date: point.date, inbound: 0, outbound: 0 }
    if (point.type.includes('IN')) entry.inbound += point.movement_count
    else entry.outbound += point.movement_count
    map.set(point.date, entry)
  })
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}
