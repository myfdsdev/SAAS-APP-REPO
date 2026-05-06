import Attendance from "../models/Attendance.js";
import LeaveRequest from "../models/LeaveRequest.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (date) => new Date(date).toISOString().slice(0, 10);

const addDays = (dateKey, amount) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
};

const monthStart = (date = new Date()) =>
  toDateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));

const yearStart = (date = new Date()) =>
  toDateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 11, 1)));

const startOfWeek = (date = new Date()) => {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + offset);
  return toDateKey(utc);
};

const endOfWeek = (startDate) => addDays(startDate, 6);

const getHours = (record) => Number(record?.work_hours || record?.total_work_hours || 0);

const presentStatuses = ["present", "late", "half_day"];

const getAverageCheckIn = (records) => {
  const minutes = records
    .filter((record) => record.first_check_in)
    .map((record) => {
      const date = new Date(record.first_check_in);
      return date.getHours() * 60 + date.getMinutes();
    });

  if (!minutes.length) return "N/A";

  const average = Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length);
  const hours = Math.floor(average / 60);
  const mins = average % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(mins).padStart(2, "0")} ${suffix}`;
};

const getMostProductiveDay = (records) => {
  const grouped = {};
  records.forEach((record) => {
    const label = new Date(`${record.date}T00:00:00.000Z`).toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });
    if (!grouped[label]) grouped[label] = { hours: 0, count: 0 };
    grouped[label].hours += getHours(record);
    grouped[label].count += 1;
  });

  const [day] = Object.entries(grouped).sort(
    (a, b) => b[1].hours / b[1].count - a[1].hours / a[1].count,
  )[0] || ["N/A"];
  return day;
};

const getLongestPerfectStreak = (records) => {
  const presentDates = new Set(
    records.filter((record) => record.status === "present").map((record) => record.date),
  );
  const sortedDates = [...presentDates].sort();
  let longest = 0;
  let current = 0;
  let previous = null;

  sortedDates.forEach((date) => {
    current = previous && addDays(previous, 1) === date ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  });

  return longest;
};

const getMonthlyTrend = async (companyId, email, startDate) => {
  const trend = await Attendance.aggregate([
    { $match: { company_id: companyId, employee_email: email, date: { $gte: startDate } } },
    {
      $group: {
        _id: { $substr: ["$date", 0, 7] },
        totalHours: { $sum: "$work_hours" },
        present: {
          $sum: { $cond: [{ $in: ["$status", ["present", "late", "half_day"]] }, 1, 0] },
        },
        absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return trend.map((item) => ({
    month: item._id,
    totalHours: Number(item.totalHours.toFixed(1)),
    attendanceRate: item.total ? Math.round((item.present / item.total) * 100) : 0,
    present: item.present,
    late: item.late,
    absent: item.absent,
  }));
};

const getAnalyticsForUser = async (user) => {
  const today = toDateKey(new Date());
  const currentMonthStart = monthStart(new Date());
  const trendStart = yearStart(new Date());
  const last30Start = addDays(today, -29);
  const currentWeekStart = startOfWeek(new Date());
  const previousWeekStart = addDays(currentWeekStart, -7);
  const previousWeekEnd = addDays(currentWeekStart, -1);

  const [allRecords, monthRecords, last30Records, leaves, statusBreakdown, monthlyTrend] =
    await Promise.all([
      Attendance.find({ company_id: user.company_id, employee_email: user.email }).sort("date").lean(),
      Attendance.find({
        company_id: user.company_id,
        employee_email: user.email,
        date: { $gte: currentMonthStart, $lte: today },
      }).sort("date").lean(),
      Attendance.find({
        company_id: user.company_id,
        employee_email: user.email,
        date: { $gte: last30Start, $lte: today },
      }).sort("date").lean(),
      LeaveRequest.find({
        company_id: user.company_id,
        employee_email: user.email,
        status: "approved",
      }).lean(),
      Attendance.aggregate([
        {
          $match: {
            company_id: user.company_id,
            employee_email: user.email,
            date: { $gte: currentMonthStart },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalHours: { $sum: "$work_hours" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      getMonthlyTrend(user.company_id, user.email, trendStart),
    ]);

  const countByStatus = (records, status) => records.filter((record) => record.status === status).length;
  const monthHours = Math.max(0, monthRecords.reduce((sum, record) => sum + getHours(record), 0));
  const allTimeHours = Math.max(0, allRecords.reduce((sum, record) => sum + getHours(record), 0));
  const monthPresent = monthRecords.filter((record) => presentStatuses.includes(record.status)).length;
  const monthLate = countByStatus(monthRecords, "late");
  const monthHalf = countByStatus(monthRecords, "half_day");
  const monthAbsent = countByStatus(monthRecords, "absent");
  const attendancePercentage = monthRecords.length
    ? Math.min(100, Math.max(0, Math.round((monthPresent / monthRecords.length) * 100)))
    : 0;
  const averageHours = monthPresent ? monthHours / monthPresent : 0;
  const overtimeHours = monthRecords.reduce((sum, record) => sum + Math.max(0, getHours(record) - 8), 0);

  const currentWeekHours = allRecords
    .filter((record) => record.date >= currentWeekStart && record.date <= endOfWeek(currentWeekStart))
    .reduce((sum, record) => sum + getHours(record), 0);
  const previousWeekHours = allRecords
    .filter((record) => record.date >= previousWeekStart && record.date <= previousWeekEnd)
    .reduce((sum, record) => sum + getHours(record), 0);
  const weeklyDifference = Number((currentWeekHours - previousWeekHours).toFixed(1));

  const leavesByType = leaves.reduce(
    (acc, leave) => {
      acc[leave.leave_type] = (acc[leave.leave_type] || 0) + (leave.total_days || 1);
      return acc;
    },
    { sick: 0, casual: 0, annual: 0, unpaid: 0, maternity: 0, other: 0 },
  );

  const performanceScore = Math.round(
    Math.min(
      100,
      attendancePercentage * 0.45 +
        Math.min(100, (averageHours / 8) * 100) * 0.35 +
        Math.max(0, 100 - countByStatus(monthRecords, "late") * 10) * 0.2,
    ),
  );

  return {
    user: {
      id: user._id,
      full_name: user.full_name,
      email: user.email,
      department: user.department,
      employee_id: user.employee_id,
      profile_photo: user.profile_photo,
      role: user.role,
    },
    stats: {
      totalHoursMonth: Math.max(0, Number(monthHours.toFixed(1))),
      totalHoursAllTime: Math.max(0, Number(allTimeHours.toFixed(1))),
      presentDays: Math.max(0, monthPresent),
      purePresentDays: Math.max(0, countByStatus(monthRecords, "present")),
      lateDays: Math.max(0, monthLate),
      absentDays: Math.max(0, monthAbsent),
      halfDays: Math.max(0, monthHalf),
      attendancePercentage: Math.max(0, attendancePercentage),
      averageHoursPerDay: Math.max(0, Number(averageHours.toFixed(1))),
      overtimeHours: Math.max(0, Number(overtimeHours.toFixed(1))),
      performanceScore: Math.max(0, performanceScore),
      totalLeavesTaken: Math.max(0, leaves.reduce((sum, leave) => sum + (leave.total_days || 1), 0)),
      leavesByType,
    },
    charts: {
      hoursPerDay: last30Records.map((record) => ({
        date: record.date,
        label: record.date.slice(5),
        hours: Number(getHours(record).toFixed(1)),
        status: record.status,
      })),
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item._id,
        count: item.count,
        totalHours: Number(item.totalHours.toFixed(1)),
      })),
      monthlyTrend,
      heatmap: last30Records.map((record) => ({
        date: record.date,
        status: record.status,
        hours: Number(getHours(record).toFixed(1)),
        intensity: Math.min(4, Math.ceil(getHours(record) / 2)),
      })),
    },
    insights: {
      weeklyDifference,
      averageCheckInTime: getAverageCheckIn(monthRecords),
      mostProductiveDay: getMostProductiveDay(monthRecords),
      longestStreak: getLongestPerfectStreak(allRecords),
    },
  };
};

export const getMyAnalytics = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.user._id, company_id: req.company_id }).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(await getAnalyticsForUser(user));
});

export const getUserAnalytics = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, company_id: req.company_id }).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(await getAnalyticsForUser(user));
});

export const getTeamAnalytics = asyncHandler(async (req, res) => {
  const currentMonthStart = monthStart(new Date());
  const [users, attendance] = await Promise.all([
    User.countDocuments({ company_id: req.company_id, is_active: { $ne: false } }),
    Attendance.aggregate([
      { $match: { company_id: req.company_id, date: { $gte: currentMonthStart } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalHours: { $sum: "$work_hours" },
        },
      },
    ]),
  ]);

  const totalHours = attendance.reduce((sum, item) => sum + item.totalHours, 0);
  const present = attendance
    .filter((item) => presentStatuses.includes(item._id))
    .reduce((sum, item) => sum + item.count, 0);
  const total = attendance.reduce((sum, item) => sum + item.count, 0);

  res.json({
    users,
    totalHours: Number(totalHours.toFixed(1)),
    attendancePercentage: total ? Math.round((present / total) * 100) : 0,
    statusBreakdown: attendance.map((item) => ({
      status: item._id,
      count: item.count,
      totalHours: Number(item.totalHours.toFixed(1)),
    })),
  });
});

export const getUserTrends = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.userId,
    company_id: req.company_id,
  }).select("email company_id").lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(await getMonthlyTrend(req.company_id, user.email, yearStart(new Date())));
});
