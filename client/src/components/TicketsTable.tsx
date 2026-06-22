import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { TicketStatus, TicketCategory } from '@helpdesk/core'
import { type Ticket, type TicketPage, type TicketFilters, STATUS_VARIANT, CATEGORY_LABEL, formatDate } from '@/lib/tickets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type { Ticket, TicketPage, TicketFilters }

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc')  return <ArrowUp   className="h-3 w-3" />
  if (direction === 'desc') return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-40" />
}

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: 'subject',
    header: 'Subject',
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.subject}
      </Link>
    ),
  },
  {
    accessorKey: 'fromEmail',
    header: 'From',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.fromName ? (
        <>
          <span className="text-foreground">{row.original.fromName}</span>
          <span className="block text-xs font-mono text-muted-foreground">{row.original.fromEmail}</span>
        </>
      ) : (
        <span className="font-mono text-sm">{row.original.fromEmail}</span>
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
    cell: ({ getValue }) => {
      const status = getValue() as TicketStatus
      return (
        <Badge variant={STATUS_VARIANT[status]}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-sm">{CATEGORY_LABEL[getValue() as TicketCategory]}</span>
    ),
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned To',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.assignedUser?.name ?? <span className="italic">Unassigned</span>}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-sm font-mono tabular-nums">{formatDate(getValue() as string)}</span>
    ),
  },
]

export function useTickets(
  sorting: SortingState = [],
  filters: TicketFilters = {},
  pagination: PaginationState = { pageIndex: 0, pageSize: 10 },
) {
  const sortBy  = sorting[0]?.id ?? 'createdAt'
  const sortDir = sorting[0]?.desc === false ? 'asc' : 'desc'

  return useQuery({
    queryKey: ['tickets', sortBy, sortDir, filters.status, filters.category, filters.search, pagination.pageIndex, pagination.pageSize],
    placeholderData: (prev) => prev,
    queryFn: () =>
      axios
        .get<TicketPage>('/api/tickets', {
          params: {
            sortBy,
            sortDir,
            page: pagination.pageIndex + 1,
            pageSize: pagination.pageSize,
            ...(filters.status   ? { status: filters.status }     : {}),
            ...(filters.category ? { category: filters.category } : {}),
            ...(filters.search   ? { search: filters.search }     : {}),
          },
          withCredentials: true,
        })
        .then((r) => r.data),
  })
}

export default function TicketsTable() {
  const [sorting,    setSorting]    = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [filters,    setFilters]    = useState<TicketFilters>({})
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput)

  // Reset to page 1 whenever filters or search change
  useEffect(() => { setPagination((p) => ({ ...p, pageIndex: 0 })) }, [filters, debouncedSearch])

  const activeFilters = { ...filters, search: debouncedSearch || undefined }
  const { data, isLoading, isFetching, isPlaceholderData, error } = useTickets(sorting, activeFilters, pagination)

  const tickets    = data?.data ?? []
  const pageCount  = data?.pageCount ?? 1
  const total      = data?.total ?? 0

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting, pagination },
    onSortingChange: (next) => {
      setSorting(next)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    },
    onPaginationChange: setPagination,
    manualSorting: true,
    manualPagination: true,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="text-base font-semibold">All tickets</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tickets…"
              className="h-8 w-52 pl-8 text-xs"
            />
          </div>

          <Select
            value={filters.status ?? 'all'}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, status: v === 'all' ? undefined : (v as TicketStatus) }))
            }
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
              <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
              <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.category ?? 'all'}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, category: v === 'all' ? undefined : (v as TicketCategory) }))
            }
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value={TicketCategory.GENERAL_QUESTION}>General Question</SelectItem>
              <SelectItem value={TicketCategory.TECHNICAL_QUESTION}>Technical Question</SelectItem>
              <SelectItem value={TicketCategory.REFUND_REQUEST}>Refund Request</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground px-6 py-8">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive px-6 py-8">{(error as Error).message}</p>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium">No tickets found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting the filters.</p>
          </div>
        ) : (
          <>
            <Table className={isFetching && isPlaceholderData ? 'opacity-60 pointer-events-none' : undefined}>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.column.getCanSort() ? (
                          <button
                            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon direction={header.column.getIsSorted()} />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <span>
                {total} ticket{total !== 1 ? 's' : ''} · page {pagination.pageIndex + 1} of {pageCount}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
