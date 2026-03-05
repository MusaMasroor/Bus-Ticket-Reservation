import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Bus, MapPin, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/admin',          label: 'Overview',  icon: LayoutDashboard, end: true },
  { to: '/admin/buses',    label: 'Buses',     icon: Bus },
  { to: '/admin/routes',   label: 'Routes',    icon: MapPin },
  { to: '/admin/bookings', label: 'Bookings',  icon: BookOpen },
];

export default function AdminLayout() {
  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-56 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1">
            {LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
