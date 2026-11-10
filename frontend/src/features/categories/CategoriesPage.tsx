import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Field,
  FormActions,
  FormError,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  SectionCard,
  Select,
  Textarea,
  type Column,
} from '../../components/ui'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { canManageCatalog, useAuth } from '../../hooks/useAuth'
import { categoryApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import type { Category } from '../../types'

type CategoryForm = { name: string; slug: string; description: string; parent_id: string }

const emptyForm: CategoryForm = { name: '', slug: '', description: '', parent_id: '' }

export function CategoriesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canManage = canManageCatalog(user)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [formError, setFormError] = useState<string>()
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const debouncedSearch = useDebouncedValue(search)

  const categories = useQuery({
    queryKey: ['categories', { debouncedSearch, page, perPage }],
    queryFn: () => categoryApi.list({ search: debouncedSearch || undefined, page, per_page: perPage }),
  })
  const allCategories = useQuery({ queryKey: ['categories', 'tree'], queryFn: categoryApi.tree })

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        description: form.description.trim() || null,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
      }
      return editing ? categoryApi.update(editing.id, payload) : categoryApi.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Category updated' : 'Category created')
      setFormOpen(false)
      setEditing(null)
      setForm(emptyForm)
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (error) => setFormError(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => categoryApi.remove(id),
    onSuccess: () => {
      toast.success('Category deleted')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(undefined)
    setFormOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setForm({ name: category.name, slug: category.slug, description: category.description ?? '', parent_id: category.parent_id ? String(category.parent_id) : '' })
    setFormError(undefined)
    setFormOpen(true)
  }

  const flatten = (rows: Category[], depth = 0): Array<{ category: Category; depth: number }> =>
    rows.flatMap((category) => [{ category, depth }, ...flatten(category.children ?? [], depth + 1)])

  const parentOptions = flatten(allCategories.data ?? []).filter(({ category }) => category.id !== editing?.id)

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category',
      cell: (category) => (
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"><FolderTree className="h-3.5 w-3.5" /></span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{category.name}</p>
            {category.description && <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{category.description}</p>}
          </div>
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', cell: (category) => <span className="font-mono text-xs">{category.slug}</span> },
    { key: 'parent', header: 'Parent', cell: (category) => category.parent?.name ?? <span className="text-slate-400">Root</span> },
    { key: 'products', header: 'Products', align: 'right', cell: (category) => <Badge tone="slate">{category.products_count ?? 0}</Badge> },
    ...(canManage
      ? [{
          key: 'actions',
          header: '',
          align: 'right' as const,
          cell: (category: Category) => (
            <div className="flex items-center justify-end gap-1">
              <button type="button" aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Delete ${category.name}`} onClick={() => setDeleteTarget(category)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalog"
        title="Categories"
        description="Organize products into a nested catalog hierarchy."
        actions={canManage ? <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add category</Button> : undefined}
      />

      <SectionCard>
        <div className="border-b border-slate-100 p-3 dark:border-slate-800">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search categories" label="Search categories" />
        </div>
        <DataTable
          columns={columns}
          rows={categories.data?.data ?? []}
          rowKey={(category) => category.id}
          loading={categories.isLoading}
          error={categories.isError ? errorMessage(categories.error) : null}
          onRetry={() => void categories.refetch()}
          emptyTitle="No categories found"
          emptyDescription="Create categories to organize your product catalog."
          footer={categories.data ? <Pagination meta={categories.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit category' : 'New category'}
        description="Categories can be nested under a parent category."
        footer={
          <FormActions>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button loading={save.isPending} onClick={() => { setFormError(undefined); save.mutate() }}>{editing ? 'Save changes' : 'Create category'}</Button>
          </FormActions>
        }
      >
        <div className="grid gap-4">
          <Field label="Name" htmlFor="category-name" required>
            <Input id="category-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required maxLength={255} />
          </Field>
          <Field label="Slug" htmlFor="category-slug" hint="Leave blank to generate from the name.">
            <Input id="category-slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} maxLength={255} className="font-mono" />
          </Field>
          <Field label="Parent category" htmlFor="category-parent">
            <Select id="category-parent" value={form.parent_id} onChange={(event) => setForm((current) => ({ ...current, parent_id: event.target.value }))}>
              <option value="">None (root category)</option>
              {parentOptions.map(({ category, depth }) => <option key={category.id} value={category.id}>{'— '.repeat(depth)}{category.name}</option>)}
            </Select>
          </Field>
          <Field label="Description" htmlFor="category-description">
            <Textarea id="category-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <FormError message={formError} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete category"
        description={<>Delete <strong>{deleteTarget?.name}</strong>? Categories with products or child categories cannot be deleted.</>}
        confirmLabel="Delete category"
        destructive
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  )
}
