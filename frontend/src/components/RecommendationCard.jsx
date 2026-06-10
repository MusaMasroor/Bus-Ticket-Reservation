import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, Flame, Star, Timer, Armchair } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatTime, formatCurrency, formatDuration, formatDate } from '@/utils/formatters';

// ── Reason chip icon/color mapping ──────────────────────────────────────────

const REASON_CONFIG = {
  personal:     { icon: Star,    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  popularity:   { icon: Flame,   color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  urgency:      { icon: Timer,   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  availability: { icon: Armchair, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

const BADGE_LABELS = {
  trending:          'Trending',
  almost_sold_out:   'Almost Sold Out',
  departing_soon:    'Departing Soon',
  personal_favorite: 'Your Favorite',
};

// ── Score ring — circular progress indicator ────────────────────────────────

function ScoreRing({ score }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" strokeWidth="3"
          className="stroke-muted" />
        <circle cx="22" cy="22" r={radius} fill="none" strokeWidth="3"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className={`${color} stroke-current transition-all duration-700`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {Math.round(score)}%
      </span>
    </div>
  );
}

// ── Main card ───────────────────────────────────────────────────────────────

export default function RecommendationCard({ recommendation }) {
  const navigate = useNavigate();
  const { route, score, reasons, badges, availableSeats, totalSeats } = recommendation;

  const busTypeColor = {
    AC:       'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    'Non-AC': 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    Sleeper:  'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    Seater:   'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  };

  const fillPercent = totalSeats > 0 ? Math.round(((totalSeats - availableSeats) / totalSeats) * 100) : 0;

  return (
    <Card className="group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      <CardContent className="p-5">
        {/* Top row: badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {badges.map((badge) => (
              <Badge key={badge} variant="secondary"
                className={
                  badge === 'trending' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0' :
                  badge === 'almost_sold_out' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0' :
                  badge === 'departing_soon' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0'
                }
              >
                {badge === 'trending' && <Flame className="w-3 h-3 mr-1" />}
                {badge === 'almost_sold_out' && <Armchair className="w-3 h-3 mr-1" />}
                {badge === 'departing_soon' && <Timer className="w-3 h-3 mr-1" />}
                {badge === 'personal_favorite' && <Star className="w-3 h-3 mr-1" />}
                {BADGE_LABELS[badge]}
              </Badge>
            ))}
          </div>
        )}

        {/* Main content row */}
        <div className="flex items-start gap-4">
          {/* Score ring */}
          <ScoreRing score={score} />

          {/* Route info */}
          <div className="flex-1 min-w-0">
            {/* Route path */}
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-semibold truncate">{route.source}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold truncate">{route.destination}</span>
            </div>

            {/* Bus name + type */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-sm text-muted-foreground">{route.busId?.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${busTypeColor[route.busId?.type] ?? busTypeColor['Non-AC']}`}>
                {route.busId?.type}
              </span>
            </div>

            {/* Date + times */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
              <span>{formatDate(route.departureTime)}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(route.departureTime)} — {formatTime(route.arrivalTime)}
              </span>
              <span className="text-xs">({formatDuration(route.departureTime, route.arrivalTime)})</span>
            </div>

            {/* Reason chips */}
            {reasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {reasons.map((reason, i) => {
                  const cfg = REASON_CONFIG[reason.type] || REASON_CONFIG.popularity;
                  const Icon = cfg.icon;
                  return (
                    <span key={i} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
                      <Icon className="w-3 h-3" />
                      {reason.text}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Seat availability bar */}
            <div className="mb-1">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{availableSeats} of {totalSeats} seats available</span>
                <span>{fillPercent}% filled</span>
              </div>
              <Progress
                value={fillPercent}
                className="h-2"
              />
            </div>
          </div>
        </div>

        {/* Bottom row: price + CTA */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div>
            <span className="text-xs text-muted-foreground">From</span>
            <div className="text-xl font-bold text-primary">{formatCurrency(route.basePrice)}</div>
          </div>
          <Button
            onClick={() => navigate(`/routes/${route._id}/seats`)}
            disabled={availableSeats === 0}
            className="gap-1.5"
          >
            {availableSeats === 0 ? 'Sold Out' : 'Book Now'}
            {availableSeats > 0 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
