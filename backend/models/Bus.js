import mongoose from 'mongoose';

const seatSchema = new mongoose.Schema(
  {
    seatNumber: { type: String, required: true }, // e.g. "1A", "2B"
    type: { type: String, enum: ['window', 'aisle'], required: true },
    side: { type: String, enum: ['left', 'right', 'middle'], required: true },
  },
  { _id: false }
);

const busSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Bus name is required'],
      trim: true,
    },
    busNumber: {
      type: String,
      required: [true, 'Bus number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['AC', 'Non-AC', 'Sleeper', 'Seater'],
      required: [true, 'Bus type is required'],
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
      min: [1, 'Bus must have at least 1 seat'],
    },
    seatLayout: {
      rows: { type: Number, required: true },
      cols: { type: Number, required: true },
      seats: { type: [seatSchema], required: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Bus', busSchema);
