import { useState, useEffect, useCallback } from 'react';
import { BookOpen, ChevronRight, Download, FileSpreadsheet } from 'lucide-react';

import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Badge }    from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/formatters';
import { generateTicket } from '@/utils/generateTicket';
import { exportCsv } from '@/utils/exportCsv';

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    pending:   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[status] ?? map.pending}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminBookings() {
  const user = useAuthStore((s) => s.user);

  const [bookings,   setBookings]   = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [filters,    setFilters]    = useState({
    status: 'all', dateFrom: '', dateTo: '',
  });

  const handleFilterChange = (field, value) => {
    setFilters((p) => ({ ...p, [field]: value }));
    setPage(1);
  };

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo)   params.set('dateTo', filters.dateTo);

      const { data } = await api.get(`/admin/bookings?${params}`);
      if (data.success) {
        setBookings(data.data);
        setPagination(data.pagination);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">All Bookings</h2>
          <p className="text-muted-foreground text-sm">{pagination.total} total bookings</p>
        </div>
        {bookings.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              const headers = ['Booking ID', 'Passenger', 'Email', 'Route', 'Date', 'Seats', 'Amount', 'Status', 'Booked At'];
              const rows = bookings.map((b) => [
                b._id,
                b.userId?.name ?? '',
                b.userId?.email ?? '',
                `${b.routeId?.source ?? ''} → ${b.routeId?.destination ?? ''}`,
                b.routeId?.date ?? '',
                (b.seatNumbers ?? []).join(', '),
                b.totalAmount,
                b.status,
                b.createdAt ? new Date(b.createdAt).toLocaleString() : '',
              ]);
              exportCsv('BusGo-Bookings.csv', headers, rows);
            }}
          >
            <FileSpreadsheet className="w-4 h-4" /> Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">From</span>
          <Input
            type="date"
            className="w-36 h-8 text-sm"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
          <span className="text-xs text-muted-foreground">To</span>
          <Input
            type="date"
            className="w-36 h-8 text-sm"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </div>

        {(filters.status !== 'all' || filters.dateFrom || filters.dateTo) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => { setFilters({ status: 'all', dateFrom: '', dateTo: '' }); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking ID</TableHead>
              <TableHead>Passenger</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Booked At</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => {
                const route = booking.routeId;
                return (
                  <TableRow key={booking._id}>
                    {/* ID */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {booking._id.slice(-8).toUpperCase()}
                    </TableCell>

                    {/* Passenger */}
                    <TableCell>
                      <div className="font-medium text-sm">{booking.userId?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{booking.userId?.email ?? ''}</div>
                    </TableCell>

                    {/* Route */}
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        {route?.source}
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        {route?.destination}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(route?.date)}</div>
                    </TableCell>

                    {/* Seats */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {booking.seatNumbers?.map((sn) => (
                          <Badge key={sn} variant="outline" className="text-xs py-0 px-1.5 h-4">
                            {sn}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="font-medium">{formatCurrency(booking.totalAmount)}</TableCell>

                    {/* Status */}
                    <TableCell><StatusBadge status={booking.status} /></TableCell>

                    {/* Booked at */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(booking.createdAt)}
                    </TableCell>

                    {/* Ticket download */}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 gap-1"
                        onClick={async () => generateTicket(booking, booking.userId ?? user)}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />
    </div>
  );
}
