import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Calendar, CalendarDays, AlignLeft, CloudSun,
  CheckCircle2, FolderOpen, Plus, X, ChevronDown, Tag, BarChart2
} from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Task, PROJECT_COLORS } from '../../types';
import { useTimerStore } from '../../store/timerStore';

export type SidebarView =
  | 'today' | 'tomorrow' | 'week' | 'planned' | 'someday'
  | 'completed' | 'all' | 'focus-week' | string; // string = project id or tag:tagname

interface SidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

function isToday(dueDate: Task['dueDate']) { return dueDate === 'today'; }
function isTomorrow(dueDate: Task['dueDate']) { return dueDate === 'tomorrow'; }

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { tasks, projects, addProject, deleteProject } = useTaskStore();
  const { settings } = useSettingsStore();
  const { todayFocusSeconds } = useTimerStore();
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[5]);
  const [showProjects, setShowProjects] = useState(true);
  const [showTags, setShowTags] = useState(true);

  const active = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  const todayTasks = active.filter((t) => isToday(t.dueDate));
  const tomorrowTasks = active.filter((t) => isTomorrow(t.dueDate));
  const somedayTasks = active.filter((t) => t.dueDate === 'someday');
  const plannedTasks = active.filter((t) => t.dueDate && t.dueDate !== 'someday');
  const allTasks = active;

  const todayEstimate = todayTasks.reduce((s, t) => {
    const workMin = t.customWorkDuration ?? settings.workDuration;
    return s + t.pomodoroEstimate * workMin * 60;
  }, 0);

  // Collect all unique tags from all tasks
  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags))).sort();

  const handleAddProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    await addProject(name, newProjectColor);
    setNewProjectName('');
    setAddingProject(false);
  };

  const navItems = [
    { id: 'today', label: 'Today', icon: <Sun size={14} />, count: todayTasks.length, time: todayEstimate },
    { id: 'tomorrow', label: 'Tomorrow', icon: <Calendar size={14} />, count: tomorrowTasks.length, time: 0 },
    { id: 'week', label: 'This Week', icon: <CalendarDays size={14} />, count: 0, time: 0 },
    { id: 'planned', label: 'Planned', icon: <AlignLeft size={14} />, count: plannedTasks.length, time: 0 },
    { id: 'someday', label: 'Someday', icon: <CloudSun size={14} />, count: somedayTasks.length, time: 0 },
    { id: 'completed', label: 'Completed', icon: <CheckCircle2 size={14} />, count: completed.length, time: 0 },
    { id: 'all', label: 'Tasks', icon: <FolderOpen size={14} />, count: allTasks.length, time: 0 },
    { id: 'focus-week', label: 'Focus Week', icon: <BarChart2 size={14} />, count: 0, time: 0 },
  ];

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{ background: 'var(--bg2)', borderRight: '1px solid var(--brd)' }}
    >
      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as SidebarView)}
              className="w-full flex items-center gap-2.5 px-3 py-2 transition-all duration-100 text-left"
              style={{
                background: isActive ? 'var(--card)' : 'transparent',
                color: isActive ? 'var(--t)' : 'var(--t2)',
                borderRadius: '8px',
                margin: '1px 6px',
                width: 'calc(100% - 12px)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--card)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ color: isActive ? 'var(--accent)' : 'var(--t3)', flexShrink: 0 }}>
                {item.icon}
              </span>
              <span className="flex-1 text-[13px] font-medium truncate">{item.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.time > 0 && (
                  <span className="text-[10px]" style={{ color: 'var(--t3)' }}>
                    {formatTime(item.time)}
                  </span>
                )}
                {item.count > 0 && (
                  <span
                    className="text-[11px] min-w-[18px] text-center"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--t3)' }}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Projects section */}
        <div className="mt-2 mx-2">
          <button
            onClick={() => setShowProjects(!showProjects)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t2)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
          >
            <ChevronDown
              size={11}
              style={{ transform: showProjects ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Projects</span>
          </button>

          <AnimatePresence>
            {showProjects && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {projects.map((proj) => {
                  const projTasks = active.filter((t) => t.projectId === proj.id);
                  const isActive = activeView === proj.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => onViewChange(proj.id)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all text-left group"
                      style={{
                        background: isActive ? 'var(--card)' : 'transparent',
                        color: isActive ? 'var(--t)' : 'var(--t2)',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--card)'; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: proj.color }}
                      />
                      <span className="flex-1 text-[13px] truncate">{proj.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProject(proj.id); }}
                          className="w-4 h-4 flex items-center justify-center rounded"
                          style={{ color: 'var(--t3)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#e8453c')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                        >
                          <X size={10} />
                        </button>
                      </div>
                      {projTasks.length > 0 && (
                        <span className="text-[11px] shrink-0" style={{ color: 'var(--t3)' }}>
                          {projTasks.length}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Add project */}
                <AnimatePresence>
                  {addingProject ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-2 py-2"
                    >
                      {/* Color picker */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {PROJECT_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setNewProjectColor(c)}
                            className="w-4 h-4 rounded-full transition-transform"
                            style={{
                              background: c,
                              transform: newProjectColor === c ? 'scale(1.3)' : 'scale(1)',
                              outline: newProjectColor === c ? `2px solid ${c}` : 'none',
                              outlineOffset: '1px',
                            }}
                          />
                        ))}
                      </div>
                      <input
                        autoFocus
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddProject();
                          if (e.key === 'Escape') { setAddingProject(false); setNewProjectName(''); }
                        }}
                        placeholder="Project name…"
                        className="w-full text-[12px] bg-transparent focus:outline-none border-b pb-1"
                        style={{ color: 'var(--t)', borderColor: 'var(--accent)' }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleAddProject}
                          className="text-[11px] px-2 py-1 rounded-md transition-colors"
                          style={{ background: 'var(--accent)', color: 'white' }}
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingProject(false); setNewProjectName(''); }}
                          className="text-[11px] px-2 py-1 rounded-md transition-colors"
                          style={{ background: 'var(--brd)', color: 'var(--t3)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setAddingProject(true)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--t3)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                    >
                      <Plus size={12} />
                      <span className="text-[12px]">Add Project</span>
                    </button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tags section */}
        {allTags.length > 0 && (
          <div className="mt-2 mx-2">
            <button
              onClick={() => setShowTags(!showTags)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t2)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
            >
              <ChevronDown
                size={11}
                style={{ transform: showTags ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tags</span>
            </button>

            <AnimatePresence>
              {showTags && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {allTags.map((tag) => {
                    const tagView = `tag:${tag}`;
                    const isActive = activeView === tagView;
                    const tagCount = tasks.filter((t) => !t.completed && t.tags.includes(tag)).length;
                    return (
                      <button
                        key={tag}
                        onClick={() => onViewChange(tagView)}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all text-left"
                        style={{
                          background: isActive ? 'var(--card)' : 'transparent',
                          color: isActive ? 'var(--t)' : 'var(--t2)',
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--card)'; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Tag size={11} style={{ color: isActive ? 'var(--accent)' : 'var(--t3)', flexShrink: 0 }} />
                        <span className="flex-1 text-[13px] truncate">{tag}</span>
                        {tagCount > 0 && (
                          <span className="text-[11px] shrink-0" style={{ color: isActive ? 'var(--accent)' : 'var(--t3)' }}>
                            {tagCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom: elapsed today */}
      <div
        className="px-3 py-3 border-t"
        style={{ borderColor: 'var(--brd)' }}
      >
        <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--t3)' }}>
          Today's Focus
        </div>
        <div className="text-[14px] font-medium" style={{ color: 'var(--accent)' }}>
          {formatTime(todayFocusSeconds)}
        </div>
      </div>
    </div>
  );
};
