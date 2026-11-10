import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Field, FormActions, FormError, Input, PageHeader, PageSkeleton, SectionCard, Select } from '../../components/ui'
import { settingsApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import type { Settings } from '../../types'

const empty: Settings = { company_name: 'ShopFlow', currency: 'USD', timezone: 'Europe/Kyiv', date_format: 'Y-m-d' }

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Settings>(empty)
  const [error, setError] = useState<string>()
  const settings = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })

  useEffect(() => {
    if (settings.data) setForm(settings.data)
  }, [settings.data])

  const save = useMutation({
    mutationFn: () => settingsApi.update(form),
    onSuccess: (updated) => {
      toast.success('Workspace settings saved')
      setForm(updated)
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  if (settings.isLoading) return <PageSkeleton />

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Workspace settings"
        description="Company defaults used for display, currency, and reporting."
        actions={<Button loading={save.isPending} icon={<Save className="h-4 w-4" />} onClick={() => { setError(undefined); save.mutate() }}>Save settings</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title="Company profile" description="Shown in exports and workspace labels.">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="company-name" required className="sm:col-span-2">
              <Input id="company-name" value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} maxLength={255} />
            </Field>
            <Field label="Default currency" htmlFor="currency" required hint="Used for monetary display across the app.">
              <Select id="currency" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}>
                {['USD', 'EUR', 'UAH', 'GBP', 'PLN', 'CAD', 'AUD'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </Select>
            </Field>
            <Field label="Timezone" htmlFor="timezone" required>
              <Input id="timezone" value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="Europe/Kyiv" />
            </Field>
            <Field label="Date format" htmlFor="date-format" required>
              <Select id="date-format" value={form.date_format} onChange={(event) => setForm((current) => ({ ...current, date_format: event.target.value }))}>
                <option value="Y-m-d">YYYY-MM-DD</option>
                <option value="d/m/Y">DD/MM/YYYY</option>
                <option value="m/d/Y">MM/DD/YYYY</option>
                <option value="d.m.Y">DD.MM.YYYY</option>
              </Select>
            </Field>
            <div className="sm:col-span-2"><FormError message={error} /></div>
          </div>
          <div className="px-4 pb-4">
            <FormActions>
              <Button loading={save.isPending} onClick={() => { setError(undefined); save.mutate() }} icon={<Save className="h-4 w-4" />}>Save settings</Button>
            </FormActions>
          </div>
        </SectionCard>

        <SectionCard title="Environment" description="Read-only deployment information.">
          <div className="space-y-3 p-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p>Settings are stored in the database and applied by the API. Configure database credentials, Redis, CORS, and sessions through environment variables.</p>
            </div>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <Row label="Authentication" value="Sanctum SPA cookies" />
              <Row label="Database" value="PostgreSQL" />
              <Row label="Ledger policy" value="Immutable stock movements" />
              <Row label="Role model" value="Admin · Manager · Operator · Viewer" />
            </dl>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  )
}
