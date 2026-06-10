/**
 * SEED SCRIPT — Smart Route Recommendation Demo Data
 * ====================================================
 * Populates the database with realistic data to demonstrate the AI-powered
 * recommendation engine during a live demo.
 *
 * Creates:
 *   - 1 demo user (demo@busgo.com / demo123)
 *   - 6 buses with seat layouts
 *   - 18 future routes across 6 city pairs (spanning next 7 days)
 *   - ~50 mock bookings (varied popularity distribution)
 *   - 8 bookings for the demo user (to show personalized recommendations)
 *
 * Usage: node scripts/seedRecommendationData.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import readline from 'readline';
import User from '../models/User.js';
import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import Booking from '../models/Booking.js';
import SeatLock from '../models/SeatLock.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateSeatLayout(totalSeats) {
  const cols = totalSeats % 4 === 0 ? 4 : 5;
  const colLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, cols);
  const rows = Math.ceil(totalSeats / cols);
  const seats = [];
  let count = 0;
  for (let r = 1; r <= rows && count < totalSeats; r++) {
    for (let c = 0; c < cols && count < totalSeats; c++) {
      const type = c === 0 || c === cols - 1 ? 'window' : 'aisle';
      const side = c < Math.floor(cols / 2) ? 'left' : 'right';
      seats.push({ seatNumber: `${r}${colLetters[c]}`, type, side });
      count++;
    }
  }
  return { rows, cols, seats };
}

function makeDateTime(offsetDays, hour, minute = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function makeDate(offsetDays) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// ── Main seed function ────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const proceed = await confirm(
    '⚠️  This will clear all Buses, Routes, Bookings, and SeatLocks.\n' +
    '   Existing users will be preserved.\n' +
    '   Continue? (y/N): '
  );
  if (!proceed) {
    console.log('Aborted.');
    await mongoose.disconnect();
    return;
  }

  // ── Clear existing test data ──────────────────────────────────────────────
  await Promise.all([
    Bus.deleteMany({}),
    Route.deleteMany({}),
    Booking.deleteMany({}),
    SeatLock.deleteMany({}),
  ]);
  console.log('\n✓ Cleared Buses, Routes, Bookings, SeatLocks');

  // ── Create demo user ──────────────────────────────────────────────────────
  let demoUser = await User.findOne({ email: 'demo@busgo.com' });
  if (!demoUser) {
    demoUser = await User.create({
      name: 'Demo User',
      email: 'demo@busgo.com',
      password: 'demo123',
      role: 'user',
    });
    console.log('✓ Created demo user (demo@busgo.com / demo123)');
  } else {
    console.log('✓ Demo user already exists (demo@busgo.com)');
  }

  // Create a few extra mock users for diverse bookings
  const mockUsers = [];
  for (let i = 1; i <= 5; i++) {
    let u = await User.findOne({ email: `testuser${i}@busgo.com` });
    if (!u) {
      u = await User.create({
        name: `Test User ${i}`,
        email: `testuser${i}@busgo.com`,
        password: 'test123',
        role: 'user',
      });
    }
    mockUsers.push(u);
  }
  console.log(`✓ Ensured ${mockUsers.length} mock users exist`);

  // ── Create Buses ──────────────────────────────────────────────────────────
  const busDefs = [
    { name: 'Daewoo Express', busNumber: 'DW-101', type: 'AC', totalSeats: 40 },
    { name: 'Faisal Movers', busNumber: 'FM-202', type: 'Non-AC', totalSeats: 45 },
    { name: 'Kohistan Express', busNumber: 'KE-303', type: 'Sleeper', totalSeats: 36 },
    { name: 'Bilal Travels', busNumber: 'BT-404', type: 'Seater', totalSeats: 50 },
    { name: 'Skyways', busNumber: 'SW-505', type: 'AC', totalSeats: 40 },
    { name: 'Niazi Express', busNumber: 'NE-606', type: 'Sleeper', totalSeats: 36 },
  ];

  const buses = await Bus.insertMany(
    busDefs.map((b) => ({ ...b, seatLayout: generateSeatLayout(b.totalSeats) }))
  );
  console.log(`✓ Created ${buses.length} buses`);

  const [daewoo, faisal, kohistan, bilal, skyways, niazi] = buses;

  // ── Create Routes (18 routes, 6 city pairs, next 7 days) ─────────────────
  const routeDefs = [
    // Karachi → Lahore (VERY popular — will be top recommendation)
    { busId: daewoo._id, source: 'Karachi', destination: 'Lahore', basePrice: 3500, depOffset: 0, depHour: 20, arrHour: 10, arrDayExtra: 1, stops: [{ city: 'Hyderabad', arrivalTime: '21:30', departureTime: '21:45' }, { city: 'Multan', arrivalTime: '04:00', departureTime: '04:30' }] },
    { busId: faisal._id, source: 'Karachi', destination: 'Lahore', basePrice: 2800, depOffset: 1, depHour: 8, arrHour: 22, arrDayExtra: 0, stops: [{ city: 'Hyderabad', arrivalTime: '09:30', departureTime: '09:45' }] },
    { busId: skyways._id, source: 'Karachi', destination: 'Lahore', basePrice: 4000, depOffset: 2, depHour: 18, arrHour: 8, arrDayExtra: 1, stops: [] },

    // Lahore → Islamabad (popular)
    { busId: kohistan._id, source: 'Lahore', destination: 'Islamabad', basePrice: 1200, depOffset: 0, depHour: 9, arrHour: 14, arrDayExtra: 0, stops: [{ city: 'Gujranwala', arrivalTime: '09:45', departureTime: '10:00' }] },
    { busId: daewoo._id, source: 'Lahore', destination: 'Islamabad', basePrice: 1500, depOffset: 1, depHour: 14, arrHour: 19, arrDayExtra: 0, stops: [] },
    { busId: bilal._id, source: 'Lahore', destination: 'Islamabad', basePrice: 900, depOffset: 3, depHour: 6, arrHour: 11, arrDayExtra: 0, stops: [{ city: 'Gujranwala', arrivalTime: '06:45', departureTime: '07:00' }, { city: 'Jhelum', arrivalTime: '09:00', departureTime: '09:15' }] },

    // Islamabad → Peshawar (moderate)
    { busId: niazi._id, source: 'Islamabad', destination: 'Peshawar', basePrice: 800, depOffset: 1, depHour: 10, arrHour: 12, arrDayExtra: 0, stops: [{ city: 'Nowshera', arrivalTime: '11:30', departureTime: '11:40' }] },
    { busId: bilal._id, source: 'Islamabad', destination: 'Peshawar', basePrice: 650, depOffset: 3, depHour: 16, arrHour: 18, arrDayExtra: 0, stops: [] },
    { busId: faisal._id, source: 'Islamabad', destination: 'Peshawar', basePrice: 750, depOffset: 5, depHour: 7, arrHour: 9, arrDayExtra: 0, stops: [] },

    // Karachi → Hyderabad (frequent short trip)
    { busId: daewoo._id, source: 'Karachi', destination: 'Hyderabad', basePrice: 600, depOffset: 0, depHour: 14, arrHour: 17, arrDayExtra: 0, stops: [] },
    { busId: faisal._id, source: 'Karachi', destination: 'Hyderabad', basePrice: 450, depOffset: 2, depHour: 10, arrHour: 13, arrDayExtra: 0, stops: [{ city: 'Thatta', arrivalTime: '11:15', departureTime: '11:25' }] },
    { busId: bilal._id, source: 'Karachi', destination: 'Hyderabad', basePrice: 500, depOffset: 4, depHour: 18, arrHour: 21, arrDayExtra: 0, stops: [] },

    // Lahore → Multan (moderate)
    { busId: skyways._id, source: 'Lahore', destination: 'Multan', basePrice: 1000, depOffset: 1, depHour: 6, arrHour: 11, arrDayExtra: 0, stops: [{ city: 'Sahiwal', arrivalTime: '08:30', departureTime: '08:45' }] },
    { busId: kohistan._id, source: 'Lahore', destination: 'Multan', basePrice: 850, depOffset: 4, depHour: 15, arrHour: 20, arrDayExtra: 0, stops: [] },
    { busId: niazi._id, source: 'Lahore', destination: 'Multan', basePrice: 950, depOffset: 6, depHour: 8, arrHour: 13, arrDayExtra: 0, stops: [{ city: 'Sahiwal', arrivalTime: '10:30', departureTime: '10:45' }] },

    // Islamabad → Lahore (reverse popular route)
    { busId: daewoo._id, source: 'Islamabad', destination: 'Lahore', basePrice: 1500, depOffset: 2, depHour: 15, arrHour: 20, arrDayExtra: 0, stops: [{ city: 'Gujranwala', arrivalTime: '19:30', departureTime: '19:40' }] },
    { busId: skyways._id, source: 'Islamabad', destination: 'Lahore', basePrice: 1300, depOffset: 5, depHour: 11, arrHour: 16, arrDayExtra: 0, stops: [] },
    { busId: kohistan._id, source: 'Islamabad', destination: 'Lahore', basePrice: 1100, depOffset: 6, depHour: 20, arrHour: 1, arrDayExtra: 1, stops: [] },
  ];

  const routes = await Route.insertMany(
    routeDefs.map((r) => ({
      busId: r.busId,
      source: r.source,
      destination: r.destination,
      basePrice: r.basePrice,
      departureTime: makeDateTime(r.depOffset, r.depHour),
      arrivalTime: makeDateTime(r.depOffset + (r.arrDayExtra || 0), r.arrHour),
      date: makeDate(r.depOffset),
      totalSeats: busDefs.find((b) => b.busNumber === buses.find((bus) => bus._id.equals(r.busId)).busNumber).totalSeats,
      stops: r.stops || [],
      status: 'active',
    }))
  );
  console.log(`✓ Created ${routes.length} routes`);

  // ── Create Bookings ───────────────────────────────────────────────────────

  const bookings = [];
  let paymentCounter = 1;

  const makePay = () => `PAY-DEMO-${Date.now()}-${paymentCounter++}`;

  // Helper: create N bookings for a route from random mock users
  const addBookings = (routeIdx, count, seatsPerBooking = 2) => {
    const route = routes[routeIdx];
    const totalSeats = route.totalSeats;
    const cols = totalSeats % 4 === 0 ? 4 : 5;
    const colLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, cols);
    let seatIdx = 0;

    for (let i = 0; i < count && seatIdx < totalSeats - seatsPerBooking; i++) {
      const user = mockUsers[i % mockUsers.length];
      const seats = [];
      for (let s = 0; s < seatsPerBooking && seatIdx < totalSeats; s++) {
        const row = Math.floor(seatIdx / cols) + 1;
        const col = seatIdx % cols;
        seats.push(`${row}${colLetters[col]}`);
        seatIdx++;
      }
      bookings.push({
        userId: user._id,
        routeId: route._id,
        seatNumbers: seats,
        totalAmount: route.basePrice * seats.length,
        status: 'confirmed',
        paymentId: makePay(),
      });
    }
  };

  // Karachi→Lahore: VERY popular (many bookings) — routes 0,1,2
  addBookings(0, 8, 2);  // 16 seats booked on route 0 (40% of 40)
  addBookings(1, 5, 3);  // 15 seats booked on route 1 (33% of 45)
  addBookings(2, 5, 2);  // 10 seats booked on route 2 (25% of 40)

  // Lahore→Islamabad: popular — routes 3,4,5
  addBookings(3, 5, 2);  // 10 seats on 36 (28%)
  addBookings(4, 4, 2);  // 8 seats on 40 (20%)
  addBookings(5, 3, 2);  // 6 seats on 50 (12%)

  // Islamabad→Peshawar: moderate — routes 6,7,8
  addBookings(6, 3, 2);  // 6 on 36 (17%)
  addBookings(7, 2, 2);  // 4 on 50 (8%)

  // Karachi→Hyderabad: frequent short — routes 9,10,11
  // Make route 9 NEARLY FULL for "Almost Sold Out" badge
  addBookings(9, 5, 4);   // 20 seats on 40 (50%)
  addBookings(10, 4, 2);  // 8 on 45 (18%)

  // Lahore→Multan — routes 12,13,14
  addBookings(12, 3, 2);  // 6 on 40 (15%)
  addBookings(13, 2, 2);  // 4 on 36 (11%)

  // Islamabad→Lahore — routes 15,16,17
  addBookings(15, 4, 2);  // 8 on 40 (20%)
  addBookings(16, 2, 2);  // 4 on 40 (10%)

  // ── Demo user bookings (for personalized recommendations) ─────────────────
  // The demo user frequently travels: Lahore→Islamabad, Karachi→Lahore
  // This should cause the engine to recommend similar routes highly.

  const demoBookings = [
    // 3 bookings on Lahore→Islamabad (preference signal: frequent)
    { routeIdx: 3, seats: ['5A', '5B'] },
    { routeIdx: 4, seats: ['3A'] },
    { routeIdx: 5, seats: ['4A', '4B'] },
    // 3 bookings on Karachi→Lahore
    { routeIdx: 0, seats: ['8A', '8B'] },
    { routeIdx: 1, seats: ['7A'] },
    { routeIdx: 2, seats: ['6A', '6B'] },
    // 1 booking on Karachi→Hyderabad
    { routeIdx: 9, seats: ['10A'] },
    // 1 booking on Islamabad→Peshawar
    { routeIdx: 6, seats: ['9A'] },
  ];

  for (const db of demoBookings) {
    bookings.push({
      userId: demoUser._id,
      routeId: routes[db.routeIdx]._id,
      seatNumbers: db.seats,
      totalAmount: routes[db.routeIdx].basePrice * db.seats.length,
      status: 'confirmed',
      paymentId: makePay(),
    });
  }

  await Booking.insertMany(bookings);
  console.log(`✓ Created ${bookings.length} bookings (${demoBookings.length} for demo user)`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SEED COMPLETE — Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Demo user  : demo@busgo.com / demo123`);
  console.log(`  Buses      : ${buses.length}`);
  console.log(`  Routes     : ${routes.length} (next 7 days)`);
  console.log(`  Bookings   : ${bookings.length} total`);
  console.log(`  Demo user  : ${demoBookings.length} bookings (Lahore↔Islamabad, Karachi→Lahore focus)`);
  console.log('');
  console.log('  Route distribution:');
  console.log('    Karachi → Lahore      : 3 routes (very popular)');
  console.log('    Lahore → Islamabad    : 3 routes (popular)');
  console.log('    Islamabad → Peshawar  : 3 routes (moderate)');
  console.log('    Karachi → Hyderabad   : 3 routes (frequent short)');
  console.log('    Lahore → Multan       : 3 routes (moderate)');
  console.log('    Islamabad → Lahore    : 3 routes (reverse popular)');
  console.log('═══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
