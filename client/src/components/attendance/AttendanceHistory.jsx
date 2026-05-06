import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";
import { Clock, Calendar } from "lucide-react";

// Calculate total hours worked in a day
const calculateTotalHours = (firstCheckIn, lastCheckOut) => {
  if (!firstCheckIn || !lastCheckOut) return null;
  
  try {
    const checkIn = new Date(firstCheckIn);
    const checkOut = new Date(lastCheckOut);
    
    const totalMinutes = differenceInMinutes(checkOut, checkIn);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return { hours, minutes, totalMinutes };
  } catch (error) {
    return null;
  }
};

const statusStyles = {
  present: "bg-emerald-100 text-emerald-700 border-emerald-200",
  absent: "bg-rose-100 text-rose-700 border-rose-200",
  late: "bg-yellow-100 text-yellow-700 border-yellow-200",
  half_day: "bg-orange-100 text-orange-700 border-orange-200",
  on_leave: "bg-blue-100 text-blue-700 border-blue-200",
};

const statusLabels = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
};

export default function AttendanceHistory({ attendance, limit }) {
  // Filter out records with no first_check_in (no actual session)
  const filteredData = attendance.filter(record => record.first_check_in);
  const displayData = limit ? filteredData.slice(0, limit) : filteredData;

  return (
    <Card className="border-0 shadow-sm bg-black text-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-lime-300" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayData.length === 0 ? (
            <p className="text-lime-100/35 text-center py-8">No attendance records yet</p>
          ) : (
            displayData.map((record, index) => {
              const timeWorked = calculateTotalHours(record.first_check_in, record.last_check_out);
              
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-4 rounded-xl bg-black border border-lime-400/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center">
                        <span className="text-xs uppercase font-semibold ">
                          {format(parseISO(record.date), "MMM")}
                        </span>
                        <span className="text-lg font-bold">
                          {format(parseISO(record.date), "d")}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white text-lg">
                          {format(parseISO(record.date), "EEEE")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {record.first_check_in ? '1 session today' : 'No session'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {timeWorked ? (
                        <>
                          <p className="text-xl font-bold text-white">
                            {timeWorked.hours}h {timeWorked.minutes}m
                          </p>
                          <p className="text-xs text-lime-100/45 uppercase">Total Worked</p>
                        </>
                      ) : (
                        <Badge className={`${statusStyles[record.status]} border capitalize`}>
                          {statusLabels[record.status] || record.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {record.first_check_in && (
                    <div className="flex items-center gap-2 text-sm bg-black rounded-lg p-3 border border-lime-400/10">
                      <Clock className="w-4 h-4 text-lime-100/45" />
                      <span className="font-medium text-lime-100/70">{format(new Date(record.first_check_in), 'HH:mm')}</span>
                      <span className="text-lime-100/40">-&gt;</span>
                      <span className="font-medium text-lime-100/70">{record.last_check_out ? format(new Date(record.last_check_out), 'HH:mm') : "Working..."}</span>
                      {timeWorked && (
                        <span className="ml-auto text-xs text-lime-300 font-medium">
                          {timeWorked.totalMinutes} minutes
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
