import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Checkbox, Field, FormActions, FormError, Input, Modal, Textarea } from '../../components/ui'
import { warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import type { Warehouse } from '../../types'

type Props = {
  open: boolean
  warehouse?: Warehouse | null
  onClose: () => void
}

type FormState = { name: string; code: string; address: string; city: string; description: string; is_active: boolean }

const empty: FormState = { name: '', code: '', address: '', city: '', description: '', is_active: true }

export function WarehouseFormModal({ open, warehouse, onClose }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setForm(warehouse ? {
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address ?? '',
      city: warehouse.city ?? '',
      description: warehouse.description ?? '',
      is_active: warehouse.is_active,
    } : empty)
    setError(undefined)
  }, [open, warehouse])

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        description: form.description.trim() || null,
        is_active: form.is_active,
      }
      return warehouse ? warehouseApi.update(warehouse.id, payload) : warehouseApi.create(payload)
    },
    onSuccess: (saved) => {
      toast.success(warehouse ? 'Warehouse updated' : 'Warehouse created')
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      void queryClient.invalidateQueries({ queryKey: ['warehouses', saved.id] })
      onClose()
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={warehouse ? 'Edit warehouse' : 'New warehouse'}
      description="Warehouses are the locations that hold stock balances."
      footer={
        <FormActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={save.isPending}
            onClick={() => {
              setError(undefined)
              if (!form.name.trim() || !form.code.trim()) {
                setError('Name and code are required.')
                return
              }
              save.mutate()
            }}
          >
            {warehouse ? 'Save changes' : 'Create warehouse'}
          </Button>
        </FormActions>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="warehouse-name" required className="sm:col-span-2">
          <Input id="warehouse-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={255} />
        </Field>
        <Field label="Code" htmlFor="warehouse-code" required hint="Unique short code, e.g. WH-CENTRAL.">
          <Input id="warehouse-code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} maxLength={255} className="font-mono" />
        </Field>
        <Field label="City" htmlFor="warehouse-city">
          <Input id="warehouse-city" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} maxLength={255} />
        </Field>
        <Field label="Address" htmlFor="warehouse-address" className="sm:col-span-2">
          <Input id="warehouse-address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} maxLength={255} />
        </Field>
        <Field label="Description" htmlFor="warehouse-description" className="sm:col-span-2">
          <Textarea id="warehouse-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </Field>
        <div className="sm:col-span-2">
          <Checkbox label="Warehouse is active" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
        </div>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </div>
    </Modal>
  )
}
