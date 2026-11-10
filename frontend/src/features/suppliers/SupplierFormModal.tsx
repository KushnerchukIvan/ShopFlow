import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Checkbox, Field, FormActions, FormError, Input, Modal, Textarea } from '../../components/ui'
import { supplierApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import type { Supplier } from '../../types'

type Props = { open: boolean; supplier?: Supplier | null; onClose: () => void }

type FormState = {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  tax_number: string
  notes: string
  is_active: boolean
}

const empty: FormState = { name: '', contact_person: '', email: '', phone: '', address: '', city: '', country: '', tax_number: '', notes: '', is_active: true }

export function SupplierFormModal({ open, supplier, onClose }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setForm(supplier ? {
      name: supplier.name,
      contact_person: supplier.contact_person ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      city: supplier.city ?? '',
      country: supplier.country ?? '',
      tax_number: supplier.tax_number ?? '',
      notes: supplier.notes ?? '',
      is_active: supplier.is_active,
    } : empty)
    setError(undefined)
  }, [open, supplier])

  const save = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === 'string' && value.trim() === '' ? null : value]))
      return supplier ? supplierApi.update(supplier.id, payload) : supplierApi.create(payload)
    },
    onSuccess: () => {
      toast.success(supplier ? 'Supplier updated' : 'Supplier created')
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      onClose()
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier ? 'Edit supplier' : 'New supplier'}
      description="Supplier records power purchasing and product sourcing."
      footer={
        <FormActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={save.isPending}
            onClick={() => {
              setError(undefined)
              if (!form.name.trim()) {
                setError('Supplier name is required.')
                return
              }
              save.mutate()
            }}
          >
            {supplier ? 'Save changes' : 'Create supplier'}
          </Button>
        </FormActions>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier name" htmlFor="supplier-name" required className="sm:col-span-2">
          <Input id="supplier-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={255} />
        </Field>
        <Field label="Contact person" htmlFor="supplier-contact">
          <Input id="supplier-contact" value={form.contact_person} onChange={(event) => setForm((current) => ({ ...current, contact_person: event.target.value }))} maxLength={255} />
        </Field>
        <Field label="Email" htmlFor="supplier-email">
          <Input id="supplier-email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} maxLength={255} />
        </Field>
        <Field label="Phone" htmlFor="supplier-phone">
          <Input id="supplier-phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} maxLength={40} />
        </Field>
        <Field label="Tax number" htmlFor="supplier-tax">
          <Input id="supplier-tax" value={form.tax_number} onChange={(event) => setForm((current) => ({ ...current, tax_number: event.target.value }))} maxLength={100} />
        </Field>
        <Field label="Address" htmlFor="supplier-address" className="sm:col-span-2">
          <Input id="supplier-address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} maxLength={255} />
        </Field>
        <Field label="City" htmlFor="supplier-city">
          <Input id="supplier-city" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} maxLength={255} />
        </Field>
        <Field label="Country" htmlFor="supplier-country">
          <Input id="supplier-country" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} maxLength={255} />
        </Field>
        <Field label="Notes" htmlFor="supplier-notes" className="sm:col-span-2">
          <Textarea id="supplier-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </Field>
        <div className="sm:col-span-2">
          <Checkbox label="Supplier is active" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
        </div>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </div>
    </Modal>
  )
}
