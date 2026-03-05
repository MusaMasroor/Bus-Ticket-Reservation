import mongoose from 'mongoose';

const seatLockSchema = new mongoose.Schema({
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true,
  },
  seatNumber: {
    type: String,
    required: true,
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lockedUntil: {
    type: Date,
    required: true, // set to Date.now() + 10 minutes on creation
  },
});

// Compound unique index — one lock per seat per route at any time
seatLockSchema.index({ routeId: 1, seatNumber: 1 }, { unique: true });

// TTL index — MongoDB auto-deletes expired locks (background cleanup)
seatLockSchema.index({ lockedUntil: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('SeatLock', seatLockSchema);
