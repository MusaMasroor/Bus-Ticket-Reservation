import { Link } from 'react-router-dom';
import { Bus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <Bus className="h-5 w-5" />
            <span>BusGo</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/"        className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/search"  className="hover:text-foreground transition-colors">Search</Link>
            <Link to="/login"   className="hover:text-foreground transition-colors">Log in</Link>
            <Link to="/register" className="hover:text-foreground transition-colors">Register</Link>
          </nav>
        </div>
        <Separator className="my-4" />
        <p className="text-center text-xs text-muted-foreground">
          © {year} BusGo. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
