import Attendance from "../models/Attendance.js";
import LeaveRequest from "../models/LeaveRequest.js";
import User from "../models/User.js";
import {
  checkAndAwardBadges,
  getConsecutiveAttendanceDays,
  getDailyPointDelta,
  getWeekRange,
  toDateString,
} from "../utils/badgeChecker.js";

const didProcessDate = (user, dateString) =>
  user.last_rank_calc && toDateString(user.last_rank_calc) >= dateString;

const updateRankings = async () => {
  const rankedUsers = await User.find({ is_active: { $ne: false } })
    .sort({ total_points: -1, full_name: 1 })
    .select("_id");

  await Promise.all(
    rankedUsers.map((user, index) =>
      User.findByIdAndUpdate(user._id, {
        current_rank: index + 1,
      }),
    ),
  );
};

const dayName = (dateString) =>
  new Date(`${dateString}T00:00:00.000Z`)
    .toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
    .toLowerCase();

const isWorkingDay = (user, dateString) => {
  const workingDays = user.working_days || [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ];
  return workingDays.includes(dayName(dateString));
};

const calculateWeeklyBonuses = async (user, dateString) => {
  const { startDate, endDate } = getWeekRange(dateString);
  const records = await Attendance.find({
    employee_id: user._id,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const lateCount = records.filter((record) => record.status === "late").length;
  const presentCount = records.filter((record) =>
    ["present", "late"].includes(record.status),
  ).length;

  let points = 0;
  if (dateString === endDate && records.length > 0 && lateCount === 0) points += 20;
  if (dateString === endDate && presentCount >= 5 && lateCount === 0) points += 50;
  return points;
};

export const runCalculatePoints = async (targetDate) => {
  const dateString =
    targetDate || toDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const users = await User.find({ is_active: { $ne: false } });

  for (const user of users) {
    if (didProcessDate(user, dateString)) continue;

    if (!isWorkingDay(user, dateString)) {
      user.last_rank_calc = new Date(`${dateString}T23:59:59.999Z`);
      await user.save();
      continue;
    }

    const attendance = await Attendance.findOne({
      employee_id: user._id,
      date: dateString,
    });

    const approvedLeave = await LeaveRequest.findOne({
      employee_email: user.email,
      status: "approved",
      start_date: { $lte: dateString },
      end_date: { $gte: dateString },
    });

    let points = approvedLeave ? 0 : getDailyPointDelta(attendance, user);
    points += await calculateWeeklyBonuses(user, dateString);

    const monthStart = dateString.slice(0, 8) + "01";
    const monthlyLeaves = await LeaveRequest.countDocuments({
      employee_email: user.email,
      status: "approved",
      start_date: { $lte: dateString },
      end_date: { $gte: monthStart },
    });
    if (monthlyLeaves > 3) points -= 15;

    const streakDays = await getConsecutiveAttendanceDays(user, dateString);
    if (streakDays === 30) points += 100;

    user.total_points = Math.max(0, (user.total_points || 0) + points);
    user.last_rank_calc = new Date(`${dateString}T23:59:59.999Z`);
    await checkAndAwardBadges(user, dateString);
    await user.save();
  }

  await updateRankings();
};

export default runCalculatePoints;
