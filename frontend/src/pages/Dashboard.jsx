import { useState, useEffect, useCallback } from 'react';
import {
  Bus, MapPin, ChevronRight, Clock, Download, X,
  Loader2, AlertCircle, Ticket,
} from 'lucide-react';

import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

import api             from '@/api/axios';
import useAuthStore    from '@/store/authStore';
import { formatDate, formatTime, formatCurrency, formatDateTime } from '@/utils/formatters';
import { generateTicket } from '@/utils/generateTicket';

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    pending:   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${map[status] ?? map.pending}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({ booking, user, onCancelClick }) {
  const route = booking.routeId;
  const bus   = route?.busId;
  const isPast = booking.status === 'cancelled' ||
    (route?.departureTime && new Date(route.departureTime) <= new Date());
  const canCancel = booking.status === 'confirmed' && !isPast;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Route info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                {route?.source}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                {route?.destination}
              </span>
              <StatusBadge status={booking.status} />
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(route?.departureTime)} → {formatTime(route?.arrivalTime)}
              </span>
              <span>{formatDate(route?.date)}</span>
              {bus && (
                <span className="flex items-center gap-1">
                  <Bus className="w-3.5 h-3.5" />
                  {bus.name} · {bus.type}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {booking.seatNumbers?.map((sn) => (
                <Badge key={sn} variant="outline" className="text-xs">
                  Seat {sn}
                </Badge>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Booked {formatDateTime(booking.createdAt)}
            </p>
          </div>

          {/* Amount + actions */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total Paid</div>
              <div className="text-lg font-bold text-primary">
                {formatCurrency(booking.totalAmount)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={async () => generateTicket(booking, user)}
              >
                <Download className="w-3.5 h-3.5" />
                Ticket
              </Button>
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => onCancelClick(booking)}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function BookingSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Cancel dialog ─────────────────────────────────────────────────────────────

function CancelDialog({ booking, open, onClose, onConfirm, loading }) {
  const route = booking?.routeId;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your booking for{' '}
            <strong>{route?.source} → {route?.destination}</strong> on{' '}
            <strong>{formatDate(route?.date)}</strong>?
            <br /><br />
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Keep Booking
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-2"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Cancelling…' : 'Yes, Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [cancelTarget,   setCancelTarget]   = useState(null);
  const [cancelLoading,  setCancelLoading]  = useState(false);
  const [cancelError,    setCancelError]    = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/bookings/my?limit=50');
      setBookings(data.success ? data.data : []);
    } catch {
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      await api.put(`/bookings/${cancelTarget._id}/cancel`);
      setCancelTarget(null);
      fetchBookings();
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Cancellation failed.');
    } finally {
      setCancelLoading(false);
    }
  };

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.routeId?.departureTime) > now
  );
  const past = bookings.filter(
    (b) => b.status === 'cancelled' || new Date(b.routeId?.departureTime) <= now
  );

  // ── Empty state ──────────────────────────────────────────────────────────

  const EmptyState = ({ message }) => (
    <div className="text-center py-16">
      <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
      <p className="font-medium text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Welcome back, {user?.name?.split(' ')[0]}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">
            Upcoming
            {!loading && upcoming.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {upcoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past & Cancelled</TabsTrigger>
        </TabsList>

        {/* ── Upcoming tab ─────────────────────────────────────────────── */}
        <TabsContent value="upcoming">
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <BookingSkeleton key={i} />)
            ) : upcoming.length === 0 ? (
              <EmptyState message="No upcoming trips. Book your first bus ticket!" />
            ) : (
              upcoming.map((b) => (
                <BookingCard
                  key={b._id}
                  booking={b}
                  user={user}
                  onCancelClick={setCancelTarget}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* ── Past tab ─────────────────────────────────────────────────── */}
        <TabsContent value="past">
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <BookingSkeleton key={i} />)
            ) : past.length === 0 ? (
              <EmptyState message="No past trips yet." />
            ) : (
              past.map((b) => (
                <BookingCard
                  key={b._id}
                  booking={b}
                  user={user}
                  onCancelClick={setCancelTarget}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Cancel dialog */}
      {cancelError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm shadow-lg">
          {cancelError}
        </div>
      )}
      <CancelDialog
        booking={cancelTarget}
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelError(''); }}
        onConfirm={handleCancelConfirm}
        loading={cancelLoading}
      />
    </div>
  );
}
