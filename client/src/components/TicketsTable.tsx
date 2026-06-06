import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TicketStatus, TicketCategory } from '@helpdesk/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export function useTickets(sorting: SortingState = []) {
  const sortBy = sorting[0]?.id ?? 'createdAt'
  const sortDir = sorting[0]?.desc === false ? 'asc' : 'desc'

  return useQuery({
    queryKey: ['tickets', sortBy, sortDir],
    queryFn: () =>
      axios
        .get<Ticket[]>('/api/tickets', { params: { sortBy, sortDir }, withCredentials: true })
        .then((r) => r.data),
  })
}

export default function TicketsTable() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const { data: tickets = [], isLoading, error } = useTickets(sorting)

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
      <CardHeader>
        <CardTitle className="text-base font-semibold">All tickets</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground px-6 py-8">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive px-6 py-8">{(error as Error).message}</p>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium">No tickets yet</p>
            <p className="text-sm text-muted-foreground mt-1">Tickets will appear here once emails come in.</p>
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
