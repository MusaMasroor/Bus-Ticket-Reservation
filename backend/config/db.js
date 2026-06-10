import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

let retryCount = 0;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10s to find a server
      socketTimeoutMS: 45000,
      maxPoolSize: 10,                 // connection pool for concurrent requests
      retryWrites: true,               // auto-retry transient write failures
    });

    retryCount = 0; // reset on success
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    retryCount += 1;
    console.error(`❌ MongoDB connection error (attempt ${retryCount}/${MAX_RETRIES}): ${err.message}`);

    if (retryCount >= MAX_RETRIES) {
      console.error('💀 Max MongoDB connection retries reached. Shutting down.');
      process.exit(1);
    }

    console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectDB();
  }
};

// Connection event listeners
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔁 MongoDB reconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB runtime error: ${err.message}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 MongoDB connection closed (SIGINT).');
  process.exit(0);
});

export default connectDB;
