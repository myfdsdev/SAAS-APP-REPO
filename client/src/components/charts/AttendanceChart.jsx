import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CalendarDays } from "lucide-react";

const intensityClass = {
  0: "bg-lime-400/10",
  1: "bg-lime-400/20",
  2: "bg-lime-400/35",
  3: "bg-lime-400/60",
  4: "bg-lime-300",
};

export default function AttendanceChart({ trend = [], heatmap = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-lime-300" />
          Attendance Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(163, 230, 53, 0.12)" />
              <XAxis dataKey="month" tick={{ fill: "rgba(236,255,220,0.55)", fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "rgba(236,255,220,0.55)", fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip
                formatter={(value, name) => [
                  name === "attendanceRate" ? `${value}%` : value,
                  name === "attendanceRate" ? "Attendance" : name,
                ]}
                contentStyle={{
                  background: "#020806",
                  color: "#fff",
                  border: "1px solid rgba(163, 230, 53, 0.18)",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.28)",
                }}
              />
              <Line
                type="monotone"
                dataKey="attendanceRate"
                stroke="#a3e635"
                strokeWidth={3}
                dot={{ r: 4, fill: "#a3e635" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-lime-100/45" />
            <p className="text-sm font-medium text-lime-100/60">Last 30 Days</p>
          </div>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(18px, 1fr))" }}
          >
            {heatmap.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.hours}h (${day.status})`}
                className={`aspect-square rounded-md ${intensityClass[day.intensity] || "bg-lime-400/10"}`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
