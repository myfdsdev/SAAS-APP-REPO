import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, subtitle, icon: Icon, color, delay = 0 }) {
  const colorStyles = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="p-5 md:p-6 hover:shadow-lg transition-shadow duration-300 border-2 border-lime-400/10  bg-black">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-100">{value}</p>
            {subtitle && (
              <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-transparent ${colorStyles[color]} `}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}