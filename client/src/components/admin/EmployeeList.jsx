import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Users, Mail, Shield, User } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import OnlineStatusIndicator from './OnlineStatusIndicator';

export default function EmployeeList({ employees, todayAttendance = [] }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Initial state from props
    setOnlineUsers(employees);

    // Subscribe to real-time user updates
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'update') {
        setOnlineUsers(prev => 
          prev.map(u => u.id === event.id ? event.data : u)
        );
      }
    });

    return unsubscribe;
  }, [employees]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getUserOnlineStatus = (email) => {
    const user = onlineUsers.find(u => u.email === email);
    return user?.is_online || false;
  };

  const getTodayStatus = (email) => {
    const attendance = todayAttendance.find(a => a.employee_email === email);
    if (!attendance) return null;
    return attendance.status;
  };

  const getTodayWorkTime = (email) => {
    const attendance = todayAttendance.find(a => a.employee_email === email);
    if (!attendance?.first_check_in) return 'Not started';

    const start = new Date(attendance.first_check_in);
    const end = attendance.last_check_out ? new Date(attendance.last_check_out) : now;
    const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  };

  const statusStyles = {
    present: "bg-emerald-100 text-emerald-700",
    absent: "bg-rose-100 text-rose-700",
    late: "bg-orange-100 text-orange-700",
    half_day: "bg-amber-100 text-amber-700",
    on_leave: "bg-blue-100 text-blue-700",
  };

  return (
    <Card className="border border-lime-400/15 bg-black">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-white">
          <Users className="w-5 h-5 text-lime-300" />
          Employees
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {employees.length === 0 ? (
            <p className="text-lime-100/35 text-center py-8">No employees found</p>
          ) : (
            employees.map((employee, index) => {
              const status = getTodayStatus(employee.email);
              const isOnline = getUserOnlineStatus(employee.email);
              const todayWorkTime = getTodayWorkTime(employee.email);
              
              return (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    to={createPageUrl("EmployeeDetails") + `?id=${employee.id}`}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#020806] hover:bg-[#061006]/80 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-12 h-12 bg-lime-400/15 text-lime-300">
                          {employee.profile_photo ? (
                            <AvatarImage src={employee.profile_photo} alt={employee.full_name} />
                          ) : (
                            <AvatarFallback className="bg-lime-400/15 text-lime-300 font-semibold">
                              {getInitials(employee.full_name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          <OnlineStatusIndicator isOnline={isOnline} size="md" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white">{employee.full_name}</p>
                        <p className="text-sm text-lime-100/50 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{employee.email}</span>
                        </p>
                        {employee.department && (
                          <p className="text-xs text-lime-100/35">{employee.department}</p>
                        )}
                        <p className="mt-1 text-xs text-lime-300/80">
                          Today worked: {todayWorkTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {status && (
                        <Badge className={`${statusStyles[status]} capitalize`}>
                          {status.replace("_", " ")}
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={employee.role === "admin" 
                          ? "border-lime-400/25 text-lime-300" 
                          : "border-lime-400/15 text-lime-100/65"
                        }
                      >
                        {employee.role === "admin" ? (
                          <><Shield className="w-3 h-3 mr-1" /> Admin</>
                        ) : (
                          <><User className="w-3 h-3 mr-1" /> Employee</>
                        )}
                      </Badge>
                    </div>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
