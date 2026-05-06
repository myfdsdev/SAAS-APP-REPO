import React from "react";
import { Award, TrendingUp } from "lucide-react";

export default function RankBadge({ rank = 0, points = 0, className = "" }) {
  const rankLabel = rank ? `#${rank}` : "Unranked";

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <div className="rounded-xl bg-gray-50 px-3 py-3">
        <div className="flex items-center gap-2 text-gray-500">
          <Award className="h-4 w-4" />
          <span className="text-xs font-medium">Rank</span>
        </div>
        <p className="mt-1 text-xl font-bold text-gray-900">{rankLabel}</p>
      </div>
      <div className="rounded-xl bg-indigo-50 px-3 py-3">
        <div className="flex items-center gap-2 text-indigo-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">Points</span>
        </div>
        <p className="mt-1 text-xl font-bold text-gray-900">
          {Number(points || 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
