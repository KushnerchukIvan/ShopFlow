import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Badge, Button, DataTable, EmptyState, Field, Input, Pagination, type Column } from './components/ui'
import type { PaginationMeta } from './types'

afterEach(() => cleanup())

describe('shared UI components', () => {
  it('renders a button and blocks interaction while loading', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<Button onClick={onClick}>Save product</Button>)

    await user.click(screen.getByRole('button', { name: 'Save product' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(<Button onClick={onClick} loading>Save product</Button>)
    await user.click(screen.getByRole('button', { name: 'Save product' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders field labels, hints, and validation errors', () => {
    render(
      <Field label="SKU" htmlFor="sku" hint="Unique code" error="The SKU has already been taken." required>
        <Input id="sku" />
      </Field>,
    )

    expect(screen.getByLabelText(/SKU/)).toBeInTheDocument()
    expect(screen.getByText('The SKU has already been taken.')).toBeInTheDocument()
    expect(screen.queryByText('Unique code')).not.toBeInTheDocument()
  })

  it('renders semantic status badges', () => {
    render(<Badge tone="amber">Low stock</Badge>)
    expect(screen.getByText('Low stock')).toBeInTheDocument()
  })

  it('renders an empty state when a table has no rows', () => {
    const columns: Column<{ id: number; name: string }>[] = [{ key: 'name', header: 'Name', cell: (row) => row.name }]
    render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.id} emptyTitle="No products found" emptyDescription="Try another search." />)

    expect(screen.getByText('No products found')).toBeInTheDocument()
    expect(screen.getByText('Try another search.')).toBeInTheDocument()
  })

  it('renders table rows', () => {
    const columns: Column<{ id: number; name: string }>[] = [{ key: 'name', header: 'Name', cell: (row) => row.name }]
    render(<DataTable columns={columns} rows={[{ id: 1, name: 'Desk lamp' }]} rowKey={(row) => row.id} />)

    expect(screen.getByText('Desk lamp')).toBeInTheDocument()
  })

  it('paginates with the correct range and next-page callback', async () => {
    const user = userEvent.setup()
    const meta: PaginationMeta = { current_page: 2, last_page: 5, per_page: 10, total: 42 }
    const onPageChange = vi.fn()
    render(<Pagination meta={meta} onPageChange={onPageChange} />)

    expect(screen.getByText('11–20')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onSort when a sortable table header is clicked', async () => {
    const user = userEvent.setup()
    const columns: Column<{ id: number; name: string }>[] = [{ key: 'name', header: 'Name', sortable: 'name', cell: (row) => row.name }]
    const onSort = vi.fn()
    render(<DataTable columns={columns} rows={[{ id: 1, name: 'Desk lamp' }]} rowKey={(row) => row.id} sortBy="name" sortDirection="asc" onSort={onSort} />)

    await user.click(screen.getByRole('button', { name: /Name/ }))
    expect(onSort).toHaveBeenCalledWith('name')
  })

  it('renders empty state actions', () => {
    render(<EmptyState title="Nothing yet" description="Create the first record." action={<Button>Create</Button>} />)
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })
})
