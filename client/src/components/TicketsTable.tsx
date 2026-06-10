import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react'
import { TicketStatus, TicketCategory } from '@helpdesk/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export interface Ticket {
  id: string
  subject: string
  status: TicketStatus
  category: TicketCategory
  fromEmail: string
  fromName: string | null
  assignedTo: string | null
  createdAt: string
  assignedUser: { name: string } | null
}

export interface TicketFilters {
  status?: TicketStatus
  category?: TicketCategory
  search?: string
}

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const STATUS_VARIANT: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  [TicketStatus.OPEN]: 'default',
  [TicketStatus.RESOLVED]: 'secondary',
  [TicketStatus.CLOSED]: 'outline',
}

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General Question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical Question',
  [TicketCategory.REFUND_REQUEST]: 'Refund Request',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp className="h-3 w-3" />
  if (direction === 'desc') return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-40" />
}

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: 'subject',
    header: 'Subject',
    enableSorting: true,
    cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
  },
  {
    accessorKey: 'fromEmail',
    header: 'From',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.fromName ? (
        <>
          <span className="text-foreground">{row.original.fromName}</span>
          <span className="block text-xs">{row.original.fromEmail}</span>
        </>
      ) : (
        row.original.fromEmail
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
    header: 'Assigned to',
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
      <span className="text-muted-foreground text-sm">{formatDate(getValue() as string)}</span>
    ),
  },
]

export function useTickets(sorting: SortingState = [], filters: TicketFilters = {}) {
  const sortBy  = sorting[0]?.id ?? 'createdAt'
  const sortDir = sorting[0]?.desc === false ? 'asc' : 'desc'

  return useQuery({
    queryKey: ['tickets', sortBy, sortDir, filters.status, filters.category, filters.search],
    queryFn: () =>
      axios
        .get<Ticket[]>('/api/tickets', {
          params: {
            sortBy,
            sortDir,
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
  const [sorting, setSorting]     = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [filters, setFilters]     = useState<TicketFilters>({})
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput)
  const activeFilters = { ...filters, search: debouncedSearch || undefined }
  const { data: tickets = [], isLoading, error } = useTickets(sorting, activeFilters)

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="text-base font-semibold">All tickets</CardTitle>
        <div className="flex items-center gap-2">
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
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
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
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
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
          <Table>
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
        )}
      </CardContent>
    </Card>
  )
}
