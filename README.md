# BusGo — Bus Ticket Reservation System

A full-stack MERN application for searching, booking, and managing bus tickets — featuring real-time seat selection, a hybrid smart recommendation engine, and a complete admin dashboard.

## Features

- Search buses by source, destination, and date with price/time filters
- Interactive seat selection with temporary seat locking (10-minute hold)
- Smart hybrid recommendation engine (popularity + personal affinity + urgency + availability signals)
- Client-side PDF ticket generation
- JWT-based authentication with role-based access (user/admin)
- Admin dashboard with bus/route/booking management and revenue stats
- Dark/light theme toggle
- Fully responsive UI built with Shadcn/UI + Tailwind CSS

## Tech Stack

**Backend**
| Package | Purpose |
|---|---|
| Express | HTTP server & routing |
| Mongoose | MongoDB ODM |
| jsonwebtoken | JWT auth |
| bcryptjs | Password hashing |
| helmet | Security headers |
| express-rate-limit | Rate limiting |
| express-validator | Input validation |

**Frontend**
| Package | Purpose |
|---|---|
| React + Vite | UI & build tooling |
| React Router | Client-side routing |
| Zustand | State management |
| Tailwind CSS + Shadcn/UI | Styling & components |
| Axios | HTTP client |
| jsPDF | Ticket PDF generation |
| Recharts | Admin dashboard charts |

## Project Structure

bus-ticket-reservation-system/
├── backend/ # Express API server
│ ├── config/ # DB connection
│ ├── controllers/ # Route handlers (auth, buses, routes, seats, bookings, recommendations)
│ ├── middleware/ # Auth, admin guard, error handling, validation
│ ├── models/ # Mongoose schemas
│ ├── routes/ # Express routers
│ ├── scripts/ # Seed & admin-creation scripts
│ └── utils/ # JWT helper, seat pricing logic
└── frontend/ # React (Vite) SPA
└── src/
├── api/ # Axios instance
├── store/ # Zustand stores (auth, booking)
├── components/ # Reusable UI, layout, recommendation cards
├── pages/ # Route-level pages incl. admin/
└── utils/ # Formatters, seat helpers, PDF/CSV export

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A MongoDB connection (local or Atlas)

### Installation

```bash
git clone <repo-url>
cd bus-ticket-reservation-system
npm run install:all
```

This installs root, `backend`, and `frontend` dependencies.

### Environment Variables

Create `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/bus-reservation
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=BusGo
```

### Run in development

```bash
npm run dev
```

Runs both backend and frontend concurrently.

### Seed demo data (optional)

```bash
node backend/scripts/seed.js                     # base buses/routes/bookings
node backend/scripts/seedRecommendationData.js    # demo user + data for recommendations
node backend/scripts/makeAdmin.js                 # promote/create an admin user
```

## API Overview

Base URL: `/api`

### Auth — `/auth`

| Method | Path             | Auth | Description                      |
| ------ | ---------------- | ---- | -------------------------------- |
| POST   | `/auth/register` | None | Create user, return JWT          |
| POST   | `/auth/login`    | None | Validate credentials, return JWT |
| GET    | `/auth/me`       | JWT  | Current user profile             |

### Public / User

| Method | Path                     | Auth     | Description                        |
| ------ | ------------------------ | -------- | ---------------------------------- |
| GET    | `/search`                | None     | Search routes with filters & sort  |
| GET    | `/routes/:id/seats`      | None     | Seat layout + live availability    |
| POST   | `/routes/:id/seats/lock` | JWT      | Lock seats for 10 minutes          |
| POST   | `/bookings`              | JWT      | Create a booking                   |
| GET    | `/bookings/my`           | JWT      | Current user's bookings            |
| PUT    | `/bookings/:id/cancel`   | JWT      | Cancel a booking                   |
| GET    | `/recommendations`       | Optional | Smart hybrid route recommendations |

### Admin — `/admin` (JWT + admin role)

| Method     | Path                | Description                     |
| ---------- | ------------------- | ------------------------------- |
| GET/POST   | `/admin/buses`      | List / create buses             |
| PUT/DELETE | `/admin/buses/:id`  | Update / delete a bus           |
| GET/POST   | `/admin/routes`     | List / create routes            |
| PUT/DELETE | `/admin/routes/:id` | Update / delete a route         |
| GET        | `/admin/bookings`   | Filterable bookings list        |
| GET        | `/admin/stats`      | Revenue & booking summary stats |

### Response shape

```json
// Success
{ "success": true, "data": { ... }, "pagination": { "page": 1, "limit": 10, "total": 50 } }

// Error
{ "success": false, "message": "Human-readable error", "error": "technical detail (dev only)" }
```

## Database Schema

User ──< Booking >── Route ──< Stop (embedded array)
| |
| └── Bus
└── SeatLock (references Route + User)

- One **User** → many **Bookings**
- One **Booking** → one **Route**, one **User**
- One **Route** → one **Bus**, embedded **Stops** array
- **SeatLock** keyed by `(routeId, seatNumber)`, references a **User**

## Key Architectural Decisions

| Decision            | Choice                  | Rationale                                             |
| ------------------- | ----------------------- | ----------------------------------------------------- |
| Seat locking        | `SeatLock` MongoDB docs | No Redis dependency; TTL-like check via `lockedUntil` |
| Window seat pricing | +10% on base price      | Applied in `seatPricing.js` at lock + booking time    |
| PDF generation      | jsPDF (client-side)     | No server load; instant browser download              |
| Auth persistence    | localStorage + Zustand  | Simple, sufficient for an SPA                         |
| Multi-stop routes   | Embedded `stops` array  | Always queried alongside their route                  |
| Admin access        | Role field + middleware | Single User collection, no separate Admin collection  |
| Pagination          | Server-side, limit+skip | Consistent across all admin list endpoints            |

## License

This project is for educational purposes.
