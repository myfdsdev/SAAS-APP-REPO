import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log('='.repeat(50));
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
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