import { useState, useEffect } from 'react';
import { Sparkles, Info, Brain } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

import api from '@/api/axios';
import RecommendationCard from './RecommendationCard';

// ── Skeleton loader (matches RecommendationCard shape) ──────────────────────

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex gap-1.5 mb-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-6 w-full rounded-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
        <div className="flex justify-between mt-4 pt-3 border-t">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── "How it works" tooltip ──────────────────────────────────────────────────

function HowItWorks({ meta }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
        How it works
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full mt-2 left-0 w-72 p-4 rounded-lg border bg-popover text-popover-foreground shadow-lg text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm mb-2">
              <Brain className="w-4 h-4 text-primary" />
              AI Recommendation Engine
            </div>
            <p>Our hybrid recommender system scores routes using four signals:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>Popularity</strong> ({Math.round((meta?.signalWeights?.popularity || 0) * 100)}%) — Booking trends from the past 30 days</li>
              {meta?.signalWeights?.affinity != null && (
                <li><strong>Personal Affinity</strong> ({Math.round(meta.signalWeights.affinity * 100)}%) — Based on your travel history</li>
              )}
              <li><strong>Urgency</strong> ({Math.round((meta?.signalWeights?.urgency || 0) * 100)}%) — Routes departing soon get a boost</li>
              <li><strong>Availability</strong> ({Math.round((meta?.signalWeights?.availability || 0) * 100)}%) — Seat scarcity and social proof</li>
            </ul>
            <p className="text-muted-foreground pt-1">
              Analyzed {meta?.totalCandidates || 0} routes to find the best {meta?.returned || 0} for you.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main section ────────────────────────────────────────────────────────────

export default function RecommendationsSection() {
  const [recommendations, setRecommendations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/recommendations');
        if (!cancelled && data.success) {
          setRecommendations(data.data.recommendations);
          setMeta(data.data.meta);
        }
      } catch {
        if (!cancelled) setError('Unable to load recommendations.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecommendations();
    return () => { cancelled = true; };
  }, []);

  // Don't render section at all if there's an error and no data
  if (error && recommendations.length === 0 && !loading) return null;

  return (
    <section className="py-16 px-4 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-2xl sm:text-3xl font-bold">
                {meta?.isPersonalized ? 'Recommended for You' : 'Popular Routes'}
              </h2>
            </div>
            <p className="text-muted-foreground">
              {meta?.isPersonalized
                ? 'Based on your travel history and trending routes'
                : 'Based on trending routes and upcoming departures'}
            </p>
          </div>
          {meta && <HowItWorks meta={meta} />}
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-medium text-muted-foreground">No recommendations available right now</p>
            <p className="text-sm text-muted-foreground mt-1">Try searching for routes above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.route._id} recommendation={rec} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
