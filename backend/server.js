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
import domainRoutes from "./src/routes/domain.Routes.js";
import connectDB from "./src/config/db.js";
import {
  allowedOrigins,
  isDirectlyAllowedOrigin,
  normalizeOrigin,
} from "./src/config/cors.js";
import { initCronJobs } from "./src/jobs/index.js";
import { startAutoCheckoutCron } from "./src/cron/autoCheckout.js";
import { resolveCompanyFromDomain } from "./src/middleware/domainResolver.js";
import Company from "./src/models/Company.js";
import "./src/config/cloudinary.js";
import "./src/config/email.js";
import { initSocket } from "./src/sockets/index.js";
import { errorHandler, notFound } from "./src/middleware/errorHandler.js";

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

const normalizeHostname = (value = "") =>
  normalizeOrigin(value)
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const MAIN_DOMAIN = normalizeHostname(process.env.MAIN_DOMAIN || "");

console.log("[CORS] Allowed Origins:", JSON.stringify(allowedOrigins));

// Cache verified custom domains so we don't hit Mongo on every preflight.
let customDomainCache = new Set();
let lastCacheRefresh = 0;

const refreshCustomDomains = async () => {
  try {
    const rows = await Company.find(
      { custom_domain_verified: true, custom_domain: { $ne: null } },
      "custom_domain",
    ).lean();

    customDomainCache = new Set(
      rows
        .map((row) => normalizeHostname(row.custom_domain))
        .filter(Boolean),
    );
    lastCacheRefresh = Date.now();
  } catch (err) {
    console.error("[CORS] failed to refresh custom-domain cache:", err.message);
  }
};

refreshCustomDomains();

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const cleanOrigin = normalizeOrigin(origin);
  if (isDirectlyAllowedOrigin(cleanOrigin)) return true;

  let host;
  try {
    host = new URL(cleanOrigin).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (
    MAIN_DOMAIN &&
    (host === MAIN_DOMAIN || host.endsWith(`.${MAIN_DOMAIN}`))
  ) {
    return true;
  }

  if (customDomainCache.has(host)) return true;

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    const cleanOrigin = normalizeOrigin(origin || "");

    console.log("[CORS] Incoming Origin:", cleanOrigin || null);

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    if (Date.now() - lastCacheRefresh > 60_000) {
      refreshCustomDomains().then(() => {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }

        console.warn("[CORS] Blocked origin:", cleanOrigin || null);
        return callback(null, false);
      });
      return;
    }

    console.warn("[CORS] Blocked origin:", cleanOrigin || null);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

// Resolve tenant company from Host header (subdomain or verified custom domain).
// Must run before routes so /api/domains/info and any tenant-aware code see it.
app.use(resolveCompanyFromDomain);

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

// Bust the cache as soon as a custom domain gets verified/removed.
export const invalidateCorsCache = () => refreshCustomDomains();

// ==========================================
// HEALTH CHECK
// ==========================================
app.get("/", (req, res) => {
  res.json({
    message: "Workflow API is running!",
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

app.get("/api/cors-test", (req, res) => {
  res.json({
    success: true,
    origin: req.headers.origin || null,
    allowedOrigins,
    frontendUrl: process.env.FRONTEND_URL || null,
  });
});

// ==========================================
// API ROUTES
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
app.use("/api/domains", domainRoutes);

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

const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log("=".repeat(50));
    console.log(`Server: ${process.env.NODE_ENV || "development"} mode`);
    console.log(`Local:  http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Socket: ws://localhost:${PORT}`);
    console.log("=".repeat(50));
    startAutoCheckoutCron();
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  httpServer.close(() => process.exit(1));
});
