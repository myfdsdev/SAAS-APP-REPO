import Company from "../models/Company.js";

export const generatePrefix = (companyName = "") => {
  const words = String(companyName).trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return words.map((word) => word[0]).join("").toUpperCase().slice(0, 4);
  }

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  return "COM";
};

export const generateEmployeeId = (prefix, counter) => {
  const cleanPrefix = String(prefix || "COM").trim().toUpperCase().slice(0, 4);
  const paddedNumber = String(Number(counter || 1)).padStart(3, "0");
  return `${cleanPrefix}-${paddedNumber}`;
};

export const getNextEmployeeId = async (companyId) => {
  const company = await Company.findByIdAndUpdate(
    companyId,
    { $inc: { employee_counter: 1 } },
    { new: true },
  );

  if (!company) {
    throw new Error("Company not found while generating employee ID");
  }

  return generateEmployeeId(company.prefix, company.employee_counter);
};
