import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";

const COLORS = {
  present: "#10b981",
  late: "#f59e0b",
  absent: "#ef4444",
  half_day: "#6366f1",
  on_leave: "#3b82f6",
};

const labelMap = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  half_day: "Half Day",
  on_leave: "On Leave",
};

export default function StatusPieChart({ data = [] }) {
  const chartData = data.filter((item) => item.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-lime-300" />
          Status Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-[1fr_180px] gap-4 items-center">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={3}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={COLORS[entry.status] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, labelMap[name] || name]}
                  contentStyle={{
                    background: "#020806",
                    color: "#fff",
                    border: "1px solid rgba(163, 230, 53, 0.18)",
                    borderRadius: 12,
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.28)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {chartData.map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-xl border border-lime-400/10 bg-[#020806] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[item.status] || "#94a3b8" }}
                  />
                  <span className="text-sm text-lime-100/65">{labelMap[item.status] || item.status}</span>
                </div>
                <span className="text-sm font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
