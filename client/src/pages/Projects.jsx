import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Plus,
  FolderKanban,
  LayoutGrid,
  Search,
  Filter,
  Sparkles,
  Clock3,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Users,
  SlidersHorizontal,
} from "lucide-react";

import { formatDistanceToNow, isBefore, endOfWeek } from "date-fns";

import ProjectCard from "../components/projects/ProjectCard";
import CreateProjectDialog from "../components/projects/CreateProjectDialog";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const glassCard =
  "rounded-[1.6rem] border border-lime-400/15 bg-[#020806]/80 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)]";

const miniCard =
  "rounded-[1.25rem] border border-lime-400/15 bg-[#000000] backdrop-blur-xl shadow-[0_0_30px_rgba(132,255,0,0.04)]";

function Banner({ type = "success", message }) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-bold backdrop-blur-xl",
        type === "success"
          ? "border-lime-400/20 bg-lime-400/10 text-lime-300"
          : "border-red-400/20 bg-red-500/10 text-red-300"
      )}
    >
      <div className="flex items-start gap-2">
        {type === "success" ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>{message}</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className={`${glassCard} animate-pulse p-5`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="h-4 w-32 rounded bg-lime-400/10" />
            <div className="h-3 w-48 rounded bg-lime-400/10" />
          </div>
          <div className="h-10 w-10 rounded-2xl bg-lime-400/10" />
        </div>
        <div className="h-24 rounded-2xl bg-lime-400/10" />
      </div>
    </div>
  );
}

function InsightTile({ icon: Icon, label, value, tone = "green" }) {
  const tones = {
    green: "bg-lime-400/10 border-lime-400/20 text-lime-300",
    emerald: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
    amber: "bg-amber-400/10 border-amber-400/20 text-amber-300",
    rose: "bg-red-500/10 border-red-400/20 text-red-300",
    slate: "bg-white/5 border-lime-400/10 text-lime-100/70",
  };

  return (
    <div className={cn("rounded-2xl border px-4 py-3", tones[tone])}>
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <p className="truncate text-[10px] font-black uppercase tracking-[0.24em]">
          {label}
        </p>
      </div>
      <p className="break-words text-sm  text-white">{value}</p>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, accent = "green" }) {
  const accents = {
    green: "text-lime-300 bg-lime-400/10 border-lime-400/15",
    emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/15",
    amber: "text-amber-300 bg-amber-400/10 border-amber-400/15",
    rose: "text-red-300 bg-red-500/10 border-red-400/15",
  };

  return (
    <Card className={`${glassCard} relative overflow-hidden`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(132,255,0,0.12),transparent_34%)]" />

      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-lime-300/45">
              {title}
            </p>

            <h3 className="break-words text-[32px] font-black leading-none tracking-tight text-white drop-shadow-[0_0_18px_rgba(132,255,0,0.20)]">
              {value}
            </h3>

            <p className="break-words text-sm leading-6 text-lime-100/45">
              {subtitle}
            </p>
          </div>

          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
              accents[accent] || accents.green
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ isSearch, isAdmin, onCreate }) {
  return (
    <Card className={`${glassCard} overflow-hidden py-20 text-center`}>
      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-lime-400/15 bg-lime-400/10 shadow-[0_0_40px_rgba(132,255,0,0.08)]">
        <LayoutGrid className="h-10 w-10 text-lime-300" />
      </div>

      <h2 className="mb-2 text-xl font-black tracking-tight text-white">
        {isSearch ? "No projects match your search" : "No projects found"}
      </h2>

      <p className="mx-auto mb-8 max-w-md px-6 text-sm leading-7 text-lime-100/45">
        {isSearch
          ? "Try changing the search term, scope, or sort option."
          : isAdmin
          ? "Start by creating your first team workspace."
          : "No active projects are assigned to you yet."}
      </p>

      {isAdmin && !isSearch && (
        <Button
          onClick={onCreate}
          className="rounded-xl bg-lime-400 font-black text-black shadow-[0_0_24px_rgba(132,255,0,0.25)] hover:bg-lime-300"
        >
          Get Started
        </Button>
      )}
    </Card>
  );
}

export default function ProjectsPage() {
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [projectToDelete, setProjectToDelete] = useState(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    if (!feedback.message) return;

    const timer = setTimeout(() => {
      setFeedback({ type: "", message: "" });
    }, 3500);

    return () => clearTimeout(timer);
  }, [feedback]);

  const {
    data: projects = [],
    isLoading: projectsLoading,
    isError: projectsError,
  } = useQuery({
    queryKey: ["projects", user?.id, user?.role],
    queryFn: async () => {
      const allProjects = await base44.entities.Project.filter({
        is_archived: false,
      });

      if (user?.role === "admin") return allProjects;

      const memberships = await base44.entities.ProjectMember.filter({
        user_id: user?.id,
      });

      const memberProjectIds = memberships.map((m) => m.project_id);

      return allProjects.filter((p) => memberProjectIds.includes(p.id));
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ["projectMemberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      return await base44.entities.ProjectMember.filter({
        user_id: user.id,
      });
    },
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["projectTasksOverview", user?.role, user?.id],
    queryFn: async () => {
      const allTasks = await base44.entities.Task.list("-created_date", 500);

      if (user?.role === "admin") return allTasks;

      const userProjectIds = memberships.map((m) => m.project_id);

      return allTasks.filter((task) => userProjectIds.includes(task.project_id));
    },
    enabled: !!user && (user.role === "admin" || memberships.length >= 0),
    initialData: [],
  });

  const handleOpenProject = (projectId) => {
    navigate(createPageUrl("ProjectBoard") + `?projectId=${projectId}`);
  };

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId) => {
      await base44.entities.Project.delete(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectMemberships"] });
      queryClient.invalidateQueries({ queryKey: ["projectTasksOverview"] });

      setProjectToDelete(null);

      setFeedback({
        type: "success",
        message: "Project deleted successfully.",
      });
    },
    onError: () => {
      setProjectToDelete(null);

      setFeedback({
        type: "error",
        message: "Unable to delete this project. Please try again.",
      });
    },
  });

  const handleDeleteProject = (projectId) => {
    setProjectToDelete(projectId);
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;

    deleteProjectMutation.mutate(projectToDelete);
  };

  const myProjectIds = useMemo(
    () => memberships.map((m) => m.project_id),
    [memberships]
  );

  const totalProjects = projects.length;

  const myProjectsCount = projects.filter((p) =>
    myProjectIds.includes(p.id)
  ).length;

  const dueThisWeek = tasks.filter((task) => {
    if (!task?.due_date || task?.status === "done") return false;

    return isBefore(
      new Date(task.due_date),
      endOfWeek(new Date(), { weekStartsOn: 1 })
    );
  }).length;

  const overdueTasks = tasks.filter((task) => {
    if (!task?.due_date || task?.status === "done") return false;

    return isBefore(new Date(task.due_date), new Date());
  }).length;

  const recentlyUpdatedProject = projects[0] || null;

  const filteredProjects = useMemo(() => {
    let data = [...projects];

    if (scopeFilter === "mine") {
      data = data.filter((p) => myProjectIds.includes(p.id));
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();

      data = data.filter((p) =>
        [p.project_name, p.description, p.created_by_name, p.created_by]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    }

    data.sort((a, b) => {
      if (sortBy === "az") {
        return String(a.project_name || "").localeCompare(
          String(b.project_name || "")
        );
      }

      return (
        new Date(b.created_date || 0).getTime() -
        new Date(a.created_date || 0).getTime()
      );
    });

    return data;
  }, [projects, scopeFilter, searchQuery, sortBy, myProjectIds]);

  const overallLoading =
    !user || projectsLoading || membershipsLoading || tasksLoading;

  if (overallLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black p-4 text-white md:p-8 lg:p-12">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(132,255,0,0.13),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(0,255,163,0.10),transparent_30%),linear-gradient(135deg,#020617_0%,#020b08_45%,#000000_100%)]" />

        <div className="mx-auto max-w-7xl space-y-6">
          <div className={`${glassCard} animate-pulse p-8 md:p-10`}>
            <div className="space-y-4">
              <div className="h-10 w-60 rounded bg-lime-400/10" />
              <div className="h-4 w-80 rounded bg-lime-400/10" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          <div className={`${glassCard} animate-pulse p-5 md:p-6`}>
            <div className="h-14 rounded-2xl bg-lime-400/10" />
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black p-4 text-white md:p-8 lg:p-12">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(132,255,0,0.13),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(0,255,163,0.10),transparent_30%),linear-gradient(135deg,#020617_0%,#020b08_45%,#000000_100%)]" />
      <div className="fixed left-[-12%] top-[20%] -z-10 h-80 w-80 rounded-full bg-lime-400/10 blur-[100px]" />
      <div className="fixed right-[-10%] top-[-10%] -z-10 h-96 w-96 rounded-full bg-emerald-400/10 blur-[120px]" />

      <div className="mx-auto max-w-7xl space-y-6 overflow-x-hidden">
        <Banner type={feedback.type} message={feedback.message} />

        {projectsError && (
          <Banner
            type="error"
            message="Unable to load projects right now. Please refresh and try again."
          />
        )}

        <Card className={`${glassCard} relative overflow-hidden p-8 md:p-10`}>
          <div className="absolute right-0 top-0 -mr-24 -mt-24 h-80 w-80 rounded-full bg-lime-400/10 blur-[90px]" />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-lime-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Project Control Center
                </span>
              </div>

              <div className="mb-2 flex items-center gap-4">
                <div className="shrink-0 rounded-2xl border border-lime-400/15 bg-lime-400/10 p-3 shadow-[0_0_24px_rgba(132,255,0,0.12)]">
                  <FolderKanban className="h-8 w-8 text-lime-300" />
                </div>

                <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-white md:text-4xl">
                  Projects
                </h1>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-lime-100/45 md:text-[15px]">
                Manage workspace visibility, monitor task urgency, and quickly
                jump into active projects.
              </p>
            </div>

            {user.role === "admin" && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="h-12 w-full rounded-2xl border-0 bg-lime-400 px-5 font-semibold text-black shadow-[0_0_30px_rgba(132,255,0,0.28)] transition-all hover:bg-lime-300 xl:w-auto"
              >
                <Plus className="mr-2 h-5 w-5" />
                New Project
              </Button>
            )}
          </div>
        </Card>

        <Card className={`${glassCard} overflow-hidden`}>
          <CardContent className="p-5 md:p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InsightTile
                icon={LayoutGrid}
                label="Total Projects"
                value={`${totalProjects} active workspace${
                  totalProjects !== 1 ? "s" : ""
                }`}
                tone="green"
              />

              <InsightTile
                icon={Users}
                label="Assigned To Me"
                value={`${myProjectsCount} project${
                  myProjectsCount !== 1 ? "s" : ""
                }`}
                tone="emerald"
              />

              <InsightTile
                icon={Clock3}
                label="Due This Week"
                value={
                  dueThisWeek > 0
                    ? `${dueThisWeek} task${dueThisWeek > 1 ? "s" : ""}`
                    : "No upcoming due tasks"
                }
                tone="amber"
              />

              <InsightTile
                icon={ArrowUpRight}
                label="Recently Added"
                value={
                  recentlyUpdatedProject?.project_name
                    ? `${recentlyUpdatedProject.project_name} · ${formatDistanceToNow(
                        new Date(recentlyUpdatedProject.created_date),
                        { addSuffix: true }
                      )}`
                    : "No recent project"
                }
                tone={overdueTasks > 0 ? "rose" : "slate"}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Active Projects"
            value={totalProjects}
            subtitle="Currently visible workspaces"
            icon={FolderKanban}
            accent="green"
          />

          <MetricCard
            title="My Projects"
            value={myProjectsCount}
            subtitle="Projects assigned to you"
            icon={Users}
            accent="emerald"
          />

          <MetricCard
            title="Due This Week"
            value={dueThisWeek}
            subtitle="Open tasks nearing deadline"
            icon={Clock3}
            accent="amber"
          />

          <MetricCard
            title="Overdue"
            value={overdueTasks}
            subtitle={
              overdueTasks > 0 ? "Needs immediate attention" : "No overdue tasks"
            }
            icon={AlertCircle}
            accent={overdueTasks > 0 ? "rose" : "emerald"}
          />
        </div>

        <Card className={`${glassCard} overflow-hidden`}>
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-white">
                  Search & Filter
                </h3>

                <p className="mt-1 text-sm leading-6 text-lime-100/45">
                  Find projects faster and narrow the list by scope or sorting.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm font-bold text-lime-100/45">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-lime-300" />
                <span>{filteredProjects.length} matching project(s)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lime-300/45" />

                <input
                  type="text"
                  placeholder="Search by project name, description, or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-lime-400/15 bg-[#000000] pl-12 pr-4 text-lime-100 outline-none placeholder:text-lime-100/30 transition-all focus:border-lime-400/40 focus:ring-2 focus:ring-lime-400/20"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setScopeFilter("all")}
                  className={cn(
                    "h-14 rounded-2xl border px-5 text-sm font-semibold transition",
                    scopeFilter === "all"
                      ? "border-lime-400 bg-lime-400 text-black shadow-[0_0_22px_rgba(132,255,0,0.28)]"
                      : "border-lime-400/15 bg-[#000000]/80 text-lime-100/65 hover:border-lime-400/40 hover:text-white"
                  )}
                >
                  All Projects
                </button>

                <button
                  onClick={() => setScopeFilter("mine")}
                  className={cn(
                    "h-14 rounded-2xl border px-5 text-sm font-semibold transition",
                    scopeFilter === "mine"
                      ? "border-lime-400 bg-lime-400 text-black shadow-[0_0_22px_rgba(132,255,0,0.28)]"
                      : "border-lime-400/15 bg-[#000000] text-lime-100/65 hover:border-lime-400/40 hover:text-white"
                  )}
                >
                  Assigned to Me
                </button>
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-14 w-full appearance-none rounded-2xl border border-lime-400/15 bg-[#000000] px-4 pr-10 text-sm font-semibold text-lime-100 outline-none focus:border-lime-400/40 xl:w-[190px]"
                >
                  <option value="recent">Recently Created</option>
                  <option value="az">Alphabetical</option>
                </select>

                <Filter className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-300/45" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          {filteredProjects.length === 0 ? (
            <EmptyState
              isSearch={!!searchQuery.trim() || scopeFilter !== "all"}
              isAdmin={user.role === "admin"}
              onCreate={() => setShowCreateDialog(true)}
            />
          ) : (
            <div className={`${miniCard} p-4`}>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="min-w-0">
                    <ProjectCard
                      project={project}
                      onOpen={handleOpenProject}
                      onDelete={handleDeleteProject}
                      isAdmin={user.role === "admin"}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialog
          open={!!projectToDelete}
          onOpenChange={(open) => !open && setProjectToDelete(null)}
        >
          <AlertDialogContent className="rounded-3xl border border-lime-400/20 bg-[#020806] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="tracking-tight text-white">
                Delete Project?
              </AlertDialogTitle>

              <AlertDialogDescription className="leading-6 text-lime-100/45">
                This will permanently remove the project, its tasks, and team
                memberships. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl border-lime-400/20 bg-transparent text-white hover:bg-lime-400/10">
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={confirmDeleteProject}
                className="rounded-xl bg-red-500 font-black text-white hover:bg-red-400"
              >
                {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CreateProjectDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          currentUser={user}
        />
      </div>
    </div>
  );
}
