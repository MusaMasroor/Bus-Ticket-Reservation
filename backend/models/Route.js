import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true },
    arrivalTime: { type: String, default: null },   // null for first stop
    departureTime: { type: String, default: null }, // null for last stop
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus is required'],
    },
    source: {
      type: String,
      required: [true, 'Source city is required'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Destination city is required'],
      trim: true,
    },
    // Intermediate stops (not including source/destination)
    stops: { type: [stopSchema], default: [] },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative'],
    },
    departureTime: {
      type: Date,
      required: [true, 'Departure time is required'],
    },
    arrivalTime: {
      type: Date,
      required: [true, 'Arrival time is required'],
    },
    // 'YYYY-MM-DD' string — used for fast date-equality search queries
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
    },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Index for the most common search query pattern
routeSchema.index({ source: 1, destination: 1, date: 1, status: 1 });

export default mongoose.model('Route', routeSchema);
