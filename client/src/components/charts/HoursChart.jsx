import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";

export default function HoursChart({ data = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-lime-300" />
          Hours Per Day
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(163, 230, 53, 0.12)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "rgba(236,255,220,0.55)", fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "rgba(236,255,220,0.55)", fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#020806",
                  color: "#fff",
                  border: "1px solid rgba(163, 230, 53, 0.18)",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.28)",
                }}
                formatter={(value) => [`${value}h`, "Hours"]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Bar dataKey="hours" fill="#a3e635" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
