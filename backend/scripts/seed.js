import 'dotenv/config';
import mongoose from 'mongoose';
import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate a seat layout. Uses 4 cols if totalSeats divisible by 4, else 5 cols.
 * Seat numbering: 1A, 1B, ..., 10D
 * type: first and last col = 'window', middle cols = 'aisle'
 * side: left half = 'left', right half = 'right'
 */
function generateSeatLayout(totalSeats) {
  const cols = totalSeats % 4 === 0 ? 4 : 5;
  const colLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, cols);
  const rows = Math.ceil(totalSeats / cols);
  const seats = [];
  let count = 0;
  for (let r = 1; r <= rows && count < totalSeats; r++) {
    for (let c = 0; c < cols && count < totalSeats; c++) {
      const type = (c === 0 || c === cols - 1) ? 'window' : 'aisle';
      const side = c < Math.floor(cols / 2) ? 'left' : 'right';
      seats.push({ seatNumber: `${r}${colLetters[c]}`, type, side });
      count++;
    }
  }
  return { rows, cols, seats };
}

/**
 * Return a Date object for today + offsetDays at the given UTC hour:minute.
 * Base date: Dynamic based on current execution time.
 */
function makeDateTime(offsetDays, hour, minute) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

/** Return 'YYYY-MM-DD' for today + offsetDays (UTC). */
function makeDate(offsetDays) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// ── Bus definitions ───────────────────────────────────────────────────────────

const busDefs = [
  { name: 'Daewoo Express', busNumber: 'DW-001', type: 'AC', totalSeats: 40 },
  { name: 'Faisal Movers', busNumber: 'FM-002', type: 'Non-AC', totalSeats: 45 },
  { name: 'Kohistan Express', busNumber: 'KE-003', type: 'Sleeper', totalSeats: 36 },
  { name: 'Bilal Travels', busNumber: 'BT-004', type: 'Seater', totalSeats: 50 },
  { name: 'Skyways', busNumber: 'SW-005', type: 'AC', totalSeats: 40 },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data (preserve Users)
  await Promise.all([
    Bus.deleteMany({}),
    Route.deleteMany({}),
    Booking.deleteMany({}),
  ]);
  console.log('Cleared Buses, Routes, Bookings');

  // ── Create Buses ────────────────────────────────────────────────────────────
  const buses = await Bus.insertMany(
    busDefs.map(({ name, busNumber, type, totalSeats }) => ({
      name,
      busNumber,
      type,
      totalSeats,
      seatLayout: generateSeatLayout(totalSeats),
    }))
  );
  console.log(`Created ${buses.length} buses`);

  const [daewoo, faisal, kohistan, bilal, skyways] = buses;

  // ── Create Routes ────────────────────────────────────────────────────────────
  const routeDefs = [
    {
      busId: daewoo._id,
      source: 'Karachi', destination: 'Lahore',
      basePrice: 3500,
      departureTime: makeDateTime(1, 8, 0),
      arrivalTime: makeDateTime(1, 22, 0),
      date: makeDate(1),
      totalSeats: daewoo.totalSeats,
      stops: [
        { city: 'Hyderabad', arrivalTime: '09:30', departureTime: '09:45' },
        { city: 'Multan', arrivalTime: '16:00', departureTime: '16:30' },
      ],
    },
    {
      busId: faisal._id,
      source: 'Karachi', destination: 'Islamabad',
      basePrice: 4200,
      departureTime: makeDateTime(2, 7, 0),
      arrivalTime: makeDateTime(2, 23, 0),
      date: makeDate(2),
      totalSeats: faisal.totalSeats,
      stops: [
        { city: 'Hyderabad', arrivalTime: '08:30', departureTime: '08:45' },
        { city: 'Multan', arrivalTime: '15:00', departureTime: '15:30' },
        { city: 'Lahore', arrivalTime: '20:00', departureTime: '20:30' },
      ],
    },
    {
      busId: kohistan._id,
      source: 'Lahore', destination: 'Islamabad',
      basePrice: 1200,
      departureTime: makeDateTime(3, 9, 0),
      arrivalTime: makeDateTime(3, 14, 0),
      date: makeDate(3),
      totalSeats: kohistan.totalSeats,
      stops: [
        { city: 'Gujranwala', arrivalTime: '09:45', departureTime: '10:00' },
      ],
    },
    {
      busId: bilal._id,
      source: 'Islamabad', destination: 'Peshawar',
      basePrice: 800,
      departureTime: makeDateTime(4, 10, 0),
      arrivalTime: makeDateTime(4, 12, 0),
      date: makeDate(4),
      totalSeats: bilal.totalSeats,
      stops: [
        { city: 'Nowshera', arrivalTime: '11:30', departureTime: '11:40' },
      ],
    },
    {
      busId: skyways._id,
      source: 'Lahore', destination: 'Multan',
      basePrice: 1000,
      departureTime: makeDateTime(5, 6, 0),
      arrivalTime: makeDateTime(5, 11, 0),
      date: makeDate(5),
      totalSeats: skyways.totalSeats,
      stops: [
        { city: 'Sahiwal', arrivalTime: '08:30', departureTime: '08:45' },
      ],
    },
    {
      busId: daewoo._id,
      source: 'Karachi', destination: 'Hyderabad',
      basePrice: 600,
      departureTime: makeDateTime(7, 8, 0),
      arrivalTime: makeDateTime(7, 11, 0),
      date: makeDate(7),
      totalSeats: daewoo.totalSeats,
      stops: [
        { city: 'Thatta', arrivalTime: '09:15', departureTime: '09:25' },
      ],
    },
    {
      busId: faisal._id,
      source: 'Multan', destination: 'Lahore',
      basePrice: 950,
      departureTime: makeDateTime(10, 14, 0),
      arrivalTime: makeDateTime(10, 19, 0),
      date: makeDate(10),
      totalSeats: faisal.totalSeats,
      stops: [
        { city: 'Sahiwal', arrivalTime: '16:30', departureTime: '16:45' },
      ],
    },
    {
      busId: kohistan._id,
      source: 'Islamabad', destination: 'Lahore',
      basePrice: 1200,
      departureTime: makeDateTime(14, 15, 0),
      arrivalTime: makeDateTime(14, 20, 0),
      date: makeDate(14),
      totalSeats: kohistan.totalSeats,
      stops: [
        { city: 'Gujranwala', arrivalTime: '19:30', departureTime: '19:40' },
      ],
    },
  ];

  const routes = await Route.insertMany(routeDefs);
  console.log(`Created ${routes.length} routes`);

  // ── Create Sample Bookings ──────────────────────────────────────────────────
  const users = await User.find({}).limit(2).lean();
  if (users.length === 0) {
    console.log('No users found — skipping booking seed.');
  } else {
    const bookingDefs = [];

    if (users[0]) {
      bookingDefs.push({
        userId: users[0]._id,
        routeId: routes[0]._id,
        seatNumbers: ['1A', '1B'],
        totalAmount: 3500 * 2,
        status: 'confirmed',
        paymentId: `PAY-SEED-${Date.now()}-1`,
      });
    }

    if (users[1]) {
      bookingDefs.push({
        userId: users[1]._id,
        routeId: routes[1]._id,
        seatNumbers: ['2A'],
        totalAmount: 4200,
        status: 'confirmed',
        paymentId: `PAY-SEED-${Date.now()}-2`,
      });
    }

    await Booking.insertMany(bookingDefs);
    console.log(`Created ${bookingDefs.length} sample booking(s)`);
  }

  console.log('Seed complete!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
