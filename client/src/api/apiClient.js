import axios from "axios";
import {
  connectSocket,
  subscribeToEntity,
  disconnectSocket,
} from "./socketClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ========== TOKEN ==========
const TOKEN_KEY = "workflow_token";
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};
export const getToken = () => localStorage.getItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      setToken(null);
      const publicPages = ["/Welcome", "/Login", "/Register", "/"];
      const currentPath = window.location.pathname;
      const isOnPublicPage = publicPages.some(
        (p) => currentPath === p || currentPath.startsWith(p + "?"),
      );
      if (!isOnPublicPage) window.location.href = "/Welcome";
    }
    return Promise.reject(err.response?.data || err);
  },
);

// ========== ENTITY ROUTES ==========
const ENTITY_ROUTES = {
  User: "/users",
  Attendance: "/attendance",
  AttendanceSession: "/attendance-sessions",
  LeaveRequest: "/leave",
  Notification: "/notifications",
  Message: "/messages",
  MessageReminder: "/message-reminders",
  Group: "/groups",
  GroupMember: "/group-members",
  GroupMessage: "/group-messages",
  Project: "/projects",
  ProjectMember: "/project-members",
  Task: "/tasks",
  Company: "/companies",
  Subscription: "/subscriptions",
  Achievement: "/leaderboard/me",
};

// ========== HELPERS ==========
const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  return (
    data.records ||
    data.users ||
    data.leaves ||
    data.notifications ||
    data.groups ||
    data.messages ||
    data.projects ||
    data.tasks ||
    data.companies ||
    data.subscriptions ||
    []
  );
};

const stripZ = (dateStr) => {
  if (!dateStr) return dateStr;
  if (typeof dateStr !== "string") {
    dateStr = new Date(dateStr).toISOString();
  }
  return dateStr.endsWith("Z") ? dateStr.slice(0, -1) : dateStr;
};

const normalizeItem = (item) => {
  if (!item || typeof item !== "object") return item;
  return {
    ...item,
    id: item.id || item._id,
    created_date: item.created_date || stripZ(item.createdAt),
    updated_date: item.updated_date || stripZ(item.updatedAt),
  };
};

const normalizeItems = (items) => items.map(normalizeItem);

const translateField = (s) => {
  if (typeof s !== "string") return s;
  return s
    .replace(/created_date/g, "createdAt")
    .replace(/updated_date/g, "updatedAt");
};

// ========== ENTITY FACTORY ==========
const createEntity = (entityName) => {
  const route = ENTITY_ROUTES[entityName];
  if (!route) throw new Error(`Unknown entity: ${entityName}`);

  const translateFilter = (filterObj) => {
    const translated = { ...filterObj };
    if (translated.id) {
      translated._id = translated.id;
      delete translated.id;
    }
    return translated;
  };

  return {
    list: async (sort = "-createdAt", limit = 100) => {
      const res = await api.get(route, {
        params: { sort: translateField(sort), limit },
      });
      return normalizeItems(normalizeList(res.data));
    },
    filter: async (filterObj = {}, sort = "-createdAt", limit = 100) => {
      const res = await api.get(`${route}/filter`, {
        params: {
          ...translateFilter(filterObj),
          sort: translateField(sort),
          limit,
        },
      });
      return normalizeItems(normalizeList(res.data));
    },
    get: async (id) => {
      const res = await api.get(`${route}/${id}`);
      return normalizeItem(res.data);
    },
    create: async (data) => {
      const res = await api.post(route, data);
      return normalizeItem(res.data.user || res.data);
    },
    update: async (id, data) => {
      if (entityName === "Notification" && data.is_read === true) {
        const res = await api.put(`${route}/${id}/read`, {});
        return normalizeItem(res.data);
      }
      if (entityName === "Message" && data.is_read === true) {
        const res = await api.put(`${route}/${id}`, data);
        return normalizeItem(res.data);
      }
      const res = await api.put(`${route}/${id}`, data);
      return normalizeItem(res.data.user || res.data);
    },
    delete: async (id) => {
      const res = await api.delete(`${route}/${id}`);
      return res.data;
    },
    // REAL-TIME: subscribe to socket events for this entity
    // Returns unsubscribe function
    subscribe: (callback) => subscribeToEntity(entityName, callback),
  };
};

// ========== AUTH ==========
const auth = {
  me: async () => {
    const token = getToken();
    if (!token) {
      const err = new Error("Not authenticated");
      err.status = 401;
      throw err;
    }
    const res = await api.get("/auth/me");
    // Connect socket once we're logged in
    connectSocket();
    return normalizeItem(res.data);
  },
  googleLogin: async (credential) => {
    const res = await api.post("/auth/google", { credential });

    if (res.data.token) {
      setToken(res.data.token);
      connectSocket();
    }

    return res.data;
  },
  updateMe: async (data) => {
    const res = await api.put("/auth/update-profile", data);
    return normalizeItem(res.data.user || res.data);
  },
  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data.token) {
      setToken(res.data.token);
      connectSocket();
    }
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post("/auth/register", userData);
    disconnectSocket();
    setToken(null);
    return res.data;
  },
  logout: async (redirectUrl) => {
    try {
      await api.post("/auth/logout");
    } catch {}
    disconnectSocket();
    setToken(null);
    window.location.href = redirectUrl || "/Welcome";
  },
  redirectToLogin: (fromUrl) => {
    window.location.href = `/Welcome?from=${encodeURIComponent(
      fromUrl || window.location.href,
    )}`;
  },
  updateProfile: async (data) => {
    const res = await api.put("/auth/update-profile", data);
    return normalizeItem(res.data.user || res.data);
  },
  changePassword: async (currentPassword, newPassword) => {
    const res = await api.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return res.data;
  },
};

// ========== FUNCTIONS ==========
const FUNCTION_ROUTES = {
  calculateAttendance: "/functions/calculate-attendance",
  checkMessageReminders: "/functions/check-message-reminders",
  exportAttendanceReport: "/functions/export-attendance-report",
  notifyNewMessage: "/functions/notify-new-message",
  processPayment: "/functions/process-payment",
  sendAttendanceReminder: "/functions/send-attendance-reminder",
  getUsersForMessaging: "/functions/get-users-for-messaging",
};

const functions = {
  invoke: async (functionName, data = {}, options = {}) => {
    const route = FUNCTION_ROUTES[functionName];
    if (!route) {
      console.error(`[apiClient] Unknown function: ${functionName}`);
      throw new Error(`Unknown function: ${functionName}`);
    }
    const isFileDownload =
      data.format === "pdf" ||
      data.format === "excel" ||
      options.responseType === "blob";
    const res = await api.post(route, data, {
      responseType: isFileDownload ? "blob" : "json",
    });
    return res.data;
  },
  calculateAttendance: (data) =>
    api.post("/functions/calculate-attendance", data).then((r) => r.data),
  checkMessageReminders: () =>
    api.post("/functions/check-message-reminders").then((r) => r.data),
  exportAttendanceReport: async ({ month, format = "pdf" }) => {
    const res = await api.post(
      "/functions/export-attendance-report",
      { month, format },
      {
        responseType: format === "pdf" || format === "excel" ? "blob" : "json",
      },
    );
    return res.data;
  },
  notifyNewMessage: (data) =>
    api.post("/functions/notify-new-message", data).then((r) => r.data),
  processPayment: (data) =>
    api.post("/functions/process-payment", data).then((r) => r.data),
  sendAttendanceReminder: () =>
    api.post("/functions/send-attendance-reminder").then((r) => r.data),
  getUsersForMessaging: () =>
    api.post("/functions/get-users-for-messaging").then((r) => r.data),
};

// ========== ATTENDANCE ACTIONS ==========
const attendance = {
  checkIn: async (data = {}) => {
    const res = await api.post("/attendance/check-in", data);
    return normalizeItem(res.data);
  },
  checkOut: async (data = {}) => {
    const res = await api.post("/attendance/check-out", data);
    return normalizeItem(res.data);
  },
  today: async () => {
    const res = await api.get("/attendance/today");
    return normalizeItem(res.data);
  },
};

// ========== INTEGRATIONS ==========
const integrations = {
  Core: {
    UploadFile: async ({ file, folder = "general" }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return {
        file_url: res.data.url,
        url: res.data.url,
        public_id: res.data.public_id,
        ...res.data,
      };
    },
  },
};

// ========== UPLOAD ==========
const upload = {
  file: async (file, folder = "general") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await api.post("/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  profilePhoto: async (file) => {
    const fd = new FormData();
    fd.append("photo", file);
    const res = await api.post("/upload/profile-photo", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  projectFile: async (projectId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post(`/upload/project/${projectId}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  groupPhoto: async (groupId, file) => {
    const fd = new FormData();
    fd.append("photo", file);
    const res = await api.post(`/upload/group/${groupId}/photo`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  messageAttachment: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/upload/message-attachment", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

// ========== USERS (admin invite) ==========
const users = {
  inviteUser: async (email, role = "user", extraData = {}) => {
    const res = await api.post("/users/invite", {
      email,
      role,
      full_name: extraData.full_name || email.split("@")[0],
      ...extraData,
    });
    return res.data;
  },
  adminUpdate: async (userId, data) => {
    const res = await api.put(`/users/${userId}`, data);
    return normalizeItem(res.data.user || res.data);
  },
  adminDelete: async (userId) => {
    const res = await api.delete(`/users/${userId}`);
    return res.data;
  },
  sendPasswordReset: async (userId) => {
    const res = await api.post(`/users/${userId}/send-password-reset`, {});
    return res.data;
  },
  getById: async (userId) => {
    const res = await api.get(`/users/${userId}`);
    return normalizeItem(res.data.user || res.data);
  },
};

// ========== SHIFTS ==========
const shifts = {
  list: async () => {
    const res = await api.get("/shifts");
    return res.data;
  },
  create: async ({ name, start_time, end_time }) => {
    const res = await api.post("/shifts", { name, start_time, end_time });
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/shifts/${id}`, data);
    return res.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/shifts/${id}`);
    return res.data;
  },
  assignToUser: async (userId, shiftId) => {
    const res = await api.put(`/shifts/assign/${userId}`, { shift_id: shiftId });
    return res.data;
  },
};

// ========== LEADERBOARD ==========
const leaderboard = {
  list: async ({ month, limit = 50 } = {}) => {
    const res = await api.get("/leaderboard", {
      params: { month, limit },
    });
    return res.data;
  },
  me: async () => {
    const res = await api.get("/leaderboard/me");
    return res.data;
  },
  awardEmployeeOfMonth: async (month) => {
    const res = await api.post("/leaderboard/employee-of-month", { month });
    return res.data;
  },
};

// ========== ANALYTICS ==========
const analytics = {
  me: async () => {
    const res = await api.get("/analytics/me");
    return res.data;
  },
  user: async (userId) => {
    const res = await api.get(`/analytics/user/${userId}`);
    return res.data;
  },
  team: async () => {
    const res = await api.get("/analytics/team");
    return res.data;
  },
  trends: async (userId) => {
    const res = await api.get(`/analytics/trends/${userId}`);
    return res.data;
  },
};

// ========== FEEDBACK ==========
const feedback = {
  create: async (data) => {
    const res = await api.post("/feedback", data);
    return normalizeItem(res.data);
  },
  mine: async () => {
    const res = await api.get("/feedback/me");
    return normalizeItems(normalizeList(res.data));
  },
  all: async (filters = {}) => {
    const res = await api.get("/feedback", { params: filters });
    return {
      ...res.data,
      feedback: normalizeItems(normalizeList(res.data.feedback)),
    };
  },
  update: async (id, data) => {
    const res = await api.put(`/feedback/${id}`, data);
    return normalizeItem(res.data);
  },
};

// ========== APP LOGS (no-op) ==========
const appLogs = {
  logUserInApp: async (pageName) => ({ success: true }),
};

// ========== SALARY (simplified) ==========
const salary = {
  // Admin: list all employees with payslip status for a given month
  employees: async (month) => {
    const res = await api.get("/salary/employees", { params: { month } });
    return res.data;
  },
  payslips: {
    // Admin: list all payslips (optionally filtered)
    list: async (filters = {}) => {
      const res = await api.get("/salary/payslips", { params: filters });
      return res.data;
    },
    // Employee: list own payslips
    listMine: async () => {
      const res = await api.get("/salary/payslips/me");
      return res.data;
    },
    get: async (id) => {
      const res = await api.get(`/salary/payslips/${id}`);
      return res.data;
    },
    // Admin: create or update a payslip (status -> draft)
    upsert: async (data) => {
      const res = await api.post("/salary/payslip", data);
      return res.data;
    },
    // Admin: generate PDF, email it, mark sent
    send: async (id) => {
      const res = await api.put(`/salary/payslip/${id}/send`, {});
      return res.data;
    },
    delete: async (id) => {
      const res = await api.delete(`/salary/payslip/${id}`);
      return res.data;
    },
    pdfUrl: (id) => `/salary/payslips/${id}/pdf`,
  },
};

// ========== COMPANIES / TENANT ==========
const companies = {
  create: async (data) => {
    const res = await api.post("/companies/create", data);
    return res.data;
  },
  join: async (data) => {
    const res = await api.post("/companies/join", data);
    return res.data;
  },
  my: async () => {
    const res = await api.get("/companies/my");
    return normalizeItem(res.data);
  },
  update: async (data) => {
    const res = await api.put("/companies/my", data);
    return normalizeItem(res.data);
  },
  regenerateCode: async () => {
    const res = await api.post("/companies/regenerate-code", {});
    return res.data;
  },
  inviteByEmail: async (email) => {
    const res = await api.post("/companies/invite-email", { email });
    return res.data;
  },
  invites: async () => {
    const res = await api.get("/companies/invites");
    return normalizeItems(normalizeList(res.data));
  },
  employees: {
    list: async () => {
      const res = await api.get("/companies/employees");
      return normalizeItems(normalizeList(res.data));
    },
    updateEmployeeId: async (userId, employee_id) => {
      const res = await api.put(`/companies/employee/${userId}/employee-id`, {
        employee_id,
      });
      return normalizeItem(res.data);
    },
  },
};

// ========== SUPER ADMIN ==========
const superAdmin = {
  companies: {
    list: async (params = {}) => {
      const res = await api.get("/super-admin/companies", { params });
      return res.data;
    },
    details: async (companyId) => {
      const res = await api.get(`/super-admin/companies/${companyId}`);
      return res.data;
    },
    setStatus: async (companyId, data) => {
      const res = await api.put(`/super-admin/companies/${companyId}/status`, data);
      return res.data;
    },
    remove: async (companyId, reason = "") => {
      const res = await api.delete(`/super-admin/companies/${companyId}`, {
        data: { reason },
      });
      return res.data;
    },
  },
  users: {
    list: async (params = {}) => {
      const res = await api.get("/super-admin/users", { params });
      return res.data;
    },
    setRole: async (userId, role) => {
      const res = await api.put(`/super-admin/users/${userId}/role`, { role });
      return res.data;
    },
    setAccess: async (userId, data) => {
      const res = await api.put(`/super-admin/users/${userId}/access`, data);
      return res.data;
    },
  },
};

// ========== BUILD ENTITIES ==========
const entities = {};
for (const name of Object.keys(ENTITY_ROUTES)) {
  entities[name] = createEntity(name);
}

entities.Message.markConversationRead = async (senderId) => {
  const res = await api.put(`/messages/mark-read/${senderId}`, {});
  return res.data;
};

entities.GroupMessage.getByGroup = async (groupId, { limit = 100, before } = {}) => {
  const res = await api.get("/group-messages", {
    params: {
      group_id: groupId,
      limit,
      ...(before ? { before } : {}),
    },
  });
  return normalizeItems(normalizeList(res.data));
};

// ========== EXPORT ==========
export const base44 = {
  entities,
  auth,
  functions,
  attendance,
  integrations,
  upload,
  users,
  appLogs,
  shifts,
  leaderboard,
  analytics,
  feedback,
  salary,
  companies,
  superAdmin,
  api,
  appSettings: {
    get: async () => {
      const res = await api.get("/app-settings");
      return res.data;
    },
    update: async (data) => {
      const res = await api.put("/app-settings", data);
      return res.data;
    },
  },
};

export default api;
