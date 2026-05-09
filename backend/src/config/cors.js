const normalizeOrigin = (value = "") =>
  value
    .toString()
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");

const rawAllowedOrigins = [
  ...(process.env.FRONTEND_URL || "").split(","),
  "https://attendease-6v4v.onrender.com",
  "https://saas-app-repo.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

const allowedOrigins = [
  ...new Set(rawAllowedOrigins.map(normalizeOrigin).filter(Boolean)),
];

const isDirectlyAllowedOrigin = (origin) => {
  if (!origin) return true;

  const cleanOrigin = normalizeOrigin(origin);
  return allowedOrigins.includes(cleanOrigin);
};

export { allowedOrigins, isDirectlyAllowedOrigin, normalizeOrigin };
