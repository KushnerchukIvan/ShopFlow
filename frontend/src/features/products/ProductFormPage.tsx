import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, Checkbox, Field, FormActions, FormError, Input, PageHeader, SectionCard, Select, Textarea, PageSkeleton } from '../../components/ui'
import { categoryApi, productApi, supplierApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'

type ProductFormState = {
  name: string
  sku: string
  barcode: string
  description: string
  category_id: string
  supplier_id: string
  unit: string
  purchase_price: string
  selling_price: string
  minimum_stock: string
  is_active: boolean
}

const emptyForm: ProductFormState = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  category_id: '',
  supplier_id: '',
  unit: 'piece',
  purchase_price: '0',
  selling_price: '0',
  minimum_stock: '0',
  is_active: true,
}

export function ProductFormPage() {
  const params = useParams()
  const productId = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [error, setError] = useState<string>()

  const product = useQuery({ queryKey: ['products', 'detail', productId], queryFn: () => productApi.get(productId!), enabled: Boolean(productId) })
  const categories = useQuery({ queryKey: ['categories', 'options'], queryFn: () => categoryApi.list({ per_page: 100 }) })
  const suppliers = useQuery({ queryKey: ['suppliers', 'options'], queryFn: () => supplierApi.list({ per_page: 100 }) })

  useEffect(() => {
    if (!product.data) return
    setForm({
      name: product.data.name,
      sku: product.data.sku,
      barcode: product.data.barcode ?? '',
      description: product.data.description ?? '',
      category_id: String(product.data.category_id),
      supplier_id: product.data.supplier_id ? String(product.data.supplier_id) : '',
      unit: product.data.unit,
      purchase_price: product.data.purchase_price,
      selling_price: product.data.selling_price,
      minimum_stock: String(product.data.minimum_stock),
      is_active: product.data.is_active,
    })
  }, [product.data])

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || null,
        description: form.description.trim() || null,
        category_id: Number(form.category_id),
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        unit: form.unit.trim(),
        purchase_price: form.purchase_price,
        selling_price: form.selling_price,
        minimum_stock: Number(form.minimum_stock),
        is_active: form.is_active,
      }
      return productId ? productApi.update(productId, payload) : productApi.create(payload)
    },
    onSuccess: (saved) => {
      toast.success(productId ? 'Product updated' : 'Product created')
      navigate(`/products/${saved.id}`)
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const update = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => setForm((current) => ({ ...current, [key]: value }))

  if (productId && product.isLoading) return <PageSkeleton />
  if (productId && product.isError) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">Could not load this product. {errorMessage(product.error)}</div>

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalog"
        title={productId ? 'Edit product' : 'New product'}
        description={productId ? `Update the details for ${product.data?.name}.` : 'Add a product to your catalog before tracking stock.'}
        actions={<Link to={productId ? `/products/${productId}` : '/products'}><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          setError(undefined)
          if (!form.name.trim() || !form.sku.trim() || !form.category_id) {
            setError('Name, SKU, and category are required.')
            return
          }
          save.mutate()
        }}
      >
        <SectionCard title="Product information">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Product name" htmlFor="name" required className="sm:col-span-2">
              <Input id="name" value={form.name} onChange={(event) => update('name', event.target.value)} required maxLength={255} placeholder="e.g. Stainless steel kettle" />
            </Field>
            <Field label="SKU" htmlFor="sku" required hint="Unique stock keeping unit.">
              <Input id="sku" value={form.sku} onChange={(event) => update('sku', event.target.value)} required maxLength={255} placeholder="SF-0001" className="font-mono" />
            </Field>
            <Field label="Barcode" htmlFor="barcode">
              <Input id="barcode" value={form.barcode} onChange={(event) => update('barcode', event.target.value)} maxLength={255} placeholder="Optional" className="font-mono" />
            </Field>
            <Field label="Category" htmlFor="category" required>
              <Select id="category" value={form.category_id} onChange={(event) => update('category_id', event.target.value)} required>
                <option value="" disabled>Select category</option>
                {(categories.data?.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
            </Field>
            <Field label="Supplier" htmlFor="supplier">
              <Select id="supplier" value={form.supplier_id} onChange={(event) => update('supplier_id', event.target.value)}>
                <option value="">No supplier</option>
                {(suppliers.data?.data ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </Select>
            </Field>
            <Field label="Unit" htmlFor="unit" required>
              <Input id="unit" value={form.unit} onChange={(event) => update('unit', event.target.value)} required maxLength={40} placeholder="piece" />
            </Field>
            <Field label="Minimum stock" htmlFor="minimum_stock" hint="Alert threshold per warehouse.">
              <Input id="minimum_stock" type="number" min={0} step={1} value={form.minimum_stock} onChange={(event) => update('minimum_stock', event.target.value)} required />
            </Field>
            <Field label="Purchase price" htmlFor="purchase_price" required>
              <Input id="purchase_price" type="number" min={0} step="0.01" value={form.purchase_price} onChange={(event) => update('purchase_price', event.target.value)} required />
            </Field>
            <Field label="Selling price" htmlFor="selling_price" required>
              <Input id="selling_price" type="number" min={0} step="0.01" value={form.selling_price} onChange={(event) => update('selling_price', event.target.value)} required />
            </Field>
            <Field label="Description" htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Optional product notes" />
            </Field>
            <div className="sm:col-span-2">
              <Checkbox label="Product is active" checked={form.is_active} onChange={(event) => update('is_active', event.target.checked)} />
            </div>
            <div className="sm:col-span-2">
              <FormError message={error} />
            </div>
          </div>
          <div className="px-4 pb-4">
            <FormActions>
              <Link to={productId ? `/products/${productId}` : '/products'}><Button type="button" variant="secondary">Cancel</Button></Link>
              <Button type="submit" loading={save.isPending} icon={<Save className="h-4 w-4" />}>{productId ? 'Save changes' : 'Create product'}</Button>
            </FormActions>
          </div>
        </SectionCard>
      </form>
    </div>
  )
}
