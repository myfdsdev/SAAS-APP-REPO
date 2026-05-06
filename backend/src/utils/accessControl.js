const now = () => new Date();

export const ACCESS_STATUSES = ["active", "blocked", "banned", "suspended"];
export const COMPANY_STATUSES = ["active", "blocked", "banned", "suspended", "deleted"];

const isFutureDate = (value) => {
  if (!value) return false;
  return new Date(value).getTime() > Date.now();
};

export const clearExpiredUserSuspension = async (user) => {
  if (
    user?.access_status === "suspended" &&
    user.suspended_until &&
    !isFutureDate(user.suspended_until)
  ) {
    user.access_status = "active";
    user.suspended_until = null;
    user.access_reason = "";
    await user.save();
  }
};

export const clearExpiredCompanySuspension = async (company) => {
  if (
    company?.status === "suspended" &&
    company.suspended_until &&
    !isFutureDate(company.suspended_until)
  ) {
    company.status = "active";
    company.is_active = true;
    company.suspended_until = null;
    company.status_reason = "";
    await company.save();
  }
};

export const getUserAccessBlock = (user) => {
  if (!user) return { code: "user_missing", message: "User not found" };
  if (user.is_active === false) {
    return { code: "deactivated", message: "Your account has been deactivated." };
  }

  if (user.access_status === "blocked") {
    return { code: "blocked", message: "Your account has been blocked." };
  }

  if (user.access_status === "banned") {
    return { code: "banned", message: "Your account has been banned." };
  }

  if (user.access_status === "suspended") {
    if (!user.suspended_until || isFutureDate(user.suspended_until)) {
      return {
        code: "suspended",
        message: user.suspended_until
          ? `Your account is suspended until ${new Date(user.suspended_until).toISOString()}.`
          : "Your account is suspended.",
      };
    }
  }

  return null;
};

export const getCompanyAccessBlock = (company) => {
  if (!company) return { code: "company_missing", message: "Company not found" };

  if (company.status === "deleted") {
    return { code: "deleted", message: "This company has been deleted." };
  }

  if (company.status === "blocked") {
    return { code: "blocked", message: "This company has been blocked." };
  }

  if (company.status === "banned") {
    return { code: "banned", message: "This company has been banned." };
  }

  if (company.status === "suspended") {
    if (!company.suspended_until || isFutureDate(company.suspended_until)) {
      return {
        code: "suspended",
        message: company.suspended_until
          ? `This company is suspended until ${new Date(company.suspended_until).toISOString()}.`
          : "This company is suspended.",
      };
    }
  }

  if (company.is_active === false) {
    return { code: "blocked", message: "This company has been blocked." };
  }

  return null;
};

export const buildSuspendedUntil = ({ suspended_until, duration_hours }) => {
  if (suspended_until) return new Date(suspended_until);
  const hours = Number(duration_hours || 0);
  if (hours > 0) return new Date(now().getTime() + hours * 60 * 60 * 1000);
  return null;
};
