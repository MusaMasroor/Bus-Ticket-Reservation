import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, MapPin, PlusCircle, X } from 'lucide-react';

import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Badge }    from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

import api from '@/api/axios';
import { formatDate, formatTime, formatCurrency } from '@/utils/formatters';

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}

// ── Route form dialog ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  busId: '', source: '', destination: '',
  date: '', departureTime: '', arrivalTime: '',
  basePrice: '', totalSeats: '', status: 'active',
};

const EMPTY_STOP = { city: '', arrivalTime: '', departureTime: '' };

function RouteDialog({ open, route, buses, onClose, onSaved }) {
  const isEdit = !!route;
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [stops,   setStops]   = useState([]);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState('');

  useEffect(() => {
    if (!open) return;
    if (route) {
      // Convert stored ISO dates back to datetime-local format
      const toLocal = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';
      setForm({
        busId:         route.busId?._id || route.busId || '',
        source:        route.source,
        destination:   route.destination,
        date:          route.date,
        departureTime: toLocal(route.departureTime),
        arrivalTime:   toLocal(route.arrivalTime),
        basePrice:     route.basePrice,
        totalSeats:    route.totalSeats,
        status:        route.status,
      });
      setStops(route.stops?.length ? [...route.stops] : []);
    } else {
      setForm(EMPTY_FORM);
      setStops([]);
    }
    setErrors({});
    setServerErr('');
  }, [open, route]);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const addStop = () => setStops((p) => [...p, { ...EMPTY_STOP }]);
  const removeStop = (i) => setStops((p) => p.filter((_, idx) => idx !== i));
  const updateStop = (i, field, value) =>
    setStops((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const validate = () => {
    const errs = {};
    if (!form.busId)            errs.busId = 'Please select a bus.';
    if (!form.source.trim())    errs.source = 'Source is required.';
    if (!form.destination.trim()) errs.destination = 'Destination is required.';
    if (!form.date)             errs.date = 'Date is required.';
    if (!form.departureTime)    errs.departureTime = 'Departure time is required.';
    if (!form.arrivalTime)      errs.arrivalTime = 'Arrival time is required.';
    if (!form.basePrice || Number(form.basePrice) < 0) errs.basePrice = 'Valid price required.';
    if (!form.totalSeats || Number(form.totalSeats) < 1) errs.totalSeats = 'At least 1 seat.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setServerErr('');
    try {
      const payload = {
        busId:         form.busId,
        source:        form.source.trim(),
        destination:   form.destination.trim(),
        date:          form.date,
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime:   new Date(form.arrivalTime).toISOString(),
        basePrice:     Number(form.basePrice),
        totalSeats:    Number(form.totalSeats),
        status:        form.status,
        stops:         stops.filter((s) => s.city.trim()),
      };
      if (isEdit) {
        await api.put(`/admin/routes/${route._id}`, payload);
      } else {
        await api.post('/admin/routes', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerErr(err.response?.data?.message || 'Failed to save route.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Route' : 'Add New Route'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update route details.' : 'Create a new bus route.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {serverErr && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {serverErr}
            </div>
          )}

          {/* Bus */}
          <div className="space-y-1.5">
            <Label>Bus</Label>
            <Select value={form.busId} onValueChange={(v) => handleChange('busId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bus…" />
              </SelectTrigger>
              <SelectContent>
                {buses.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name} — {b.busNumber} ({b.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.busId && <p className="text-xs text-destructive">{errors.busId}</p>}
          </div>

          {/* Source / Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Source City</Label>
              <Input
                placeholder="e.g. Karachi"
                value={form.source}
                onChange={(e) => handleChange('source', e.target.value)}
              />
              {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Destination City</Label>
              <Input
                placeholder="e.g. Lahore"
                value={form.destination}
                onChange={(e) => handleChange('destination', e.target.value)}
              />
              {errors.destination && <p className="text-xs text-destructive">{errors.destination}</p>}
            </div>
          </div>

          {/* Date / Departure / Arrival */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Date (YYYY-MM-DD)</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Departure Time</Label>
              <Input
                type="datetime-local"
                value={form.departureTime}
                onChange={(e) => handleChange('departureTime', e.target.value)}
              />
              {errors.departureTime && <p className="text-xs text-destructive">{errors.departureTime}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Arrival Time</Label>
              <Input
                type="datetime-local"
                value={form.arrivalTime}
                onChange={(e) => handleChange('arrivalTime', e.target.value)}
              />
              {errors.arrivalTime && <p className="text-xs text-destructive">{errors.arrivalTime}</p>}
            </div>
          </div>

          {/* Price / Seats / Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Base Price (PKR)</Label>
              <Input
                type="number" min={0}
                placeholder="e.g. 2500"
                value={form.basePrice}
                onChange={(e) => handleChange('basePrice', e.target.value)}
              />
              {errors.basePrice && <p className="text-xs text-destructive">{errors.basePrice}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Total Seats</Label>
              <Input
                type="number" min={1}
                placeholder="e.g. 40"
                value={form.totalSeats}
                onChange={(e) => handleChange('totalSeats', e.target.value)}
              />
              {errors.totalSeats && <p className="text-xs text-destructive">{errors.totalSeats}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Intermediate stops */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Intermediate Stops (optional)</Label>
              <Button type="button" size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={addStop}>
                <PlusCircle className="w-3.5 h-3.5" /> Add Stop
              </Button>
            </div>
            {stops.length === 0 && (
              <p className="text-xs text-muted-foreground">No intermediate stops configured.</p>
            )}
            {stops.map((stop, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-muted-foreground">Stop {i + 1}</p>
                  <Input
                    placeholder="City name"
                    value={stop.city}
                    onChange={(e) => updateStop(i, 'city', e.target.value)}
                  />
                </div>
                <div className="w-36 space-y-1">
                  <p className="text-xs text-muted-foreground">Arrival</p>
                  <Input
                    placeholder="HH:MM"
                    value={stop.arrivalTime}
                    onChange={(e) => updateStop(i, 'arrivalTime', e.target.value)}
                  />
                </div>
                <div className="w-36 space-y-1">
                  <p className="text-xs text-muted-foreground">Departure</p>
                  <Input
                    placeholder="HH:MM"
                    value={stop.departureTime}
                    onChange={(e) => updateStop(i, 'departureTime', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-2 text-destructive hover:bg-destructive/10"
                  onClick={() => removeStop(i)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEdit ? 'Save Changes' : 'Create Route'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteDialog({ route, open, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/admin/routes/${route._id}`);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-destructive flex gap-2 items-center">
            <AlertCircle className="w-5 h-5" /> Delete Route
          </DialogTitle>
          <DialogDescription>
            Delete <strong>{route?.source} → {route?.destination}</strong> on {formatDate(route?.date)}? Cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" className="flex-1 gap-2" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminRoutes() {
  const [routes,     setRoutes]     = useState([]);
  const [buses,      setBuses]      = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [filters,    setFilters]    = useState({ source: '', destination: '', date: '' });

  const [formTarget,   setFormTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load buses for the form dropdown (all at once, no pagination needed)
  useEffect(() => {
    api.get('/admin/buses?limit=50')
      .then(({ data }) => { if (data.success) setBuses(data.data); })
      .catch(() => {});
  }, []);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (filters.source)      params.set('source', filters.source);
      if (filters.destination) params.set('destination', filters.destination);
      if (filters.date)        params.set('date', filters.date);

      const { data } = await api.get(`/admin/routes?${params}`);
      if (data.success) {
        setRoutes(data.data);
        setPagination(data.pagination);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const handleFilterChange = (field, value) => {
    setFilters((p) => ({ ...p, [field]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Routes</h2>
          <p className="text-muted-foreground text-sm">{pagination.total} routes total</p>
        </div>
        <Button className="gap-2" onClick={() => setFormTarget('new')}>
          <Plus className="w-4 h-4" /> Add Route
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Filter by source…"
          className="w-40 h-8 text-sm"
          value={filters.source}
          onChange={(e) => handleFilterChange('source', e.target.value)}
        />
        <Input
          placeholder="Filter by destination…"
          className="w-44 h-8 text-sm"
          value={filters.destination}
          onChange={(e) => handleFilterChange('destination', e.target.value)}
        />
        <Input
          type="date"
          className="w-36 h-8 text-sm"
          value={filters.date}
          onChange={(e) => handleFilterChange('date', e.target.value)}
        />
        {(filters.source || filters.destination || filters.date) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => { setFilters({ source: '', destination: '', date: '' }); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Departure</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : routes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No routes found.
                </TableCell>
              </TableRow>
            ) : (
              routes.map((route) => (
                <TableRow key={route._id}>
                  <TableCell className="font-medium">
                    {route.source} → {route.destination}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {route.busId?.name}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(route.date)}</TableCell>
                  <TableCell className="text-sm">{formatTime(route.departureTime)}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(route.basePrice)}</TableCell>
                  <TableCell className="text-sm">{route.totalSeats}</TableCell>
                  <TableCell>
                    <Badge
                      className={route.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                      }
                    >
                      {route.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setFormTarget(route)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(route)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />

      <RouteDialog
        open={!!formTarget}
        route={formTarget === 'new' ? null : formTarget}
        buses={buses}
        onClose={() => setFormTarget(null)}
        onSaved={fetchRoutes}
      />
      <DeleteDialog
        open={!!deleteTarget}
        route={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={fetchRoutes}
      />
    </div>
  );
}
