import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';

import ErrorBoundary   from '@/components/ErrorBoundary';
import Navbar          from '@/components/layout/Navbar';
import Footer          from '@/components/layout/Footer';
import ProtectedRoute  from '@/components/layout/ProtectedRoute';
import AdminRoute      from '@/components/layout/AdminRoute';
import useAuthStore    from '@/store/authStore';

// Pages
import Home           from '@/pages/Home';
import Login          from '@/pages/Login';
import Register       from '@/pages/Register';
import SearchResults  from '@/pages/SearchResults';
import SeatSelection  from '@/pages/SeatSelection';
import Checkout       from '@/pages/Checkout';
import Dashboard      from '@/pages/Dashboard';

// Admin Pages
import AdminLayout    from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminBuses     from '@/pages/admin/AdminBuses';
import AdminRoutes    from '@/pages/admin/AdminRoutes';
import AdminBookings  from '@/pages/admin/AdminBookings';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* ── Public ──────────────────────────────────── */}
            <Route path="/"         element={<Home />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/search"   element={<SearchResults />} />

            {/* ── Protected (auth required) ────────────────── */}
            <Route path="/routes/:id/seats" element={
              <ProtectedRoute><SeatSelection /></ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute><Checkout /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />

            {/* ── Admin (auth + admin role required) ──────── */}
            <Route path="/admin" element={
              <AdminRoute><AdminLayout /></AdminRoute>
            }>
              <Route index          element={<AdminDashboard />} />
              <Route path="buses"   element={<AdminBuses />} />
              <Route path="routes"  element={<AdminRoutes />} />
              <Route path="bookings" element={<AdminBookings />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
