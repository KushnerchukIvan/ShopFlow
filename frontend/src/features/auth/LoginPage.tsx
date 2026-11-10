import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Boxes, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button, Field, FormError, Input } from '../../components/ui'
import { useAuth, useLogin } from '../../hooks/useAuth'
import { errorMessage } from '../../lib/errors'

const demoAccounts = [
  { role: 'Administrator', email: 'admin@example.test' },
  { role: 'Manager', email: 'manager1@example.test' },
  { role: 'Warehouse operator', email: 'operator1@example.test' },
  { role: 'Viewer', email: 'viewer1@example.test' },
]

const demoPassword = 'ShopFlow!Demo2026'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { isAuthenticated } = useAuth()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@example.test', password: demoPassword },
  })

  const submit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (user) => {
        toast.success(`Welcome back, ${user.name.split(' ')[0]}`)
        const from = (location.state as { from?: string } | null)?.from
        navigate(from && from !== '/login' ? from : '/', { replace: true })
      },
      onError: (mutationError) => setError('root', { message: errorMessage(mutationError) }),
    })
  })

  if (isAuthenticated) return <Navigate to="/" replace />

  return (
    <div className="grid min-h-screen bg-slate-50 dark:bg-slate-950 lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-emerald-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-emerald-700/40" aria-hidden />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-emerald-700/30" aria-hidden />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-emerald-950"><Boxes className="h-5 w-5" /></span>
          <span className="text-lg font-semibold tracking-tight">ShopFlow</span>
        </div>
        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Inventory, finally in focus</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">Know exactly what is in every warehouse.</h1>
          <p className="mt-4 text-sm leading-relaxed text-emerald-100/80">
            Products, purchasing, transfers, and stock counts in one auditable workspace. Every movement is recorded in an immutable ledger.
          </p>
          <div className="mt-8 grid gap-3">
            {['Real-time stock by warehouse', 'Partial purchase order receiving', 'Role-based access with audit history'].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-emerald-50/90">
                <ShieldCheck className="h-4 w-4 text-emerald-300" /> {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-emerald-200/60">ShopFlow development workspace · Built with Laravel and React</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white"><Boxes className="h-[18px] w-[18px]" /></span>
            <span className="text-lg font-semibold tracking-tight">ShopFlow</span>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Sign in</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use your workspace account to continue.</p>

          <form onSubmit={submit} className="mt-6 grid gap-4">
            <Field label="Email address" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="username" required aria-invalid={Boolean(errors.email)} {...register('email')} placeholder="you@company.com" />
            </Field>
            <Field label="Password" htmlFor="password" required error={errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(errors.password)} {...register('password')} placeholder="••••••••" />
            </Field>
            <FormError message={errors.root?.message} />
            <Button type="submit" loading={login.isPending} className="w-full" icon={<ArrowRight className="h-4 w-4" />}>Sign in</Button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Demo accounts</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">local only</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Password for every account: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] dark:bg-slate-800">{demoPassword}</code></p>
            <div className="mt-3 grid gap-1">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setValue('email', account.email, { shouldValidate: true })
                    setValue('password', demoPassword, { shouldValidate: true })
                  }}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">{account.role}</span>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
