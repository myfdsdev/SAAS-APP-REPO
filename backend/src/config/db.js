import mongoose from 'mongoose';

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set in environment. Add it to backend/.env');
    process.exit(1);
  }

  // Print BEFORE connect attempt so the user always sees something while we wait.
  console.log('🔌 Connecting to MongoDB…');

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // fail fast (10s) instead of hanging
    });

    console.log('='.repeat(50));
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
    console.log(`🟢 ReadyState: ${conn.connection.readyState} (1 = connected)`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // exit app if DB fails
  }
};

// Log when connection is lost
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

// Log when connection is re-established
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

export default connectDB;