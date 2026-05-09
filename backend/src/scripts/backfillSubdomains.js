import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Company from "../models/Company.js";

// One-shot backfill: assign a subdomain to every company that doesn't have one.
// Run once after deploying the subdomain feature.
const run = async () => {
  await connectDB();
  const companies = await Company.find({
    $or: [{ subdomain: { $exists: false } }, { subdomain: null }, { subdomain: "" }],
  });

  console.log(`Found ${companies.length} companies needing a subdomain`);

  for (const company of companies) {
    const subdomain = await Company.generateSubdomain(company.name || "company");
    company.subdomain = subdomain;
    await company.save();
    console.log(`  ${company.name} -> ${subdomain}`);
  }

  console.log("Done.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
