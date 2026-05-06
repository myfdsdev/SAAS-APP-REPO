/**
 * pages.config.js - Page routing configuration
 */

import AccessDenied from './pages/AccessDenied';
import AdminDashboard from './pages/AdminDashboard';
import AttendanceHistory from './pages/AttendanceHistory';
import AttendanceReports from './pages/AttendanceReports';
import Checkout from './pages/Checkout';
import CompleteProfile from './pages/CompleteProfile';
import CompanySetup from './pages/CompanySetup';
import Dashboard from './pages/Dashboard';
import DirectMessages from './pages/DirectMessages';
import EmployeeDetails from './pages/EmployeeDetails';
import Feedback from './pages/Feedback';
import Groups from './pages/Groups';
import LeaveRequests from './pages/LeaveRequests';
import MyProfile from './pages/MyProfile';
import Pricing from './pages/Pricing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ProjectBoard from './pages/ProjectBoard';
import Projects from './pages/Projects';
import Settings from './pages/Settings';
import Welcome from './pages/Welcome';
import __Layout from './Layout.jsx';
import Login from './pages/Login';
import Register from './pages/Register';
import Leaderboard from './pages/Leaderboard';
import MyStats from './pages/MyStats';
import ResetPassword from './pages/ResetPassword';
import SalaryManagement from './pages/admin/SalaryManagement';
import CompanySettings from './pages/admin/CompanySettings';
import MySalary from './pages/MySalary';
import SuperAdmin from './pages/SuperAdmin';

export const PAGES = {
    "AccessDenied": AccessDenied,
    "AdminDashboard": AdminDashboard,
    "AttendanceHistory": AttendanceHistory,
    "AttendanceReports": AttendanceReports,
    "Checkout": Checkout,
    "CompleteProfile": CompleteProfile,
    "CompanySetup": CompanySetup,
    "Dashboard": Dashboard,
    "DirectMessages": DirectMessages,
    "EmployeeDetails": EmployeeDetails,
    "Feedback": Feedback,
    "Groups": Groups,
    "Leaderboard": Leaderboard,
    "LeaveRequests": LeaveRequests,
    "MyProfile": MyProfile,
    "MySalary": MySalary,
    "MyStats": MyStats,
    "Pricing": Pricing,
    "PrivacyPolicy": PrivacyPolicy,
    "ProjectBoard": ProjectBoard,
    "Projects": Projects,
    "ResetPassword": ResetPassword,
    "SalaryManagement": SalaryManagement,
    "CompanySettings": CompanySettings,
    // Backwards-compat aliases for any old links to the previous salary pages
    "SalaryBoard": SalaryManagement,
    "SalaryConfig": SalaryManagement,
    "Settings": Settings,
    "SuperAdmin": SuperAdmin,
    "Welcome": Welcome,
    "Login": Login,
    "Register": Register,
};

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};
