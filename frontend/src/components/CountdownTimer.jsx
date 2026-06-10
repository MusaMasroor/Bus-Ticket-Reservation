import { useState, useEffect, useRef } from 'react';
import { Timer, AlertTriangle, XCircle } from 'lucide-react';

/**
 * Countdown timer that shows MM:SS until a given expiry timestamp.
 * Turns red and pulses when < 2 minutes remain.
 * Shows an expiry message for 3 seconds, then calls `onExpire`.
 */
export default function CountdownTimer({ expiresAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(expiresAt));
  const [expired, setExpired] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!expiresAt) return;
    setRemaining(calcRemaining(expiresAt));
    setExpired(false);

    const interval = setInterval(() => {
      const left = calcRemaining(expiresAt);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        setExpired(true);
        // Show expiry message for 3 seconds, then trigger redirect/cleanup
        setTimeout(() => onExpireRef.current?.(), 3000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  // Expired state — show clear message before redirect
  if (expired) {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 animate-pulse">
        <XCircle className="w-4 h-4 shrink-0" />
        <span>Seat reservation expired — redirecting…</span>
      </div>
    );
  }

  if (remaining <= 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const urgent = remaining < 120;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        urgent
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 animate-pulse'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300'
      }`}
    >
      {urgent ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Timer className="w-4 h-4 shrink-0" />}
      <span>Seats locked — {display} remaining</span>
    </div>
  );
}

function calcRemaining(expiresAt) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}
