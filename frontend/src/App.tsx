import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PageSkeleton } from './components/ui'
import { ProtectedRoute, RequireRole } from './app/router/ProtectedRoute'
import { AppLayout } from './app/layouts/AppLayout'

const LoginPage = lazy(() => import('./features/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const ProfilePage = lazy(() => import('./features/auth/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ProductsPage = lazy(() => import('./features/products/ProductsPage').then((module) => ({ default: module.ProductsPage })))
const ProductFormPage = lazy(() => import('./features/products/ProductFormPage').then((module) => ({ default: module.ProductFormPage })))
const ProductDetailPage = lazy(() => import('./features/products/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })))
const CategoriesPage = lazy(() => import('./features/categories/CategoriesPage').then((module) => ({ default: module.CategoriesPage })))
const InventoryPage = lazy(() => import('./features/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage })))
const StockMovementsPage = lazy(() => import('./features/stock-movements/StockMovementsPage').then((module) => ({ default: module.StockMovementsPage })))
const WarehousesPage = lazy(() => import('./features/warehouses/WarehousesPage').then((module) => ({ default: module.WarehousesPage })))
const WarehouseDetailPage = lazy(() => import('./features/warehouses/WarehouseDetailPage').then((module) => ({ default: module.WarehouseDetailPage })))
const SuppliersPage = lazy(() => import('./features/suppliers/SuppliersPage').then((module) => ({ default: module.SuppliersPage })))
const SupplierDetailPage = lazy(() => import('./features/suppliers/SupplierDetailPage').then((module) => ({ default: module.SupplierDetailPage })))
const PurchaseOrdersPage = lazy(() => import('./features/purchase-orders/PurchaseOrdersPage').then((module) => ({ default: module.PurchaseOrdersPage })))
const PurchaseOrderFormPage = lazy(() => import('./features/purchase-orders/PurchaseOrderFormPage').then((module) => ({ default: module.PurchaseOrderFormPage })))
const PurchaseOrderDetailPage = lazy(() => import('./features/purchase-orders/PurchaseOrderDetailPage').then((module) => ({ default: module.PurchaseOrderDetailPage })))
const TransfersPage = lazy(() => import('./features/transfers/TransfersPage').then((module) => ({ default: module.TransfersPage })))
const TransferFormPage = lazy(() => import('./features/transfers/TransferFormPage').then((module) => ({ default: module.TransferFormPage })))
const TransferDetailPage = lazy(() => import('./features/transfers/TransferDetailPage').then((module) => ({ default: module.TransferDetailPage })))
const AdjustmentsPage = lazy(() => import('./features/adjustments/AdjustmentsPage').then((module) => ({ default: module.AdjustmentsPage })))
const AdjustmentFormPage = lazy(() => import('./features/adjustments/AdjustmentFormPage').then((module) => ({ default: module.AdjustmentFormPage })))
const AdjustmentDetailPage = lazy(() => import('./features/adjustments/AdjustmentDetailPage').then((module) => ({ default: module.AdjustmentDetailPage })))
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const UsersPage = lazy(() => import('./features/users/UsersPage').then((module) => ({ default: module.UsersPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Page><DashboardPage /></Page>} />
              <Route path="profile" element={<Page><ProfilePage /></Page>} />

              <Route path="products" element={<Page><ProductsPage /></Page>} />
              <Route path="products/new" element={<Page><ProductFormPage /></Page>} />
              <Route path="products/:id" element={<Page><ProductDetailPage /></Page>} />
              <Route path="products/:id/edit" element={<Page><ProductFormPage /></Page>} />
              <Route path="categories" element={<Page><CategoriesPage /></Page>} />
              <Route path="inventory" element={<Page><InventoryPage /></Page>} />
              <Route path="stock-movements" element={<Page><StockMovementsPage /></Page>} />

              <Route path="warehouses" element={<Page><WarehousesPage /></Page>} />
              <Route path="warehouses/:id" element={<Page><WarehouseDetailPage /></Page>} />
              <Route path="suppliers" element={<Page><SuppliersPage /></Page>} />
              <Route path="suppliers/:id" element={<Page><SupplierDetailPage /></Page>} />

              <Route path="purchase-orders" element={<Page><PurchaseOrdersPage /></Page>} />
              <Route path="purchase-orders/new" element={<Page><PurchaseOrderFormPage /></Page>} />
              <Route path="purchase-orders/:id" element={<Page><PurchaseOrderDetailPage /></Page>} />
              <Route path="purchase-orders/:id/edit" element={<Page><PurchaseOrderFormPage /></Page>} />

              <Route path="transfers" element={<Page><TransfersPage /></Page>} />
              <Route path="transfers/new" element={<Page><TransferFormPage /></Page>} />
              <Route path="transfers/:id" element={<Page><TransferDetailPage /></Page>} />

              <Route path="adjustments" element={<Page><AdjustmentsPage /></Page>} />
              <Route path="adjustments/new" element={<Page><AdjustmentFormPage /></Page>} />
              <Route path="adjustments/:id" element={<Page><AdjustmentDetailPage /></Page>} />

              <Route path="reports" element={<Page><ReportsPage /></Page>} />
              <Route path="users" element={<RequireRole roles={['admin']}><Page><UsersPage /></Page></RequireRole>} />
              <Route path="settings" element={<RequireRole roles={['admin']}><Page><SettingsPage /></Page></RequireRole>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
