import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const CompanyContext = createContext({
  company: null,
  hostCompany: null,
  domainType: "main",
  employees: [],
  loading: false,
  refreshCompany: () => {},
  refreshEmployees: () => {},
});

const applyBranding = (company) => {
  if (!company) return;
  if (company.html_title) document.title = company.html_title;
  if (company.favicon) {
    document
      .querySelectorAll("link[rel*='icon']")
      .forEach((el) => el.parentNode?.removeChild(el));
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = company.favicon;
    document.head.appendChild(link);
  }
  if (company.primary_color) {
    document.documentElement.style.setProperty("--primary", company.primary_color);
  }
};

export const CompanyProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [company, setCompany] = useState(null);
  const [hostCompany, setHostCompany] = useState(null);
  const [domainType, setDomainType] = useState("main");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // On app load, ask the backend which company this hostname maps to.
  // Lets us apply branding before login and show subdomain/custom-domain context.
  useEffect(() => {
    let cancelled = false;
    base44.domains
      .info()
      .then((data) => {
        if (cancelled) return;
        setDomainType(data?.domain_type || "main");
        if (data?.company) {
          setHostCompany(data.company);
          applyBranding(data.company);
        }
      })
      .catch((err) => {
        console.error("[CompanyContext] domains.info failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCompany = useCallback(async () => {
    if (!isAuthenticated || !user?.company_id) {
      setCompany(null);
      return null;
    }

    setLoading(true);
    try {
      const currentCompany = await base44.companies.my();
      setCompany(currentCompany);
      applyBranding(currentCompany);
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
        hostCompany,
        domainType,
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
