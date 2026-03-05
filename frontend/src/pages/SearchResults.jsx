import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Bus, MapPin, Clock, Users, SlidersHorizontal, ArrowUpDown, ChevronRight,
} from 'lucide-react';

import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import api from '@/api/axios';
import { formatTime, formatCurrency, formatDuration } from '@/utils/formatters';

// ── Skeleton card ─────────────────────────────────────────────────────────────

function RouteCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-8 items-center">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Route card ────────────────────────────────────────────────────────────────

function RouteCard({ route }) {
  const navigate = useNavigate();

  const busTypeColor = {
    AC:       'bg-blue-100 text-blue-700 border-blue-200',
    'Non-AC': 'bg-gray-100 text-gray-700 border-gray-200',
    Sleeper:  'bg-purple-100 text-purple-700 border-purple-200',
    Seater:   'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <Card className="hover:shadow-md hover:border-primary/30 transition-all">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Bus info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-base">{route.busId?.name}</span>
              <span className="text-xs text-muted-foreground">#{route.busId?.busNumber}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${busTypeColor[route.busId?.type] ?? busTypeColor['Non-AC']}`}>
                {route.busId?.type}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{route.source}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>{route.destination}</span>
            </div>
          </div>

          {/* Times */}
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Departure</div>
              <div className="font-semibold text-lg">{formatTime(route.departureTime)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Duration</div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                {formatDuration(route.departureTime, route.arrivalTime)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Arrival</div>
              <div className="font-semibold text-lg">{formatTime(route.arrivalTime)}</div>
            </div>
          </div>

          {/* Price + CTA */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">From</div>
              <div className="text-xl font-bold text-primary">{formatCurrency(route.basePrice)}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                <Users className="w-3 h-3" />
                {route.availableSeats ?? '—'} seats left
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/routes/${route._id}/seats`)}
              disabled={route.availableSeats === 0}
            >
              {route.availableSeats === 0 ? 'Sold Out' : 'Select Seats'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Filter sidebar ────────────────────────────────────────────────────────────

function FilterPanel({ filters, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4" /> Filters
      </h3>

      {/* Bus type */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Bus Type</Label>
        <div className="space-y-1.5">
          {['All', 'AC', 'Non-AC', 'Sleeper', 'Seater'].map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="busType"
                value={t}
                checked={filters.busType === t}
                onChange={() => onChange({ busType: t })}
                className="accent-primary"
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Price Range (PKR)</Label>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="Min"
            min={0}
            value={filters.minPrice}
            onChange={(e) => onChange({ minPrice: e.target.value })}
            className="h-8 text-sm"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="number"
            placeholder="Max"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onChange({ busType: 'All', minPrice: '', maxPrice: '' })}
      >
        Reset Filters
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const source      = searchParams.get('source')      || '';
  const destination = searchParams.get('destination') || '';
  const date        = searchParams.get('date')        || '';

  const [routes,      setRoutes]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [sort,        setSort]        = useState('departure_asc');
  const [filters,     setFilters]     = useState({ busType: 'All', minPrice: '', maxPrice: '' });
  const [showFilters, setShowFilters] = useState(false);

  const mergeFilters = (partial) => setFilters((prev) => ({ ...prev, ...partial }));

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (source)      params.set('source', source);
      if (destination) params.set('destination', destination);
      if (date)        params.set('date', date);
      params.set('sort', sort);

      const { data } = await api.get(`/search?${params.toString()}`);
      setRoutes(data.success ? data.data : []);
    } catch {
      setError('Failed to load routes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [source, destination, date, sort]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Client-side filter application
  const filtered = routes.filter((r) => {
    if (filters.busType !== 'All' && r.busId?.type !== filters.busType) return false;
    if (filters.minPrice && r.basePrice < Number(filters.minPrice)) return false;
    if (filters.maxPrice && r.basePrice > Number(filters.maxPrice)) return false;
    return true;
  });

  return (
    <div className="container py-8 max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">
          {source && destination ? `${source} → ${destination}` : 'All Routes'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {date ? `Date: ${date}` : 'Any date'} &middot;{' '}
          {loading ? '…' : `${filtered.length} route${filtered.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
        <aside className="hidden lg:block w-56 shrink-0">
          <FilterPanel filters={filters} onChange={mergeFilters} />
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden gap-2"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Filters'}
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departure_asc">Earliest Departure</SelectItem>
                  <SelectItem value="price_asc">Price: Low → High</SelectItem>
                  <SelectItem value="price_desc">Price: High → Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile filter panel */}
          {showFilters && (
            <Card className="lg:hidden mb-4">
              <CardContent className="pt-5">
                <FilterPanel filters={filters} onChange={mergeFilters} />
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          {/* Results */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <RouteCardSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-muted-foreground">No routes found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              filtered.map((route) => <RouteCard key={route._id} route={route} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
