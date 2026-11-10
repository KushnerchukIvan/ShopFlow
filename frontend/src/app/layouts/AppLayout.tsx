import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Settings,
  Sun,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useLogout, roleLabels } from '../../hooks/useAuth'
import { useUiStore } from '../../stores/uiStore'
import { initials } from '../../lib/format'
import type { Role } from '../../types'

type NavItem = { to: string; label: string; icon: ReactNode; roles?: Role[] }
type NavSection = { title: string; items: NavItem[] }

const navSections: NavSection[] = [
  { title: 'Workspace', items: [{ to: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> }] },
  {
    title: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: <Package className="h-4 w-4" /> },
      { to: '/categories', label: 'Categories', icon: <Tags className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/inventory', label: 'Inventory', icon: <Boxes className="h-4 w-4" /> },
      { to: '/stock-movements', label: 'Stock movements', icon: <History className="h-4 w-4" /> },
      { to: '/transfers', label: 'Transfers', icon: <ArrowLeftRight className="h-4 w-4" /> },
      { to: '/adjustments', label: 'Adjustments', icon: <ClipboardCheck className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Purchasing',
    items: [
      { to: '/purchase-orders', label: 'Purchase orders', icon: <ClipboardList className="h-4 w-4" /> },
      { to: '/suppliers', label: 'Suppliers', icon: <Truck className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Network',
    items: [
      { to: '/warehouses', label: 'Warehouses', icon: <Building2 className="h-4 w-4" /> },
      { to: '/reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/users', label: 'Users', icon: <Users className="h-4 w-4" />, roles: ['admin'] },
      { to: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, roles: ['admin'] },
    ],
  },
]

const segmentLabels: Record<string, string> = {
  products: 'Products',
  categories: 'Categories',
  inventory: 'Inventory',
  'stock-movements': 'Stock movements',
  warehouses: 'Warehouses',
  suppliers: 'Suppliers',
  'purchase-orders': 'Purchase orders',
  transfers: 'Transfers',
  adjustments: 'Adjustments',
  reports: 'Reports',
  users: 'Users',
  settings: 'Settings',
  profile: 'Profile',
  new: 'New',
  edit: 'Edit',
}

export function AppLayout() {
  const { user } = useAuth()
  const { sidebarOpen, setSidebarOpen } = useUiStore()
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />}
      <Sidebar userRole={user?.role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-[1400px] overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Sidebar({ userRole, open, onClose }: { userRole?: Role; open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950">
            <Boxes className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">ShopFlow</span>
        </Link>
        <button type="button" onClick={onClose} aria-label="Close navigation" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {navSections.map((section) => {
          const items = section.items.filter((item) => !item.roles || (userRole && item.roles.includes(userRole)))
          if (items.length === 0) return null
          return (
            <div key={section.title} className="mb-5">
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{section.title}</p>
              <div className="grid gap-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{initials(user?.name ?? 'SF')}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{user?.name}</p>
            <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user ? roleLabels[user.role] : ''}</p>
          </div>
          <button type="button" aria-label="Sign out" onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

function Topbar() {
  const { user } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme, toggleSidebar } = useUiStore()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6 lg:px-8">
      <button type="button" onClick={toggleSidebar} aria-label="Open navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <Breadcrumbs pathname={location.pathname} />
      <div className="ml-auto flex items-center gap-1.5">
        <Link to="/reports?tab=low-stock" aria-label="Low stock notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
        </Link>
        <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={menuOpen} className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{initials(user?.name ?? 'SF')}</span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-36 truncate text-xs font-semibold">{user?.name}</span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">{user ? roleLabels[user.role] : ''}</span>
            </span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div role="menu" className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <Link to="/profile" role="menuitem" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">My profile</Link>
                <button type="button" role="menuitem" onClick={() => logout.mutate(undefined, { onSuccess: () => { setMenuOpen(false); navigate('/login') } })} className="block w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40">Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    const label = /^\d+$/.test(segment) ? 'Details' : segmentLabels[segment] ?? segment
    return { path, label }
  })

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <li><Link to="/" className="rounded px-1 py-0.5 font-medium hover:text-slate-800 dark:hover:text-slate-200">ShopFlow</Link></li>
        {crumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
            {index === crumbs.length - 1 ? (
              <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="truncate rounded px-1 py-0.5 hover:text-slate-800 dark:hover:text-slate-200">{crumb.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
