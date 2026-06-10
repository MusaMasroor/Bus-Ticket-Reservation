/**
 * SMART ROUTE RECOMMENDATION ENGINE
 * ==================================
 * Algorithm: Hybrid Recommender System (Content-Based + Popularity-Based)
 *
 * This engine combines four weighted signals to produce personalized
 * route recommendations:
 *
 * 1. POPULARITY (30%) — Collaborative signal based on aggregate booking
 *    frequency for each source→destination pair over a 30-day window.
 *    Implements a simplified version of item-based collaborative filtering.
 *
 * 2. PERSONAL AFFINITY (35%) — Content-based filtering using the user's
 *    own booking history. Extracts preference vectors for: source cities,
 *    destination cities, bus types, and departure time windows. Routes
 *    matching more preference dimensions score higher.
 *
 * 3. URGENCY (20%) — Temporal decay function that boosts routes with
 *    approaching departure times, creating natural urgency signals.
 *
 * 4. SEAT AVAILABILITY (15%) — Scarcity signal using a non-linear scoring
 *    curve. Moderate fill rates (social proof) and high fill rates
 *    (scarcity/FOMO) both score well; empty routes score low.
 *
 * For anonymous users, affinity weight is redistributed proportionally
 * across the remaining three signals.
 *
 * Technical classification: This is a feature-weighted hybrid recommender
 * system, a standard approach in recommendation engines (see: Burke, 2002 —
 * "Hybrid Recommender Systems: Survey and Experiments").
 *
 * Complexity: O(R × B) where R = candidate routes, B = user's booking count.
 * Suitable for datasets up to ~10K routes without performance concerns.
 */

import Route from '../models/Route.js';
import Booking from '../models/Booking.js';

// ── Signal weight configurations ─────────────────────────────────────────────

const WEIGHTS_AUTHENTICATED = {
  popularity: 0.30,
  affinity: 0.35,
  urgency: 0.20,
  availability: 0.15,
};

const WEIGHTS_ANONYMOUS = {
  popularity: 0.45,
  urgency: 0.30,
  availability: 0.25,
};

const MAX_RECOMMENDATIONS = 8;

// ── Helper: classify departure hour into a time window ──────────────────────

function getTimeWindow(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ── SIGNAL 1: Popularity Score ──────────────────────────────────────────────
// Counts confirmed bookings per (source, destination) pair in the last 30 days.
// The pair with the most bookings gets a score of 100; others are normalized
// relative to that maximum.

async function computePopularityMap() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Aggregate bookings → join with routes to get source/destination
  const pipeline = [
    { $match: { status: 'confirmed', createdAt: { $gte: thirtyDaysAgo } } },
    {
      $lookup: {
        from: 'routes',
        localField: 'routeId',
        foreignField: '_id',
        as: 'route',
      },
    },
    { $unwind: '$route' },
    {
      $group: {
        _id: { source: '$route.source', destination: '$route.destination' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ];

  const results = await Booking.aggregate(pipeline);

  const maxCount = results.length > 0 ? results[0].count : 1;
  const map = new Map();

  for (const r of results) {
    const key = `${r._id.source}→${r._id.destination}`;
    map.set(key, { score: (r.count / maxCount) * 100, count: r.count });
  }

  return map;
}

// ── SIGNAL 2: Personal Affinity Score ───────────────────────────────────────
// Analyzes the user's past bookings to build preference vectors for:
//   (a) Source cities they depart from most often
//   (b) Destination cities they travel to most often
//   (c) Bus types they prefer
//   (d) Time windows they usually travel in (morning/afternoon/evening/night)
// Each candidate route is scored by how many preference dimensions it matches.

async function computeUserPreferences(userId) {
  const bookings = await Booking.find({ userId, status: { $ne: 'cancelled' } })
    .populate({
      path: 'routeId',
      populate: { path: 'busId', select: 'type' },
    })
    .lean();

  if (bookings.length === 0) return null;

  const sourceCounts = {};
  const destCounts = {};
  const busTypeCounts = {};
  const timeWindowCounts = {};

  for (const b of bookings) {
    const route = b.routeId;
    if (!route) continue;

    sourceCounts[route.source] = (sourceCounts[route.source] || 0) + 1;
    destCounts[route.destination] = (destCounts[route.destination] || 0) + 1;

    if (route.busId?.type) {
      busTypeCounts[route.busId.type] = (busTypeCounts[route.busId.type] || 0) + 1;
    }

    const hour = new Date(route.departureTime).getHours();
    const tw = getTimeWindow(hour);
    timeWindowCounts[tw] = (timeWindowCounts[tw] || 0) + 1;
  }

  // Convert to ranked preference lists (highest count first)
  const rank = (obj) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));

  return {
    sources: rank(sourceCounts),
    destinations: rank(destCounts),
    busTypes: rank(busTypeCounts),
    timeWindows: rank(timeWindowCounts),
    totalBookings: bookings.length,
  };
}

function scoreAffinity(route, preferences) {
  if (!preferences) return 0;

  let score = 0;
  const maxPerDimension = 25; // 4 dimensions × 25 = 100 max

  // (a) Source city match — higher if it's the user's top source
  const sourceRank = preferences.sources.findIndex((s) => s.key === route.source);
  if (sourceRank !== -1) {
    score += maxPerDimension * (1 - sourceRank * 0.2); // top source = 25, second = 20, etc.
  }

  // (b) Destination city match
  const destRank = preferences.destinations.findIndex((d) => d.key === route.destination);
  if (destRank !== -1) {
    score += maxPerDimension * (1 - destRank * 0.2);
  }

  // (c) Bus type match
  const busType = route.busId?.type;
  const typeRank = preferences.busTypes.findIndex((t) => t.key === busType);
  if (typeRank !== -1) {
    score += maxPerDimension * (1 - typeRank * 0.2);
  }

  // (d) Time window match
  const hour = new Date(route.departureTime).getHours();
  const tw = getTimeWindow(hour);
  const twRank = preferences.timeWindows.findIndex((t) => t.key === tw);
  if (twRank !== -1) {
    score += maxPerDimension * (1 - twRank * 0.2);
  }

  return Math.min(100, Math.max(0, score));
}

// ── SIGNAL 3: Urgency / Timing Score ────────────────────────────────────────
// Routes departing sooner receive a higher score to create natural urgency.
// Scoring tiers: <24h=100, 24-48h=75, 48-72h=50, 3-7d=25, >7d=10

function scoreUrgency(departureTime) {
  const hoursUntilDeparture = (new Date(departureTime) - Date.now()) / 3600000;

  if (hoursUntilDeparture < 0) return 0;   // already departed
  if (hoursUntilDeparture < 24) return 100;
  if (hoursUntilDeparture < 48) return 75;
  if (hoursUntilDeparture < 72) return 50;
  if (hoursUntilDeparture < 168) return 25; // 7 days
  return 10;
}

// ── SIGNAL 4: Seat Availability Score ───────────────────────────────────────
// Non-linear scoring curve based on fill percentage:
//   <20% filled → 20 (no social proof)
//   20-50%      → 50
//   50-70%      → 75 (sweet spot: social proof + availability)
//   70-90%      → 90 (scarcity building)
//   >90%        → 100 (FOMO — "Almost Sold Out!")

function scoreAvailability(bookedSeats, totalSeats) {
  if (totalSeats === 0) return 0;
  const fillPercent = (bookedSeats / totalSeats) * 100;

  if (fillPercent > 90) return 100;
  if (fillPercent > 70) return 90;
  if (fillPercent > 50) return 75;
  if (fillPercent > 20) return 50;
  return 20;
}

// ── Reason & Badge generation ───────────────────────────────────────────────
// Generates human-readable reasons explaining WHY a route is recommended,
// and badges for visual indicators on the card UI.

function generateReasons(signals, popularityData, availableSeats, totalSeats, preferences) {
  const reasons = [];

  // Personal affinity reason
  if (signals.affinity > 50 && preferences) {
    reasons.push({
      type: 'personal',
      text: 'You frequently travel this route',
      weight: signals.affinity,
    });
  } else if (signals.affinity > 20 && preferences) {
    reasons.push({
      type: 'personal',
      text: 'Matches your travel preferences',
      weight: signals.affinity,
    });
  }

  // Popularity reason
  if (popularityData && popularityData.count >= 5) {
    reasons.push({
      type: 'popularity',
      text: `Trending — booked ${popularityData.count} times this month`,
      weight: signals.popularity,
    });
  } else if (popularityData && popularityData.count > 0) {
    reasons.push({
      type: 'popularity',
      text: `Popular route — ${popularityData.count} recent bookings`,
      weight: signals.popularity,
    });
  }

  // Urgency reason
  if (signals.urgency >= 75) {
    reasons.push({
      type: 'urgency',
      text: signals.urgency === 100 ? 'Departing within 24 hours' : 'Departing tomorrow',
      weight: signals.urgency,
    });
  } else if (signals.urgency >= 50) {
    reasons.push({
      type: 'urgency',
      text: 'Departing soon',
      weight: signals.urgency,
    });
  }

  // Availability reason
  const fillPercent = totalSeats > 0 ? (((totalSeats - availableSeats) / totalSeats) * 100) : 0;
  if (fillPercent > 90) {
    reasons.push({
      type: 'availability',
      text: `Almost sold out — ${availableSeats} seat${availableSeats !== 1 ? 's' : ''} left`,
      weight: signals.availability,
    });
  } else if (fillPercent > 70) {
    reasons.push({
      type: 'availability',
      text: 'Filling up fast',
      weight: signals.availability,
    });
  }

  // Sort by weight descending, return top 2
  reasons.sort((a, b) => b.weight - a.weight);
  return reasons.slice(0, 2).map(({ type, text }) => ({ type, text }));
}

function generateBadges(signals, availableSeats, totalSeats, popularityData) {
  const badges = [];
  const fillPercent = totalSeats > 0 ? (((totalSeats - availableSeats) / totalSeats) * 100) : 0;

  if (popularityData && popularityData.count >= 5) badges.push('trending');
  if (fillPercent > 90) badges.push('almost_sold_out');
  if (signals.urgency >= 75) badges.push('departing_soon');
  if (signals.affinity > 50) badges.push('personal_favorite');

  return badges;
}

// ── Main recommendation endpoint ────────────────────────────────────────────

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?._id || null;
    const isAuthenticated = !!userId;

    // 1. Fetch all future active routes with bus details
    const candidateRoutes = await Route.find({
      status: 'active',
      departureTime: { $gt: new Date() },
    })
      .populate('busId', 'name busNumber type totalSeats seatLayout')
      .lean();

    if (candidateRoutes.length === 0) {
      return res.json({
        success: true,
        data: {
          recommendations: [],
          meta: {
            isPersonalized: isAuthenticated,
            signalWeights: isAuthenticated ? WEIGHTS_AUTHENTICATED : WEIGHTS_ANONYMOUS,
            generatedAt: new Date().toISOString(),
            totalCandidates: 0,
            returned: 0,
          },
        },
      });
    }

    // 2. Compute popularity map (all bookings in last 30 days grouped by route pair)
    const popularityMap = await computePopularityMap();

    // 3. Compute user preferences (only for authenticated users)
    const preferences = isAuthenticated ? await computeUserPreferences(userId) : null;

    // 4. Compute booked seats per route (for availability signal)
    const routeIds = candidateRoutes.map((r) => r._id);
    const bookedSeatsAgg = await Booking.aggregate([
      { $match: { routeId: { $in: routeIds }, status: { $in: ['confirmed', 'pending'] } } },
      { $unwind: '$seatNumbers' },
      { $group: { _id: '$routeId', bookedCount: { $sum: 1 } } },
    ]);
    const bookedSeatsMap = new Map(
      bookedSeatsAgg.map((r) => [r._id.toString(), r.bookedCount])
    );

    // 5. Select weight configuration
    const weights = isAuthenticated && preferences
      ? WEIGHTS_AUTHENTICATED
      : WEIGHTS_ANONYMOUS;

    // 6. Score each candidate route
    const scored = candidateRoutes.map((route) => {
      const pairKey = `${route.source}→${route.destination}`;
      const popularityData = popularityMap.get(pairKey) || { score: 0, count: 0 };
      const totalSeats = route.totalSeats || route.busId?.totalSeats || 40;
      const bookedSeats = bookedSeatsMap.get(route._id.toString()) || 0;
      const availableSeats = Math.max(0, totalSeats - bookedSeats);

      // Compute individual signal scores
      const signals = {
        popularity: popularityData.score,
        affinity: isAuthenticated && preferences ? scoreAffinity(route, preferences) : 0,
        urgency: scoreUrgency(route.departureTime),
        availability: scoreAvailability(bookedSeats, totalSeats),
      };

      // Weighted final score
      const finalScore =
        (signals.popularity * weights.popularity) +
        (signals.affinity * (weights.affinity || 0)) +
        (signals.urgency * weights.urgency) +
        (signals.availability * weights.availability);

      return {
        route,
        score: Math.round(finalScore * 10) / 10, // round to 1 decimal
        signals,
        popularityData,
        availableSeats,
        totalSeats,
      };
    });

    // 7. Sort by score descending and take top N
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, MAX_RECOMMENDATIONS);

    // 8. Format response
    const recommendations = top.map((item) => ({
      route: item.route,
      score: item.score,
      reasons: generateReasons(
        item.signals,
        item.popularityData,
        item.availableSeats,
        item.totalSeats,
        preferences,
      ),
      badges: generateBadges(item.signals, item.availableSeats, item.totalSeats, item.popularityData),
      availableSeats: item.availableSeats,
      totalSeats: item.totalSeats,
      bookingCount30d: item.popularityData.count,
    }));

    return res.json({
      success: true,
      data: {
        recommendations,
        meta: {
          isPersonalized: isAuthenticated && !!preferences,
          signalWeights: weights,
          generatedAt: new Date().toISOString(),
          totalCandidates: candidateRoutes.length,
          returned: recommendations.length,
        },
      },
    });
  } catch (err) {
    console.error('Recommendation engine error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations.',
    });
  }
};
