import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

// One-shot backfill: seed `User.workspaces[]` from the user's current
// `company_id` / `role` / `employee_id` so the chooser page lists their
// existing workspace right away. Idempotent — safe to run multiple times.
const run = async () => {
  await connectDB();

  const users = await User.find({
    company_id: { $ne: null },
  });

  console.log(`Scanning ${users.length} users with an active company...`);

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const existing = (user.workspaces || []).find(
      (w) => String(w.company_id) === String(user.company_id),
    );

    if (existing) {
      skipped += 1;
      continue;
    }

    user.workspaces = user.workspaces || [];
    user.workspaces.push({
      company_id: user.company_id,
      employee_id: user.employee_id || "",
      role: user.role === "admin" ? "admin" : "user",
      joined_at: user.joined_company_at || user.createdAt || new Date(),
      last_used_at: new Date(),
    });
    await user.save();
    updated += 1;
    console.log(`  ✓ ${user.email}  →  +1 workspace entry`);
  }

  console.log("");
  console.log(`Done. Updated: ${updated}, already had entry: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
