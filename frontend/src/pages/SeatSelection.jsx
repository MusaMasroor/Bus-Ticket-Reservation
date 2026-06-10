import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bus, MapPin, ChevronRight, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

import { Button }   from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge }    from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import api              from '@/api/axios';
import useBookingStore  from '@/store/bookingStore';
import { getSeatClasses, SEAT_LEGEND } from '@/utils/seatHelpers';
import { formatTime, formatCurrency, formatDate } from '@/utils/formatters';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Group flat seat array into rows keyed by the numeric prefix of seatNumber.
 * "1A" → row 1, "12B" → row 12
 */
function groupSeatsByRow(seats) {
  const map = new Map();
  for (const seat of seats) {
    const row = parseInt(seat.seatNumber, 10);
    if (!map.has(row)) map.set(row, []);
    map.get(row).push(seat);
  }
  for (const [, rowSeats] of map) {
    rowSeats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}

function splitRow(rowSeats) {
  return {
    left:  rowSeats.filter((s) => s.side === 'left'),
    right: rowSeats.filter((s) => s.side === 'right' || s.side === 'middle'),
  };
}

// ── Seat tile ─────────────────────────────────────────────────────────────────

function SeatTile({ seat, isSelected, onToggle }) {
  const status   = isSelected ? 'selected' : seat.status;
  const clickable = seat.status === 'available' || isSelected;

  return (
    <button
      className={`${getSeatClasses(status, clickable)} w-9 h-9 text-[10px]`}
      onClick={() => clickable && onToggle(seat)}
      disabled={!clickable}
      title={`${seat.seatNumber} — ${seat.type} — ${formatCurrency(seat.price)}`}
    >
      {seat.seatNumber}
    </button>
  );
}

// ── Bus grid ──────────────────────────────────────────────────────────────────

function BusGrid({ seats, selectedSeats, onToggle }) {
  const rowMap     = groupSeatsByRow(seats);
  const selectedSet = new Set(selectedSeats.map((s) => s.seatNumber));

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-[280px]">
        {/* Driver indicator */}
        <div className="flex justify-end pr-2 mb-3">
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex items-center gap-1">
            <Bus className="w-3.5 h-3.5" /> Driver
          </div>
        </div>

        {/* Seat rows */}
        <div className="space-y-1.5 border rounded-xl p-4 bg-muted/20">
          {[...rowMap.entries()].map(([rowNum, rowSeats]) => {
            const { left, right } = splitRow(rowSeats);
            return (
              <div key={rowNum} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{rowNum}</span>
                <div className="flex gap-1">
                  {left.map((seat) => (
                    <SeatTile
                      key={seat.seatNumber}
                      seat={seat}
                      isSelected={selectedSet.has(seat.seatNumber)}
                      onToggle={onToggle}
                    />
                  ))}
                </div>
                {/* Aisle gap */}
                <div className="w-6 shrink-0" />
                <div className="flex gap-1">
                  {right.map((seat) => (
                    <SeatTile
                      key={seat.seatNumber}
                      seat={seat}
                      isSelected={selectedSet.has(seat.seatNumber)}
                      onToggle={onToggle}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {SEAT_LEGEND.map(({ status, label, color }) => (
            <div key={status} className="flex items-center gap-1.5 text-xs">
              <div className={`w-4 h-4 rounded border ${color}`} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-4 h-4 rounded border bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700" />
            <span className="text-muted-foreground">Window (+10%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SeatSelection() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const setRoute       = useBookingStore((s) => s.setRoute);
  const toggleSeat     = useBookingStore((s) => s.toggleSeat);
  const setLockExpiry  = useBookingStore((s) => s.setLockExpiry);
  const selectedSeats  = useBookingStore((s) => s.selectedSeats);
  const totalPrice     = useBookingStore((s) => s.totalPrice);

  const [routeData, setRouteData] = useState(null);
  const [seats,     setSeats]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [locking,     setLocking]     = useState(false);
  const [lockError,   setLockError]   = useState('');
  const [lockWarning, setLockWarning] = useState('');

  const [seatChange, setSeatChange] = useState('');

  const fetchSeatData = useCallback(async (isInitial = false) => {
    if (isInitial) { setLoading(true); setError(''); }
    try {
      const { data } = await api.get(`/routes/${id}/seats`);
      if (data.success) {
        if (isInitial) {
          setRouteData(data.data.route);
          setRoute(data.data.route);
        }
        setSeats(data.data.seats);
        return data.data.seats;
      }
    } catch (err) {
      if (isInitial) setError(err.response?.data?.message || 'Failed to load seat layout.');
    } finally {
      if (isInitial) setLoading(false);
    }
    return null;
  }, [id, setRoute]);

  // Initial fetch
  useEffect(() => { fetchSeatData(true); }, [fetchSeatData]);

  // Poll every 15 seconds for real-time seat updates
  useEffect(() => {
    if (loading || error) return;

    const interval = setInterval(async () => {
      const freshSeats = await fetchSeatData(false);
      if (!freshSeats) return;

      // Check if any selected seats were taken by someone else
      const { selectedSeats: current, toggleSeat: toggle } = useBookingStore.getState();
      const unavailable = current.filter((sel) => {
        const fresh = freshSeats.find((s) => s.seatNumber === sel.seatNumber);
        return fresh && (fresh.status === 'booked' || fresh.status === 'locked');
      });
      if (unavailable.length > 0) {
        unavailable.forEach((s) => toggle(s));
        setSeatChange(`Seat${unavailable.length > 1 ? 's' : ''} ${unavailable.map((s) => s.seatNumber).join(', ')} became unavailable`);
        setTimeout(() => setSeatChange(''), 4000);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [loading, error, fetchSeatData]);

  const handleProceed = async () => {
    if (selectedSeats.length === 0) return;
    setLocking(true);
    setLockError('');
    setLockWarning('');
    try {
      const requested = selectedSeats.map((s) => s.seatNumber).sort();
      const { data } = await api.post(`/routes/${id}/seats/lock`, {
        seatNumbers: requested,
      });
      const locked = (data.data?.seatNumbers ?? []).slice().sort();
      const sameSelection =
        locked.length === requested.length &&
        locked.every((s, i) => s === requested[i]);
      if (!sameSelection) {
        setLockWarning('Your previous seat selection in another tab has been replaced.');
      }
      if (data.data?.lockedUntil) {
        setLockExpiry(data.data.lockedUntil);
      }
      navigate('/checkout');
    } catch (err) {
      setLockError(err.response?.data?.message || 'Failed to lock seats. Please try again.');
    } finally {
      setLocking(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-7 w-64 mb-2" />
        <Skeleton className="h-4 w-40 mb-8" />
        <div className="flex gap-6 flex-col lg:flex-row">
          <Skeleton className="flex-1 h-96 rounded-xl" />
          <Skeleton className="w-full lg:w-72 h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3 opacity-60" />
        <p className="font-semibold text-lg mb-1">Something went wrong</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const busTypeColor = {
    AC:       'bg-blue-100 text-blue-700',
    'Non-AC': 'bg-gray-100 text-gray-700',
    Sleeper:  'bg-purple-100 text-purple-700',
    Seater:   'bg-green-100 text-green-700',
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      {/* Route header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {routeData?.source}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            {routeData?.destination}
          </h1>
          {routeData?.bus?.type && (
            <Badge className={busTypeColor[routeData.bus.type]}>
              {routeData.bus.type}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(routeData?.departureTime)} → {formatTime(routeData?.arrivalTime)}
          </span>
          <span>{formatDate(routeData?.date)}</span>
          <span className="flex items-center gap-1">
            <Bus className="w-3.5 h-3.5" />
            {routeData?.bus?.name} ({routeData?.bus?.busNumber})
          </span>
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* ── Bus grid ──────────────────────────────────────────────────── */}
        <div className="flex-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Choose Your Seats</CardTitle>
              <p className="text-xs text-muted-foreground">Click an available seat to select it</p>
            </CardHeader>
            <CardContent>
              <BusGrid seats={seats} selectedSeats={selectedSeats} onToggle={toggleSeat} />
            </CardContent>
          </Card>
        </div>

        {/* ── Booking sidebar ────────────────────────────────────────────── */}
        <div className="w-full lg:w-72 shrink-0">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSeats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No seats selected yet
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {selectedSeats.map((seat) => (
                      <div key={seat.seatNumber} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Seat {seat.seatNumber}</span>
                          <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">
                            {seat.type}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground">{formatCurrency(seat.price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary text-lg">{formatCurrency(totalPrice)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} · Window seats +10%
                    </p>
                  </div>
                </>
              )}

              {lockWarning && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  {lockWarning}
                </div>
              )}

              {lockError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                  {lockError}
                </div>
              )}

              {seatChange && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5 animate-fade-in">
                  <RefreshCw className="w-3 h-3 shrink-0" />
                  {seatChange}
                </div>
              )}

              <Button
                className="w-full"
                disabled={selectedSeats.length === 0 || locking}
                onClick={handleProceed}
              >
                {locking && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                {locking ? 'Locking seats…' : 'Proceed to Checkout'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Seats are held for 10 minutes after locking
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
