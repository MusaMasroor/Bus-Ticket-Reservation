const WINDOW_PREMIUM = 0.10; // 10% surcharge on window seats

/**
 * Calculate the price for a single seat.
 * @param {number} basePrice - Route base price
 * @param {'window'|'aisle'} seatType
 * @returns {number} final seat price (rounded to 2 decimal places)
 */
export const getSeatPrice = (basePrice, seatType) => {
  const multiplier = seatType === 'window' ? 1 + WINDOW_PREMIUM : 1;
  return Math.round(basePrice * multiplier * 100) / 100;
};

/**
 * Calculate total price for an array of selected seats.
 * @param {number} basePrice
 * @param {Array<{ seatNumber: string, type: string }>} seats
 * @returns {number}
 */
export const getTotalPrice = (basePrice, seats) =>
  seats.reduce((sum, seat) => sum + getSeatPrice(basePrice, seat.type), 0);
