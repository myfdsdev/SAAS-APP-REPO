import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const CompanyContext = createContext({
  company: null,
  employees: [],
  loading: false,
  refreshCompany: () => {},
  refreshEmployees: () => {},
});

export const CompanyProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshCompany = useCallback(async () => {
    if (!isAuthenticated || !user?.company_id) {
      setCompany(null);
      return null;
    }

    setLoading(true);
    try {
      const currentCompany = await base44.companies.my();
      setCompany(currentCompany);
      return currentCompany;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.company_id]);

  const refreshEmployees = useCallback(async () => {
    if (!isAuthenticated || !user?.company_id || user?.role !== "admin") {
      setEmployees([]);
      return [];
    }

    const rows = await base44.companies.employees.list();
    setEmployees(rows);
    return rows;
  }, [isAuthenticated, user?.company_id, user?.role]);

  useEffect(() => {
    refreshCompany().catch((error) => {
      console.error("[CompanyContext] Failed to load company:", error);
      setCompany(null);
    });
  }, [refreshCompany]);

  return (
    <CompanyContext.Provider
      value={{
        company,
        employees,
        loading,
        refreshCompany,
        refreshEmployees,
        setCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};
