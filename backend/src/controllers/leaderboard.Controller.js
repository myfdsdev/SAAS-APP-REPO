import Achievement from "../models/Achievement.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  awardEmployeeOfMonth,
  calculateUserPointsForRange,
  getMonthRange,
} from "../utils/badgeChecker.js";

const getMonthBounds = (month) => {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthIndex] = month.split("-").map(Number);
    return getMonthRange(new Date(Date.UTC(year, monthIndex - 1, 1)));
  }
  return getMonthRange(new Date());
};

const buildLeaderboardEntry = (user, points, rank) => ({
  id: user._id,
  full_name: user.full_name,
  email: user.email,
  department: user.department,
  profile_photo: user.profile_photo,
  total_points: user.total_points || 0,
  monthly_points: points,
  current_rank: user.current_rank || rank,
  rank,
  badges: user.badges || [],
});

export const getLeaderboard = asyncHandler(async (req, res) => {
  const { month, limit = 50 } = req.query;
  const { startDate, endDate } = getMonthBounds(month);
  const users = await User.find({ company_id: req.company_id, is_active: { $ne: false } })
    .select("full_name email department profile_photo total_points current_rank badges")
    .lean();

  const entries = await Promise.all(
    users.map(async (user) => {
      const summary = await calculateUserPointsForRange(user, startDate, endDate);
      return { user, points: summary.points };
    }),
  );

  entries.sort((a, b) => b.points - a.points || (b.user.total_points || 0) - (a.user.total_points || 0));

  const leaderboard = entries
    .slice(0, parseInt(limit))
    .map((entry, index) => buildLeaderboardEntry(entry.user, entry.points, index + 1));

  res.json({
    month: month || startDate.slice(0, 7),
    startDate,
    endDate,
    leaderboard,
    me: leaderboard.find((entry) => entry.email === req.user.email) || null,
  });
});

export const getMyRankAndAchievements = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("full_name email department profile_photo total_points current_rank badges")
    .lean();
  const achievements = await Achievement.find({
    company_id: req.company_id,
    user_id: req.user._id,
  }).sort("-earned_date").lean();

  res.json({
    user,
    achievements,
  });
});

export const awardCurrentEmployeeOfMonth = asyncHandler(async (req, res) => {
  const { month } = req.body || {};
  const { startDate, endDate } = getMonthBounds(month);
  const users = await User.find({ company_id: req.company_id, is_active: { $ne: false } });

  const entries = await Promise.all(
    users.map(async (user) => {
      const summary = await calculateUserPointsForRange(user, startDate, endDate);
      return { user, points: summary.points };
    }),
  );

  entries.sort((a, b) => b.points - a.points);
  const winner = entries[0];

  if (!winner) {
    return res.status(404).json({ error: "No eligible users found" });
  }

  const earned = await awardEmployeeOfMonth(
    winner.user,
    month || startDate.slice(0, 7),
    winner.points,
  );
  await winner.user.save();

  res.json({
    winner: buildLeaderboardEntry(winner.user, winner.points, 1),
    earned,
  });
});
