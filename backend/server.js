// ==========================================
// IMPORTS
// ==========================================
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import authRoutes from "./src/routes/auth.Routes.js";
import userRoutes from "./src/routes/user.Routes.js";
import attendanceRoutes from "./src/routes/attendance.Routes.js";
import leaveRoutes from "./src/routes/leave.Routes.js";
import projectRoutes from "./src/routes/project.Routes.js";
import projectMemberRoutes from "./src/routes/projectMember.Routes.js";
import taskRoutes from "./src/routes/task.Routes.js";
import messageRoutes from "./src/routes/message.Routes.js";
import groupRoutes from "./src/routes/group.Routes.js";
import groupMemberRoutes from "./src/routes/groupMember.Routes.js";
import groupMessageRoutes from "./src/routes/groupMessage.Routes.js";
import notificationRoutes from "./src/routes/notification.Routes.js";
import companyRoutes from "./src/routes/company.Routes.js";
import subscriptionRoutes from "./src/routes/subscription.Routes.js";
import messageReminderRoutes from "./src/routes/messageReminder.Routes.js";
import attendanceSessionRoutes from "./src/routes/attendanceSession.Routes.js";
import uploadRoutes from "./src/routes/upload.Routes.js";
import functionsRoutes from "./src/routes/functions.Routes.js";
import appSettingsRoutes from "./src/routes/appSettings.Routes.js";
import shiftRoutes from "./src/routes/shift.Routes.js";
import activityRoutes from "./src/routes/activity.Routes.js";
import leaderboardRoutes from "./src/routes/leaderboard.Routes.js";
import analyticsRoutes from "./src/routes/analytics.Routes.js";
import salaryRoutes from "./src/routes/salary.Routes.js";
import feedbackRoutes from "./src/routes/feedback.Routes.js";
import superAdminRoutes from "./src/routes/superAdmin.Routes.js";
// Load env FIRST

// Config & middleware imports
import connectDB from "./src/config/db.js";
import { initCronJobs } from "./src/jobs/index.js";
import { startAutoCheckoutCron } from "./src/cron/autoCheckout.js";
import "./src/config/cloudinary.js";
import "./src/config/email.js";
import { initSocket } from "./src/sockets/index.js";
import { errorHandler, notFound } from "./src/middleware/errorHandler.js";

// Connect to MongoDB
connectDB();

// Init cron jobs (only in production or if explicitly enabled)
if (
  process.env.NODE_ENV === "production" ||
  process.env.ENABLE_CRON === "true"
) {
  initCronJobs();
}

// ==========================================
// CREATE EXPRESS APP + HTTP SERVER
// ==========================================
const app = express();
const httpServer = createServer(app); // for socket.io

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(helmet());

// Allow multiple frontend origins (dev + production)
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like Postman, mobile apps, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 500 : 5000, // generous in dev
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Only apply rate limiting in production, or less strictly in dev
if (process.env.NODE_ENV === "production") {
  app.use("/api", limiter);
}

// ==========================================
// HEALTH CHECK
// ==========================================
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Workflow API is running!",
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// ==========================================
// API ROUTES (we'll add these as we build)
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/app-settings", appSettingsRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/group-members", groupMemberRoutes);
app.use("/api/group-messages", groupMessageRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/project-members", projectMemberRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/message-reminders", messageReminderRoutes);
app.use("/api/attendance-sessions", attendanceSessionRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/functions", functionsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/super-admin", superAdminRoutes);

// ==========================================
// ERROR HANDLING (must be last!)
// ==========================================
app.use(notFound);
app.use(errorHandler);

// ==========================================
// INITIALIZE SOCKET.IO
// ==========================================
initSocket(httpServer);

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🚀 Server: ${process.env.NODE_ENV || "development"} mode`);
  console.log(`📍 Local:    http://localhost:${PORT}`);
  console.log(`💚 Health:   http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket:   ws://localhost:${PORT}`);
  console.log("=".repeat(50));

  // Tab-heartbeat-based auto-checkout
  startAutoCheckoutCron();
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  httpServer.close(() => process.exit(1));
});

