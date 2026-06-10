import { create } from 'zustand';

const WINDOW_PREMIUM = 0.10;

const getSeatPrice = (basePrice, seatType) => {
  const multiplier = seatType === 'window' ? 1 + WINDOW_PREMIUM : 1;
  return Math.round(basePrice * multiplier * 100) / 100;
};

const useBookingStore = create((set, get) => ({
  selectedRoute: null,
  selectedSeats: [],
  totalPrice: 0,
  lockExpiresAt: null,

  setRoute: (route) => set({ selectedRoute: route, selectedSeats: [], totalPrice: 0, lockExpiresAt: null }),

  setLockExpiry: (expiresAt) => set({ lockExpiresAt: expiresAt }),

  toggleSeat: (seat) => {
    const { selectedSeats, selectedRoute } = get();
    const exists = selectedSeats.some((s) => s.seatNumber === seat.seatNumber);
    const updated = exists
      ? selectedSeats.filter((s) => s.seatNumber !== seat.seatNumber)
      : [...selectedSeats, seat];

    const basePrice = selectedRoute?.basePrice ?? 0;
    const total = updated.reduce((sum, s) => sum + getSeatPrice(basePrice, s.type), 0);

    set({ selectedSeats: updated, totalPrice: Math.round(total * 100) / 100 });
  },

  clearBooking: () => set({ selectedRoute: null, selectedSeats: [], totalPrice: 0, lockExpiresAt: null }),
}));

export default useBookingStore;
