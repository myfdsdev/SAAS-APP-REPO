import Achievement from "../models/Achievement.js";
import Attendance from "../models/Attendance.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Notification from "../models/Notification.js";
import Task from "../models/Task.js";

export const BADGES = {
  perfect_attendance: {
    name: "Perfect Attendance",
    icon: "Trophy",
  },
  early_bird: {
    name: "Early Bird",
    icon: "Clock",
  },
  streak_master: {
    name: "Streak Master",
    icon: "Flame",
  },
  overtime_hero: {
    name: "Overtime Hero",
    icon: "Dumbbell",
  },
  rising_star: {
    name: "Rising Star",
    icon: "Star",
  },
  employee_of_the_month: {
    name: "Employee of the Month",
    icon: "Crown",
  },
  goal_crusher: {
    name: "Goal Crusher",
    icon: "Target",
  },
  team_player: {
    name: "Team Player",
    icon: "Handshake",
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const toDateString = (date) => new Date(date).toISOString().slice(0, 10);

export const addDays = (dateString, amount) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateString(date);
};

export const getMonthRange = (date = new Date()) => {
  const value = new Date(date);
  const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  const end = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
  return { startDate: toDateString(start), endDate: toDateString(end) };
};

export const getPreviousMonthRange = (date = new Date()) => {
  const value = new Date(date);
  const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 0));
  return { startDate: toDateString(start), endDate: toDateString(end) };
};

export const getWeekRange = (dateString) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date.getTime() + mondayOffset * DAY_MS);
  const friday = new Date(monday.getTime() + 4 * DAY_MS);
  return { startDate: toDateString(monday), endDate: toDateString(friday) };
};

const parseMinutes = (time = "09:00") => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const getCheckInMinutes = (record) => {
  if (!record?.first_check_in) return null;
  const date = new Date(record.first_check_in);
  return date.getHours() * 60 + date.getMinutes();
};

export const getDailyPointDelta = (attendance, user) => {
  if (!attendance) return -20;

  let points = 0;
  const fullDayHours = 8;
  const halfDayHours = user?.half_day_hours || 4;

  if (attendance.status === "late") points -= 5;
  else if (attendance.status === "absent") points -= 20;
  else if (attendance.status === "half_day" || attendance.work_hours < halfDayHours) points -= 10;
  else points += 10;

  if ((attendance.work_hours || 0) >= fullDayHours) points += 5;
  if ((attendance.work_hours || 0) > fullDayHours) {
    points += Math.floor(attendance.work_hours - fullDayHours) * 3;
  }

  return points;
};

export const calculateUserPointsForRange = async (user, startDate, endDate) => {
  const records = await Attendance.find({
    company_id: user.company_id,
    employee_id: user._id,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const approvedLeaves = await LeaveRequest.countDocuments({
    company_id: user.company_id,
    employee_email: user.email,
    status: "approved",
    start_date: { $lte: endDate },
    end_date: { $gte: startDate },
  });

  let points = records.reduce((sum, record) => sum + getDailyPointDelta(record, user), 0);

  const lateEntries = records.filter((record) => record.status === "late").length;
  const presentDays = records.filter((record) =>
    ["present", "late"].includes(record.status) && (record.work_hours || 0) >= 4,
  ).length;
  const overtimeHours = records.reduce(
    (sum, record) => sum + Math.max(0, (record.work_hours || 0) - 8),
    0,
  );

  if (lateEntries === 0 && records.length > 0) points += 20;
  if (presentDays >= 5 && lateEntries === 0) points += 50;
  if (approvedLeaves > 3) points -= 15;

  return { points, records, approvedLeaves, lateEntries, presentDays, overtimeHours };
};

export const getConsecutiveAttendanceDays = async (user, endDate) => {
  const records = await Attendance.find({
    company_id: user.company_id,
    employee_id: user._id,
    date: { $lte: endDate },
    status: { $in: ["present", "late"] },
  })
    .select("date")
    .sort("-date")
    .lean();

  const dates = new Set(records.map((record) => record.date));
  let cursor = endDate;
  let streak = 0;

  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
};

const upsertAchievement = async (user, badgeType, metadata = {}) => {
  const badge = BADGES[badgeType];
  if (!badge) return null;

  const achievement = await Achievement.findOneAndUpdate(
    { company_id: user.company_id, user_id: user._id, badge_type: badgeType },
    {
      $setOnInsert: {
        company_id: user.company_id,
        user_id: user._id,
        badge_type: badgeType,
        badge_name: badge.name,
        earned_date: new Date(),
        metadata,
      },
    },
    { new: true, upsert: true, includeResultMetadata: true },
  );

  const created = Boolean(achievement.lastErrorObject?.upserted);
  if (created && !user.badges.includes(badgeType)) {
    user.badges.push(badgeType);
  }

  if (created) {
    await Notification.create({
      company_id: user.company_id,
      user_email: user.email,
      title: "Achievement Unlocked",
      message: `You earned ${badge.name} badge!`,
      type: "achievement",
      related_id: achievement.value?._id?.toString() || "",
    });
  }

  return created ? achievement.value : null;
};

export const checkAndAwardBadges = async (user, dateString = toDateString(new Date())) => {
  const earned = [];
  const { startDate, endDate } = getMonthRange(`${dateString}T00:00:00.000Z`);
  const previousMonth = getPreviousMonthRange(`${dateString}T00:00:00.000Z`);
  const currentMonth = await calculateUserPointsForRange(user, startDate, endDate);
  const priorMonth = await calculateUserPointsForRange(user, previousMonth.startDate, previousMonth.endDate);
  const streakDays = await getConsecutiveAttendanceDays(user, dateString);
  const officeStartMinutes = parseMinutes(user.office_start_time || "09:00");

  const monthRecords = currentMonth.records;
  const presentMonthDays = monthRecords.filter((record) =>
    ["present", "late"].includes(record.status),
  );
  const missedDays = monthRecords.filter((record) =>
    ["absent", "half_day"].includes(record.status),
  );
  const earlyRecords = presentMonthDays.filter((record) => {
    const checkIn = getCheckInMinutes(record);
    return checkIn !== null && checkIn <= officeStartMinutes - 15;
  });

  const badgeChecks = [
    [
      "perfect_attendance",
      presentMonthDays.length >= 20 && missedDays.length === 0,
      { days: presentMonthDays.length },
    ],
    [
      "early_bird",
      presentMonthDays.length >= 5 && earlyRecords.length === presentMonthDays.length,
      { early_days: earlyRecords.length },
    ],
    ["streak_master", streakDays >= 30, { streak_days: streakDays }],
    ["overtime_hero", currentMonth.overtimeHours >= 50, { hours: currentMonth.overtimeHours }],
    [
      "rising_star",
      priorMonth.points > 0 && currentMonth.points >= priorMonth.points * 1.2,
      { current_points: currentMonth.points, previous_points: priorMonth.points },
    ],
    ["goal_crusher", currentMonth.overtimeHours >= 10, { overtime_hours: currentMonth.overtimeHours }],
  ];

  try {
    const assignedTasks = await Task.countDocuments({
      company_id: user.company_id,
      assigned_to_email: user.email,
      status: "done",
    });
    badgeChecks.push(["team_player", currentMonth.approvedLeaves === 0 && assignedTasks > 0, { completed_tasks: assignedTasks }]);
  } catch {
    badgeChecks.push(["team_player", currentMonth.approvedLeaves === 0 && presentMonthDays.length >= 10, { leave_days: 0 }]);
  }

  for (const [badgeType, qualifies, metadata] of badgeChecks) {
    if (!qualifies) continue;
    const achievement = await upsertAchievement(user, badgeType, metadata);
    if (achievement) earned.push(achievement);
  }

  return earned;
};

export const awardEmployeeOfMonth = async (user, month, points) => {
  const achievement = await upsertAchievement(user, "employee_of_the_month", { month, points });
  return achievement ? [achievement] : [];
};
