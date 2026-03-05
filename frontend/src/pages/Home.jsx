import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, Calendar, Shield, Clock, Star, Search, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ── Static data ───────────────────────────────────────────────────────────────

const WHY_CHOOSE_US = [
  {
    icon: Shield,
    title: 'Safe & Reliable',
    description: 'All buses are verified, well-maintained, and operated by trusted companies.',
  },
  {
    icon: Clock,
    title: 'On-Time Guarantee',
    description: 'We track every departure to ensure you reach your destination on schedule.',
  },
  {
    icon: Star,
    title: 'Best Prices',
    description: 'Competitive fares with no hidden fees. Window seats available at a small premium.',
  },
  {
    icon: Bus,
    title: 'Multiple Bus Types',
    description: 'Choose from AC, Non-AC, Sleeper, and Seater buses to match your comfort and budget.',
  },
];

const POPULAR_ROUTES = [
  { from: 'Karachi', to: 'Lahore',    duration: '16h', from_short: 'KHI', to_short: 'LHE' },
  { from: 'Lahore',  to: 'Islamabad', duration: '5h',  from_short: 'LHE', to_short: 'ISB' },
  { from: 'Karachi', to: 'Hyderabad', duration: '3h',  from_short: 'KHI', to_short: 'HYD' },
  { from: 'Islamabad', to: 'Peshawar', duration: '2h', from_short: 'ISB', to_short: 'PEW' },
  { from: 'Lahore',  to: 'Multan',    duration: '5h',  from_short: 'LHE', to_short: 'MUL' },
  { from: 'Karachi', to: 'Quetta',    duration: '20h', from_short: 'KHI', to_short: 'QTA' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const today    = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({ source: '', destination: '', date: today });

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (form.source)      params.set('source', form.source.trim());
    if (form.destination) params.set('destination', form.destination.trim());
    if (form.date)        params.set('date', form.date);
    navigate(`/search?${params.toString()}`);
  };

  const quickSearch = (from, to) => {
    const params = new URLSearchParams({ source: from, destination: to, date: today });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20 px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <Badge variant="secondary" className="mb-4">Pakistan&apos;s #1 Bus Booking Platform</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Book Your Bus Ticket{' '}
            <span className="text-primary">in Seconds</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Search hundreds of routes, pick your seat, and travel with confidence.
          </p>
        </div>

        {/* Search card */}
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Source */}
                <div className="space-y-1.5">
                  <Label htmlFor="source" className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> From
                  </Label>
                  <Input
                    id="source"
                    name="source"
                    placeholder="e.g. Karachi"
                    value={form.source}
                    onChange={handleChange}
                  />
                </div>

                {/* Destination */}
                <div className="space-y-1.5">
                  <Label htmlFor="destination" className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> To
                  </Label>
                  <Input
                    id="destination"
                    name="destination"
                    placeholder="e.g. Lahore"
                    value={form.destination}
                    onChange={handleChange}
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Date
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={handleChange}
                  />
                </div>

                <div className="sm:col-span-3">
                  <Button type="submit" className="w-full gap-2" size="lg">
                    <Search className="w-4 h-4" /> Search Buses
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Why Choose Us ────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Why Choose BusGo?</h2>
            <p className="text-muted-foreground">Everything you need for a comfortable journey</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_CHOOSE_US.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="text-center hover:shadow-md transition-shadow">
                <CardContent className="pt-6 pb-5 px-4">
                  <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Routes ────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Popular Routes</h2>
            <p className="text-muted-foreground">Frequently travelled destinations across Pakistan</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POPULAR_ROUTES.map((route) => (
              <button
                key={`${route.from}-${route.to}`}
                onClick={() => quickSearch(route.from, route.to)}
                className="group w-full text-left"
              >
                <Card className="hover:shadow-md hover:border-primary/40 transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">{route.from_short}</div>
                        <div className="font-semibold text-sm">{route.from}</div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 px-2">
                        <div className="text-xs text-muted-foreground">{route.duration}</div>
                        <div className="flex items-center gap-1">
                          <div className="w-8 h-px bg-border" />
                          <Bus className="w-3 h-3 text-primary" />
                          <div className="w-8 h-px bg-border" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">{route.to_short}</div>
                        <div className="font-semibold text-sm">{route.to}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
