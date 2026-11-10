import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Field, FormActions, FormError, Input, PageHeader, SectionCard } from '../../components/ui'
import { useAuth, roleLabels } from '../../hooks/useAuth'
import { changePassword } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { shortDate } from '../../lib/format'

export function ProfilePage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)

    if (password.length < 8) {
      setError('The new password must be at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setError('The password confirmation does not match.')
      return
    }

    setSaving(true)
    try {
      await changePassword({ current_password: currentPassword, password, password_confirmation: confirmation })
      toast.success('Password updated')
      setCurrentPassword('')
      setPassword('')
      setConfirmation('')
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Account" title="My profile" description="Your identity, role, and warehouse assignments." />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title="Account details">
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <Row label="Full name" value={user.name} />
            <Row label="Email address" value={user.email} />
            <Row label="Role" value={roleLabels[user.role]} />
            <Row label="Status" value={user.is_active ? 'Active' : 'Inactive'} />
            <Row label="Member since" value={shortDate(user.created_at)} />
            <Row label="Assigned warehouses" value={user.warehouses?.length ? user.warehouses.map((warehouse) => warehouse.name).join(', ') : user.role === 'admin' ? 'All warehouses' : 'None'} />
          </dl>
        </SectionCard>

        <SectionCard title="Change password" description="Use at least 8 characters.">
          <form onSubmit={submit} className="grid gap-4">
            <Field label="Current password" htmlFor="current-password" required>
              <Input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </Field>
            <Field label="New password" htmlFor="new-password" required>
              <Input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm-password" required>
              <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </Field>
            <FormError message={error} />
            <FormActions>
              <Button type="submit" loading={saving}>Update password</Button>
            </FormActions>
          </form>
        </SectionCard>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  )
}
