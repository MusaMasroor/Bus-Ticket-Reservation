import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Lock, Bus, MapPin, ChevronRight, Clock,
  CheckCircle2, Download, LayoutDashboard, Loader2, AlertCircle,
} from 'lucide-react';

import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Badge }    from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import api              from '@/api/axios';
import useAuthStore     from '@/store/authStore';
import useBookingStore  from '@/store/bookingStore';
import { formatTime, formatDate, formatCurrency } from '@/utils/formatters';
import { generateTicket } from '@/utils/generateTicket';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCardNumber = (v) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const formatExpiry = (v) => {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

// ── Booking summary sidebar ────────────────────────────────────────────────────

function BookingSummary({ route, selectedSeats, totalPrice }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route */}
        <div>
          <div className="flex items-center gap-1 font-semibold">
            <MapPin className="w-4 h-4 text-primary" />
            {route.source}
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            {route.destination}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(route.departureTime)} → {formatTime(route.arrivalTime)}
            </span>
            <span>{formatDate(route.date)}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <Bus className="w-3.5 h-3.5" />
            {route.bus?.name} · {route.bus?.type}
          </div>
        </div>

        <div className="border-t" />

        {/* Seats */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selected Seats</p>
          {selectedSeats.map((seat) => (
            <div key={seat.seatNumber} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Seat {seat.seatNumber}</span>
                <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">{seat.type}</Badge>
              </div>
              <span className="text-muted-foreground">{formatCurrency(seat.price)}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(totalPrice)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Window seat premium included</p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded p-2">
          <Lock className="w-3 h-3 shrink-0" />
          Seats locked · expires in ~10 min
        </div>
      </CardContent>
    </Card>
  );
}

// ── Confirmation modal ────────────────────────────────────────────────────────

function ConfirmationDialog({ open, booking, user, onClose, onDashboard }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            Booking Confirmed!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking ID</span>
              <span className="font-mono font-medium text-xs">{booking?._id?.slice(-12).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Route</span>
              <span className="font-medium">
                {booking?.routeId?.source} → {booking?.routeId?.destination}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seats</span>
              <span className="font-medium">{booking?.seatNumbers?.join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-bold text-primary">{formatCurrency(booking?.totalAmount)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => generateTicket(booking, user)}
            >
              <Download className="w-4 h-4" /> Download Ticket
            </Button>
            <Button className="flex-1 gap-2" onClick={onDashboard}>
              <LayoutDashboard className="w-4 h-4" /> My Bookings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Checkout() {
  const navigate      = useNavigate();
  const user          = useAuthStore((s) => s.user);
  const selectedRoute = useBookingStore((s) => s.selectedRoute);
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const totalPrice    = useBookingStore((s) => s.totalPrice);
  const clearBooking  = useBookingStore((s) => s.clearBooking);

  const [payment, setPayment] = useState({ cardNumber: '', expiry: '', cvv: '', name: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Redirect if no booking in progress
  useEffect(() => {
    if (!selectedRoute || selectedSeats.length === 0) {
      navigate('/', { replace: true });
    }
  }, [selectedRoute, selectedSeats, navigate]);

  if (!selectedRoute || selectedSeats.length === 0) return null;

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;
    if (name === 'cardNumber') formatted = formatCardNumber(value);
    if (name === 'expiry')     formatted = formatExpiry(value);
    if (name === 'cvv')        formatted = value.replace(/\D/g, '').slice(0, 4);
    setPayment((p) => ({ ...p, [name]: formatted }));
    setErrors((p) => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!payment.name.trim())                              errs.name = 'Cardholder name is required.';
    if (payment.cardNumber.replace(/\s/g, '').length < 16) errs.cardNumber = 'Enter a valid 16-digit card number.';
    if (!/^\d{2}\/\d{2}$/.test(payment.expiry))            errs.expiry = 'Enter expiry as MM/YY.';
    if (payment.cvv.length < 3)                            errs.cvv = 'CVV must be 3–4 digits.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/bookings', {
        routeId:     selectedRoute._id,
        seatNumbers: selectedSeats.map((s) => s.seatNumber),
      });
      if (data.success) {
        setConfirmedBooking(data.data);
        setShowConfirm(true);
        clearBooking();
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Payment form ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Payment Details
                <span className="ml-auto text-xs text-muted-foreground font-normal">(Demo — no real charge)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {serverError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {serverError}
                  </div>
                )}

                {/* Cardholder name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Cardholder Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={payment.name}
                    onChange={handlePaymentChange}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                {/* Card number */}
                <div className="space-y-1.5">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <Input
                      id="cardNumber"
                      name="cardNumber"
                      placeholder="0000 0000 0000 0000"
                      inputMode="numeric"
                      value={payment.cardNumber}
                      onChange={handlePaymentChange}
                      className="pr-10"
                    />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  {errors.cardNumber && <p className="text-xs text-destructive">{errors.cardNumber}</p>}
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      name="expiry"
                      placeholder="MM/YY"
                      inputMode="numeric"
                      value={payment.expiry}
                      onChange={handlePaymentChange}
                    />
                    {errors.expiry && <p className="text-xs text-destructive">{errors.expiry}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cvv">CVV</Label>
                    <div className="relative">
                      <Input
                        id="cvv"
                        name="cvv"
                        placeholder="•••"
                        inputMode="numeric"
                        type="password"
                        value={payment.cvv}
                        onChange={handlePaymentChange}
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    {errors.cvv && <p className="text-xs text-destructive">{errors.cvv}</p>}
                  </div>
                </div>

                <Button type="submit" className="w-full mt-2 gap-2" size="lg" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Processing…' : `Pay ${formatCurrency(totalPrice)}`}
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  256-bit SSL encrypted · Demo mode
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Summary sidebar ───────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <BookingSummary
            route={selectedRoute}
            selectedSeats={selectedSeats}
            totalPrice={totalPrice}
          />
        </div>
      </div>

      {/* ── Confirmation modal ────────────────────────────────────────────── */}
      <ConfirmationDialog
        open={showConfirm}
        booking={confirmedBooking}
        user={user}
        onClose={() => setShowConfirm(false)}
        onDashboard={() => navigate('/dashboard')}
      />
    </div>
  );
}
