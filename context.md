# Bus Ticket Reservation System — Project Context

> Single source of truth. Any developer or AI can onboard from this file alone.

---

## 1. Full Folder Structure

```
bus-ticket-reservation-system/               ← monorepo root
├── package.json                             ← root scripts (concurrently dev/build)
├── .gitignore                               ← covers node_modules, .env, dist, OS/IDE
├── context.md                               ← this file
│
├── backend/                                 ← Express + Node.js API server
│   ├── package.json
│   ├── .env                                 ← secrets (never committed)
│   ├── .env.example                         ← template with all required keys
│   ├── server.js                            ← entry point: Express app bootstrap
│   ├── config/
│   │   └── db.js                            ← Mongoose connection with retry logic
│   ├── models/
│   │   ├── User.js                          ← User schema
│   │   ├── Bus.js                           ← Bus schema
│   │   ├── Route.js                         ← Route schema (multi-stop)
│   │   ├── Booking.js                       ← Booking schema
│   │   └── SeatLock.js                      ← Temporary seat lock schema
│   ├── middleware/
│   │   ├── authMiddleware.js                ← JWT verification, attaches req.user
│   │   ├── adminMiddleware.js               ← role === 'admin' guard
│   │   ├── errorMiddleware.js               ← global error handler
│   │   └── validationMiddleware.js          ← express-validator result checker
│   ├── controllers/
│   │   ├── authController.js                ← register, login, me
│   │   ├── busController.js                 ← admin CRUD for buses
│   │   ├── routeController.js               ← admin CRUD for routes + search
│   │   ├── seatController.js                ← seat layout, lock/unlock
│   │   ├── bookingController.js             ← create, list, cancel bookings + admin stats
│   │   └── recommendationController.js      ← smart hybrid recommendation engine
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── busRoutes.js
│   │   ├── routeRoutes.js
│   │   ├── seatRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── adminRoutes.js                   ← /admin/bookings, /admin/stats
│   │   └── recommendationRoutes.js          ← GET /recommendations (optionalAuth)
│   ├── scripts/
│   │   ├── seed.js                          ← basic seed (buses, routes, sample bookings)
│   │   ├── seedRecommendationData.js        ← demo user + 18 future routes + 63 bookings
│   │   └── makeAdmin.js                     ← promote/create an admin (only path to admin)
│   └── utils/
│       ├── generateToken.js                 ← JWT sign helper
│       └── seatPricing.js                   ← window seat premium logic
│
└── frontend/                                ← React (Vite) SPA
    ├── package.json
    ├── .env                                 ← VITE_ prefixed vars (never committed)
    ├── .env.example
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── components.json                      ← Shadcn/UI config
    ├── public/
    │   └── logo.svg
    └── src/
        ├── main.jsx                         ← React entry point
        ├── App.jsx                          ← Router + layout wrapper
        ├── api/
        │   └── axios.js                     ← Axios instance, JWT interceptor
        ├── store/
        │   ├── authStore.js                 ← Zustand: user, token, login/logout
        │   └── bookingStore.js              ← Zustand: route, seats, price
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.jsx               ← responsive, auth-aware (+ ThemeToggle)
        │   │   ├── Footer.jsx
        │   │   ├── ProtectedRoute.jsx       ← redirects guests → /login
        │   │   └── AdminRoute.jsx           ← redirects non-admins → /
        │   ├── ui/                          ← Shadcn/UI generated components
        │   ├── ThemeToggle.jsx              ← dark/light mode toggle (persisted)
        │   ├── CountdownTimer.jsx           ← 10-min seat-lock countdown (Checkout)
        │   ├── ErrorBoundary.jsx            ← top-level React error boundary
        │   ├── RecommendationsSection.jsx   ← fetches/renders recommendations on Home
        │   └── RecommendationCard.jsx       ← single recommendation card (badges/reasons)
        ├── pages/
        │   ├── Home.jsx                     ← hero + search form
        │   ├── SearchResults.jsx            ← filtered route listing
        │   ├── SeatSelection.jsx            ← interactive seat picker
        │   ├── Checkout.jsx                 ← booking summary + mock payment
        │   ├── Dashboard.jsx                ← user booking history
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   └── admin/
        │       ├── AdminLayout.jsx          ← sidebar nav wrapper
        │       ├── AdminDashboard.jsx       ← stats + charts
        │       ├── AdminBuses.jsx           ← CRUD buses
        │       ├── AdminRoutes.jsx          ← CRUD routes
        │       └── AdminBookings.jsx        ← view all bookings
        └── utils/
            ├── formatters.js               ← date/currency formatters
            ├── seatHelpers.js              ← seat color/status logic
            ├── generateTicket.js           ← jsPDF ticket generator
            └── exportCsv.js                ← CSV export (admin tables)
```

---

## 2. API Routing Map

Base URL: `http://localhost:5000/api`

### Authentication — `/api/auth`

| Method | Path             | Auth Required | Description                                              |
|--------|------------------|---------------|----------------------------------------------------------|
| POST   | `/auth/register` | None          | Validate inputs, hash password, create user, return JWT  |
| POST   | `/auth/login`    | None          | Validate credentials, return JWT + user info             |
| GET    | `/auth/me`       | JWT           | Return current authenticated user's profile              |

### User APIs

| Method | Path                          | Auth Required | Description                                                                         |
|--------|-------------------------------|---------------|-------------------------------------------------------------------------------------|
| GET    | `/search`                     | None          | Search routes by `source`, `destination`, `date`; filters: `type`, `minPrice`, `maxPrice`, `departureAfter`, `departureBefore`; sort: `price_asc`, `price_desc`, `departure_asc` |
| GET    | `/routes/:id/seats`           | None          | Return seat layout + availability; auto-expire locks where `lockedUntil < now`      |
| POST   | `/routes/:id/seats/lock`      | JWT           | Lock selected seats for current user for 10 minutes                                 |
| POST   | `/bookings`                   | JWT           | Validate seat availability, create booking                                          |
| GET    | `/bookings/my`                | JWT           | Return paginated list of current user's bookings                                    |
| PUT    | `/bookings/:id/cancel`        | JWT           | Cancel booking if status=confirmed and departure hasn't passed                      |
| GET    | `/recommendations`            | Optional      | Smart hybrid recommendations. Anonymous → popularity/urgency/availability; logged-in → adds personal-affinity signal. Returns scored routes with badges + reasons |

### Admin APIs — `/api/admin` (JWT + Admin role required on all)

| Method | Path                    | Description                                              |
|--------|-------------------------|----------------------------------------------------------|
| GET    | `/admin/buses`          | Paginated list of all buses                              |
| POST   | `/admin/buses`          | Create a new bus                                         |
| PUT    | `/admin/buses/:id`      | Update bus by ID                                         |
| DELETE | `/admin/buses/:id`      | Delete bus by ID                                         |
| GET    | `/admin/routes`         | Paginated, filterable list of all routes                 |
| POST   | `/admin/routes`         | Create a new route (with multi-stop support)             |
| PUT    | `/admin/routes/:id`     | Update route by ID                                       |
| DELETE | `/admin/routes/:id`     | Delete route by ID                                       |
| GET    | `/admin/bookings`       | Paginated bookings filterable by status/date/route       |
| GET    | `/admin/stats`          | Summary: total buses, routes, today's bookings, revenue  |

### Standard Response Shape

```json
// Success
{ "success": true, "data": { ... }, "pagination": { "page": 1, "limit": 10, "total": 50 } }

// Error
{ "success": false, "message": "Human-readable error", "error": "technical detail (dev only)" }
```

---

## 3. Database Schema Relationships

### ERD Description

```
User ──< Booking >── Route ──< Stop (embedded array)
              |          |
              |          └── Bus
              └── SeatLock (references Route + User)
```

- One **User** can have many **Bookings**
- One **Booking** belongs to one **Route** and one **User**
- One **Route** belongs to one **Bus** and has an embedded array of **Stops**
- **SeatLock** records are keyed by `(routeId, seatNumber)` and reference a **User**

### Schema Field Definitions

#### User
```js
{
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },           // bcrypt hashed
  role:      { type: String, enum: ['user','admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
}
```

#### Bus
```js
{
  name:        { type: String, required: true },
  busNumber:   { type: String, required: true, unique: true },
  type:        { type: String, enum: ['AC','Non-AC','Sleeper','Seater'], required: true },
  totalSeats:  { type: Number, required: true },
  seatLayout:  {
    rows:      Number,
    cols:      Number,
    // seatMap: array of { seatNumber, type: 'window'|'aisle', side: 'left'|'right'|'middle' }
    seats:     [{ seatNumber: String, type: String, side: String }]
  }
}
```

#### Route
```js
{
  busId:         { type: ObjectId, ref: 'Bus', required: true },
  source:        { type: String, required: true },
  destination:   { type: String, required: true },
  stops:         [{ city: String, arrivalTime: String, departureTime: String }],
  basePrice:     { type: Number, required: true },
  departureTime: { type: Date, required: true },
  arrivalTime:   { type: Date, required: true },
  date:          { type: String, required: true },       // 'YYYY-MM-DD' for search
  totalSeats:    { type: Number, required: true },
  status:        { type: String, enum: ['active','cancelled'], default: 'active' }
}
```

#### Booking
```js
{
  userId:      { type: ObjectId, ref: 'User', required: true },
  routeId:     { type: ObjectId, ref: 'Route', required: true },
  seatNumbers: [{ type: String }],
  totalAmount: { type: Number, required: true },
  status:      { type: String, enum: ['pending','confirmed','cancelled'], default: 'confirmed' },
  paymentId:   { type: String },                         // mock transaction ID
  createdAt:   { type: Date, default: Date.now }
}
```

#### SeatLock
```js
{
  routeId:     { type: ObjectId, ref: 'Route', required: true },
  seatNumber:  { type: String, required: true },
  lockedBy:    { type: ObjectId, ref: 'User', required: true },
  lockedUntil: { type: Date, required: true }            // now + 10 minutes
}
// Compound index: { routeId: 1, seatNumber: 1 } unique
```

---

## 4. State Management Approach

**Library**: [Zustand](https://zustand-demo.pmnd.rs/) — lightweight, no boilerplate, compatible with React 18.

### `authStore` (`src/store/authStore.js`)
Manages authentication state across the entire app.

| State / Action  | Type     | Description                                                    |
|-----------------|----------|----------------------------------------------------------------|
| `user`          | object   | `{ _id, name, email, role }` or `null`                         |
| `token`         | string   | JWT access token or `null`                                     |
| `isLoading`     | boolean  | True during login/register API calls                           |
| `login(data)`   | action   | Sets user + token, persists token to `localStorage`            |
| `logout()`      | action   | Clears user + token, removes from `localStorage`               |
| `initialize()`  | action   | Called on app mount — rehydrates token from `localStorage`     |

### `bookingStore` (`src/store/bookingStore.js`)
Manages the in-progress booking flow across pages.

| State / Action        | Type     | Description                                                |
|-----------------------|----------|------------------------------------------------------------|
| `selectedRoute`       | object   | Full route object chosen from search results               |
| `selectedSeats`       | array    | List of seat objects `{ seatNumber, type, price }`         |
| `totalPrice`          | number   | Sum of all selected seat prices (with window premium)      |
| `setRoute(route)`     | action   | Sets the selected route, clears previous seat selection    |
| `toggleSeat(seat)`    | action   | Adds or removes a seat from selection, recalculates price  |
| `clearBooking()`      | action   | Resets entire store after checkout completes               |

---

## 5. Tech Stack Details

### Backend

| Package               | Version  | Purpose                                                       |
|-----------------------|----------|---------------------------------------------------------------|
| `express`             | ^5.2     | HTTP server and routing framework                             |
| `mongoose`            | ^9.x     | MongoDB ODM — schemas, models, queries                        |
| `dotenv`              | ^17.x    | Load environment variables from `.env`                        |
| `cors`                | ^2.x     | Cross-Origin Resource Sharing configuration                   |
| `helmet`              | ^8.x     | HTTP security headers                                         |
| `express-rate-limit`  | ^8.x     | Rate limiting to prevent brute-force/DoS                      |
| `bcryptjs`            | ^3.x     | Password hashing (bcrypt algorithm)                           |
| `jsonwebtoken`        | ^9.x     | JWT generation and verification                               |
| `express-validator`   | ^7.x     | Request body/query input validation                           |

### Frontend

| Package               | Version  | Purpose                                                       |
|-----------------------|----------|---------------------------------------------------------------|
| `react`               | ^18.x    | UI library                                                    |
| `react-dom`           | ^18.x    | React DOM renderer                                            |
| `vite`                | ^6.x     | Build tool and dev server                                     |
| `react-router-dom`    | ^6.x     | Client-side routing                                           |
| `tailwindcss`         | ^3.x     | Utility-first CSS framework                                   |
| `@shadcn/ui`          | latest   | Accessible, styled component library built on Radix UI        |
| `lucide-react`        | latest   | Icon library (consistent with Shadcn/UI)                      |
| `axios`               | ^1.x     | HTTP client with interceptors                                 |
| `zustand`             | ^5.x     | Minimal state management                                      |
| `jspdf`               | ^2.x     | Client-side PDF ticket generation                             |
| `jspdf-autotable`     | ^3.x     | Table plugin for jsPDF (used in ticket layout)                |
| `recharts`            | ^2.x     | Chart library for admin dashboard (bookings/revenue graphs)   |
| `date-fns`            | ^3.x     | Date formatting and manipulation                              |

---

## 6. Environment Variables

### `backend/.env.example`

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/bus-reservation

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### `frontend/.env.example`

```env
# Backend API base URL
VITE_API_BASE_URL=http://localhost:5000/api

# App metadata
VITE_APP_NAME=BusGo
```

---

## 7. Key Architectural Decisions

| Decision                     | Choice                  | Rationale                                                              |
|------------------------------|-------------------------|------------------------------------------------------------------------|
| Seat locking                 | `SeatLock` MongoDB docs | No Redis dependency; TTL-like behavior via `lockedUntil` field check   |
| Window seat pricing          | +10% on base price      | Calculated in `seatPricing.js` utility, applied at lock + booking time |
| PDF generation               | jsPDF (client-side)     | No server load; user triggers download directly in browser             |
| Auth persistence             | localStorage + Zustand  | Simple, sufficient for SPA; token rehydrated on app mount              |
| Multi-stop routes            | Embedded `stops` array  | Avoids separate collection; stops are always queried with their route  |
| Admin access control         | Role field + middleware | Single User collection with role enum; no separate Admin collection    |
| Pagination                   | Server-side, limit+skip | Consistent approach across all admin list endpoints                    |
```
