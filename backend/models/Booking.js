import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route is required'],
    },
    seatNumbers: {
      type: [String],
      required: [true, 'Seat numbers are required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one seat must be selected',
      },
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed',
    },
    paymentId: {
      type: String,
      default: null, // mock transaction ID generated on checkout
    },
  },
  { timestamps: true }
);

// Index for fast user booking history queries
bookingSchema.index({ userId: 1, createdAt: -1 });
// Index for admin queries by route
bookingSchema.index({ routeId: 1, status: 1 });

export default mongoose.model('Booking', bookingSchema);
