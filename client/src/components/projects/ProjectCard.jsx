import React from "react";
import { motion } from "framer-motion";
import {
  FolderKanban,
  Users,
  Clock,
  ExternalLink,
  Trash2,
} from "lucide-react";

export default function ProjectCard({
  project,
  onOpen,
  onDelete,
  isAdmin,
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="
        relative rounded-[1.75rem]
        bg-[#000000]
        border border-lime-400/15
        shadow-[0_20px_60px_rgba(0,0,0,0.45)]
        p-5 overflow-hidden group
      "
    >
      {/* LEFT ACCENT GLOW */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#22c55e] to-[#16a34a]" />

      {/* TOP GLOW */}
      <div className="pointer-events-none absolute top-0 left-0 w-full h-[120px] bg-gradient-to-b from-[#22c55e]/10 to-transparent opacity-40" />

      {/* HEADER */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-[#22c55e]" />
          </div>

          <div>
            <h3 className="text-white font-semibold text-lg tracking-[-0.01em]">
              {project.project_name}
            </h3>

            <span className="text-[11px] px-2 py-1 rounded-full bg-[#111111] border border-[#1f2937] text-lime-100/55 uppercase tracking-[0.18em]">
              Not Started
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpen(project.id);
            }}
            className="w-9 h-9 rounded-xl bg-[#111111] border border-lime-400/15 flex items-center justify-center hover:bg-[#111827]"
          >
            <ExternalLink className="w-4 h-4 text-lime-100/55" />
          </button>

          {isAdmin && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete(project.id);
              }}
              className="w-9 h-9 rounded-xl bg-[#111111] border border-lime-400/15 flex items-center justify-center hover:bg-rose-500/20"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
            </button>
          )}
        </div>
      </div>

      {/* DESCRIPTION */}
      <p className="text-sm text-lime-100/55 mb-5 leading-6">
        {project.description || "No description added yet."}
      </p>

      {/* PROGRESS */}
      <div className="mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-lime-100/55">Progress</span>
          <span className="text-white font-medium">0%</span>
        </div>

        <div className="w-full h-2 bg-[#111111] rounded-full overflow-hidden">
          <div className="h-full w-[10%] bg-gradient-to-r from-[#22c55e] to-[#4ade80] rounded-full" />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#000000] border border-lime-400/15 rounded-xl p-3">
          <p className="text-xs text-lime-100/55 mb-1">Tasks</p>
          <p className="text-white font-semibold">0/0</p>
        </div>

        <div className="bg-[#000000] border border-lime-400/15 rounded-xl p-3">
          <p className="text-xs text-lime-100/55 mb-1">Members</p>
          <p className="text-white font-semibold">0</p>
        </div>

        <div className="bg-[#000000] border border-lime-400/15 rounded-xl p-3">
          <p className="text-xs text-lime-100/55 mb-1">Urgency</p>
          <p className="text-[#22c55e] font-semibold">On schedule</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between text-xs text-lime-100/45">
        <span>Created by {project.created_by_name || "Unknown"}</span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onOpen(project.id);
          }}
          className="text-[#22c55e] hover:underline"
        >
          Open Project
        </button>
      </div>
    </motion.div>
  );
}
