import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Bus } from 'lucide-react';

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

// ── Seat layout builder ───────────────────────────────────────────────────────

/**
 * Generates a seat layout from rows × cols.
 * Left half → 'left' side, right half → 'right' side.
 * Corner seats (first/last col of each side) → 'window', rest → 'aisle'.
 */
function buildSeatLayout(rows, cols) {
  const seats = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seatNumber = `${r}${letters[c]}`;
      const side   = c < Math.ceil(cols / 2) ? 'left' : 'right';
      const isEdge = c === 0 || c === cols - 1 ||
                     c === Math.ceil(cols / 2) - 1 || c === Math.ceil(cols / 2);
      const type   = isEdge ? 'window' : 'aisle';
      seats.push({ seatNumber, type, side });
    }
  }
  return seats;
}

function SeatLayoutBuilder({ rows, cols, seats, onSeatToggle }) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Click a seat to toggle window/aisle. Green = window, gray = aisle.
      </p>
      <div className="overflow-x-auto">
        <div className="inline-block space-y-1 border rounded-lg p-3 bg-muted/20">
          {Array.from({ length: rows }, (_, ri) => (
            <div key={ri} className="flex gap-1">
              {Array.from({ length: cols }, (_, ci) => {
                const seatNumber = `${ri + 1}${letters[ci]}`;
                const seat = seats.find((s) => s.seatNumber === seatNumber);
                const isWindow = seat?.type === 'window';
                return (
                  <button
                    key={ci}
                    type="button"
                    onClick={() => onSeatToggle(seatNumber)}
                    className={`w-8 h-8 rounded text-[9px] font-semibold border transition-colors
                      ${isWindow
                        ? 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    title={`${seatNumber} — ${isWindow ? 'window' : 'aisle'}`}
                  >
                    {seatNumber}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bus form dialog ───────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', busNumber: '', type: 'AC', rows: 10, cols: 4 };

function BusDialog({ open, bus, onClose, onSaved }) {
  const isEdit = !!bus;
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [seats,   setSeats]   = useState([]);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState('');

  useEffect(() => {
    if (!open) return;
    if (bus) {
      setForm({
        name:      bus.name,
        busNumber: bus.busNumber,
        type:      bus.type,
        rows:      bus.seatLayout?.rows || 10,
        cols:      bus.seatLayout?.cols || 4,
      });
      setSeats(bus.seatLayout?.seats ? [...bus.seatLayout.seats] : []);
    } else {
      setForm(EMPTY_FORM);
      setSeats(buildSeatLayout(EMPTY_FORM.rows, EMPTY_FORM.cols));
    }
    setErrors({});
    setServerErr('');
  }, [open, bus]);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const rebuildLayout = (rows, cols) => {
    setSeats(buildSeatLayout(Number(rows), Number(cols)));
  };

  const toggleSeatType = (seatNumber) => {
    setSeats((prev) =>
      prev.map((s) =>
        s.seatNumber === seatNumber
          ? { ...s, type: s.type === 'window' ? 'aisle' : 'window' }
          : s
      )
    );
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())      errs.name = 'Bus name is required.';
    if (!form.busNumber.trim()) errs.busNumber = 'Bus number is required.';
    if (form.rows < 1 || form.rows > 30) errs.rows = 'Rows: 1–30.';
    if (form.cols < 2 || form.cols > 8)  errs.cols = 'Cols: 2–8.';
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
        name:       form.name.trim(),
        busNumber:  form.busNumber.trim().toUpperCase(),
        type:       form.type,
        totalSeats: Number(form.rows) * Number(form.cols),
        seatLayout: { rows: Number(form.rows), cols: Number(form.cols), seats },
      };
      if (isEdit) {
        await api.put(`/admin/buses/${bus._id}`, payload);
      } else {
        await api.post('/admin/buses', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerErr(err.response?.data?.message || 'Failed to save bus.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update bus details and seat layout.' : 'Configure the bus and build its seat layout.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {serverErr && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {serverErr}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bus Name</Label>
              <Input
                placeholder="e.g. Daewoo Express"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Bus Number</Label>
              <Input
                placeholder="e.g. DE-001"
                value={form.busNumber}
                onChange={(e) => handleChange('busNumber', e.target.value)}
              />
              {errors.busNumber && <p className="text-xs text-destructive">{errors.busNumber}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bus Type</Label>
            <Select value={form.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['AC', 'Non-AC', 'Sleeper', 'Seater'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rows (1–30)</Label>
              <Input
                type="number" min={1} max={30}
                value={form.rows}
                onChange={(e) => {
                  handleChange('rows', Number(e.target.value));
                  rebuildLayout(e.target.value, form.cols);
                }}
              />
              {errors.rows && <p className="text-xs text-destructive">{errors.rows}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Columns (2–8)</Label>
              <Input
                type="number" min={2} max={8}
                value={form.cols}
                onChange={(e) => {
                  handleChange('cols', Number(e.target.value));
                  rebuildLayout(form.rows, e.target.value);
                }}
              />
              {errors.cols && <p className="text-xs text-destructive">{errors.cols}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Seat Layout ({Number(form.rows) * Number(form.cols)} seats total)</Label>
            <SeatLayoutBuilder
              rows={Number(form.rows)}
              cols={Number(form.cols)}
              seats={seats}
              onSeatToggle={toggleSeatType}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEdit ? 'Save Changes' : 'Add Bus'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────

function DeleteDialog({ bus, open, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await api.delete(`/admin/buses/${bus._id}`);
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
            <AlertCircle className="w-5 h-5" /> Delete Bus
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{bus?.name}</strong> ({bus?.busNumber})?
            This cannot be undone.
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

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const BUS_TYPE_COLORS = {
  AC:       'bg-blue-100 text-blue-700',
  'Non-AC': 'bg-gray-100 text-gray-600',
  Sleeper:  'bg-purple-100 text-purple-700',
  Seater:   'bg-green-100 text-green-700',
};

export default function AdminBuses() {
  const [buses,      setBuses]      = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [page,       setPage]       = useState(1);

  const [formTarget,   setFormTarget]   = useState(null);   // null=closed, 'new', or bus obj
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchBuses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/admin/buses?page=${page}&limit=10`);
      if (data.success) {
        setBuses(data.data);
        setPagination(data.pagination);
      }
    } catch {
      setError('Failed to load buses.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBuses(); }, [fetchBuses]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Buses</h2>
          <p className="text-muted-foreground text-sm">{pagination.total} buses in fleet</p>
        </div>
        <Button className="gap-2" onClick={() => setFormTarget('new')}>
          <Plus className="w-4 h-4" /> Add Bus
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bus Name</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Total Seats</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : buses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Bus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No buses found. Add your first bus!
                </TableCell>
              </TableRow>
            ) : (
              buses.map((bus) => (
                <TableRow key={bus._id}>
                  <TableCell className="font-medium">{bus.name}</TableCell>
                  <TableCell className="font-mono text-sm">{bus.busNumber}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${BUS_TYPE_COLORS[bus.type] ?? ''}`}>
                      {bus.type}
                    </span>
                  </TableCell>
                  <TableCell>{bus.totalSeats}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {bus.seatLayout?.rows}×{bus.seatLayout?.cols}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setFormTarget(bus)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(bus)}>
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

      {/* Dialogs */}
      <BusDialog
        open={!!formTarget}
        bus={formTarget === 'new' ? null : formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={fetchBuses}
      />
      <DeleteDialog
        open={!!deleteTarget}
        bus={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={fetchBuses}
      />
    </div>
  );
}
