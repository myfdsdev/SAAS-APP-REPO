import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TaskRow from '../components/projects/TaskRow';
import AddTaskDialog from '../components/projects/AddTaskDialog';
import ManageMembersDialog from '../components/projects/ManageMembersDialog';

// Safe default columns if project doesn't have them set
const DEFAULT_COLUMNS = ['owner', 'status', 'due_date', 'priority', 'notes'];

export default function ProjectBoardPage() {
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  const openAddTask = urlParams.get('openAddTask');

  // Load current user
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Load project data
  useEffect(() => {
    if (!projectId) {
      setIsProjectLoading(false);
      return;
    }
    setIsProjectLoading(true);
    base44.entities.Project.filter({ id: projectId })
      .then((projects) => {
        if (projects && projects.length > 0) {
          setProject(projects[0]);
        } else {
          setProject(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load project:', err);
        setProject(null);
      })
      .finally(() => setIsProjectLoading(false));
  }, [projectId]);

  // Auto-open Add Task dialog
  useEffect(() => {
    if (openAddTask === 'true' && project && user) {
      setShowAddTask(true);
      const newUrl = window.location.pathname + '?projectId=' + projectId;
      window.history.replaceState({}, '', newUrl);
    }
  }, [openAddTask, project, user, projectId]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () =>
      base44.entities.Task.filter({ project_id: projectId }, 'position'),
    enabled: !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () =>
      base44.entities.ProjectMember.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) =>
      base44.entities.Task.update(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  // Loading state
  if (!user || isProjectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Project not found / no access
  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">
            Project not found or you don't have access
          </p>
          <Link to={createPageUrl('Projects')}>
            <Button variant="outline">Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  // Safe string comparison for membership
  const userId = String(user.id || user._id || '');
  const isMember = members.some((m) => String(m.user_id) === userId);
  const hasAccess = isAdmin || isMember;

  // SAFE: Always use valid columns array
  const enabledColumns = Array.isArray(project.enabled_columns) && project.enabled_columns.length
    ? project.enabled_columns
    : DEFAULT_COLUMNS;

  // Calculate progress
  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const statusWeights = {
      not_started: 0,
      working_on_it: 50,
      in_progress: 50,
      review: 75,
      done: 100,
      stuck: 25,
      todo: 0,
    };
    const totalProgress = tasks.reduce(
      (sum, task) => sum + (statusWeights[task.status] || 0),
      0
    );
    return Math.round(totalProgress / tasks.length);
  };

  const projectProgress = calculateProgress();

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">
            You don't have access to this project
          </p>
          <Link to={createPageUrl('Projects')}>
            <Button variant="outline">Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Projects')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {project.project_name}
                    </h1>
                    <div className="flex items-center gap-3">
                      <div className="w-48 bg-gray-200 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${projectProgress}%`,
                            backgroundColor: project.color || '#3B82F6',
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {projectProgress}%
                      </span>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMembers(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                {members.length} Members
              </Button>
              {(isAdmin || isMember) && (
                <Button
                  onClick={() => setShowAddTask(true)}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="w-full px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div
            className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-3.5 grid gap-3 items-center"
            style={{
              gridTemplateColumns: `220px ${enabledColumns
                .map((col) => {
                  if (col === 'owner') return '180px';
                  if (col === 'status') return '160px';
                  if (col === 'due_date') return '140px';
                  if (col === 'priority') return '120px';
                  if (col === 'files') return '100px';
                  if (col === 'notes') return '1fr';
                  return '140px';
                })
                .join(' ')} 60px`,
            }}
          >
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Task
            </div>
            {enabledColumns.includes('owner') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Owner
              </div>
            )}
            {enabledColumns.includes('status') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Status
              </div>
            )}
            {enabledColumns.includes('due_date') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Due Date
              </div>
            )}
            {enabledColumns.includes('priority') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Priority
              </div>
            )}
            {enabledColumns.includes('files') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Files
              </div>
            )}
            {enabledColumns.includes('notes') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Notes
              </div>
            )}
            <div />
          </div>

          {/* Task Rows */}
          <div>
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No tasks yet. Click "Add Task" to get started.
              </div>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={{ ...project, enabled_columns: enabledColumns }}
                  members={members}
                  isAdmin={isAdmin}
                  currentUserId={userId}
                  onUpdate={(data) =>
                    updateTaskMutation.mutate({ taskId: task.id, data })
                  }
                  onDelete={() => deleteTaskMutation.mutate(task.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddTaskDialog
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        project={project}
        members={members}
      />

      <ManageMembersDialog
        open={showMembers}
        onClose={() => setShowMembers(false)}
        project={project}
        members={members}
        isAdmin={isAdmin}
      />
    </div>
  );
}