import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Calendar, CalendarDays, AlignLeft, CloudSun,
  CheckCircle2, FolderOpen, Plus, X, ChevronDown, Tag, BarChart2, Inbox, Bookmark,
} from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Task, PROJECT_COLORS, resolveDueDateToTs, SavedView } from '../../types';
import { useTimerStore } from '../../store/timerStore';

export type SidebarView =
  | 'inbox' | 'today' | 'tomorrow' | 'week' | 'planned' | 'someday'
  | 'completed' | 'all' | 'focus-week' | string; // string = project id or tag:tagname

interface SidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  onLoadSavedView?: (view: SavedView) => void;
}

function isToday(dueDate: Task['dueDate']) { return dueDate === 'today'; }
function isTomorrow(dueDate: Task['dueDate']) { return dueDate === 'tomorrow'; }

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, onLoadSavedView }) => {
  const { tasks, projects, addProject, deleteProject } = useTaskStore();
  const { settings, updateSettings } = useSettingsStore();
  const { todayFocusSeconds } = useTimerStore();
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[5]);
  const [showProjects, setShowProjects] = useState(true);
  const [showTags, setShowTags] = useState(true);
  const [showSavedViews, setShowSavedViews] = useState(true);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const savedViews = settings.savedViews ?? [];

  const renameSavedView = async (id: string, name: string) => {
    const next = savedViews.map((v) => v.id === id ? { ...v, name } : v);
    await updateSettings({ savedViews: next });
  };
  const deleteSavedView = async (id: string) => {
    await updateSettings({ savedViews: savedViews.filter((v) => v.id !== id) });
  };

  const active = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  const inboxCount = active.filter((t) => !t.dueDate && !t.projectId).length;

  const todayTasks = active.filter((t) => isToday(t.dueDate));
  const tomorrowTasks = active.filter((t) => isTomorrow(t.dueDate));
  const somedayTasks = active.filter((t) => t.dueDate === 'someday');
  const plannedTasks = active.filter((t) => t.dueDate && t.dueDate !== 'someday');
  const allTasks = active;

  const overdueCount = (() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return active.filter((t) => {
      if (!t.dueDate || t.dueDate === 'someday') return false;
      const ts = resolveDueDateToTs(t.dueDate);
      return ts !== null && ts < now.getTime();
    }).length;
  })();

  const todayEstimate = todayTasks.reduce((s, t) => {
    const proj = t.projectId ? projects.find((p) => p.id === t.projectId) : undefined;
    const workMin = t.customWorkDuration ?? proj?.customWorkDuration ?? settings.workDuration;
    return s + t.pomodoroEstimate * workMin * 60;
  }, 0);

  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags))).sort();

  const handleAddProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    await addProject(name, newProjectColor);
    setNewProjectName('');
    setAddingProject(false);
  };

  const thisWeekCount = (() => {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return active.filter((t) => {
      if (!t.dueDate || t.dueDate === 'someday') return false;
      const ts = resolveDueDateToTs(t.dueDate);
      return ts !== null && ts <= sunday.getTime();
    }).length;
  })();

  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox size={14} />, count: inboxCount, time: 0 },
    { id: 'today', label: 'Today', icon: <Sun size={14} />, count: todayTasks.length + overdueCount, time: todayEstimate },
    { id: 'tomorrow', label: 'Tomorrow', icon: <Calendar size={14} />, count: tomorrowTasks.length, time: 0 },
    { id: 'week', label: 'This Week', icon: <CalendarDays size={14} />, count: thisWeekCount, time: 0 },
    { id: 'planned', label: 'Planned', icon: <AlignLeft size={14} />, count: plannedTasks.length, time: 0 },
    { id: 'someday', label: 'Someday', icon: <CloudSun size={14} />, count: somedayTasks.length, time: 0 },
    { id: 'completed', label: 'Completed', icon: <CheckCircle2 size={14} />, count: completed.length, time: 0 },
    { id: 'all', label: 'Tasks', icon: <FolderOpen size={14} />, count: allTasks.length, time: 0 },
    { id: 'focus-week', label: 'Focus Week', icon: <BarChart2 size={14} />, count: 0, time: 0 },
  ];

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        background: 'var(--bg2)',
        borderRight: '1px solid var(--brd)',
      }}
    >
      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item, i) => {
          const isActiveItem = activeView === item.id;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              onClick={() => onViewChange(item.id as SidebarView)}
              className="w-full flex items-center gap-2.5 px-3 py-2 transition-all duration-150 text-left relative rounded-xl mb-0.5"
              style={{
                color: isActiveItem ? 'var(--t)' : 'var(--t2)',
              }}
            >
              {/* Active background */}
              {isActiveItem && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,77,77,0.08) 0%, rgba(255,77,77,0.04) 100%)',
                    border: '1px solid rgba(255,77,77,0.12)',
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
              <span
                className="relative z-10 shrink-0 transition-colors"
                style={{ color: isActiveItem ? 'var(--accent)' : 'var(--t3)' }}
              >
                {item.icon}
              </span>
              <span className="relative z-10 flex-1 text-[13px] font-medium truncate">
                {item.label}
              </span>
              <div className="relative z-10 flex items-center gap-1.5 shrink-0">
                {item.time > 0 && (
                  <span className="text-[10px]" style={{ color: 'var(--t3)' }}>
                    {formatTime(item.time)}
                  </span>
                )}
                {item.count > 0 && (
                  <span
                    className="text-[10px] min-w-[18px] text-center px-1 py-0.5 rounded-md tabular-nums"
                    style={{
                      background: isActiveItem ? 'rgba(255,77,77,0.12)' : 'rgba(255,255,255,0.05)',
                      color: isActiveItem ? 'var(--accent)' : 'var(--t3)',
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}

        {/* Saved Views section */}
        {savedViews.length > 0 && (
          <div className="mt-3 px-1">
            <button
              onClick={() => setShowSavedViews(!showSavedViews)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors mb-1"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t2)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
            >
              <ChevronDown
                size={10}
                style={{ transform: showSavedViews ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
              />
              <span className="text-[10px] font-bold uppercase tracking-widest">Views</span>
              <span className="ml-auto text-[10px] tabular-nums" style={{ color: 'var(--t3)' }}>
                {savedViews.length}
              </span>
            </button>
            <AnimatePresence>
              {showSavedViews && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden flex flex-col gap-0.5"
                >
                  {savedViews.map((sv) => (
                    <div
                      key={sv.id}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      style={{ color: 'var(--t2)' }}
                      onClick={() => onLoadSavedView?.(sv)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Bookmark size={11} style={{ color: 'var(--blu)' }} />
                      {renamingViewId === sv.id ? (
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={() => {
                            const t = renameDraft.trim();
                            if (t && t !== sv.name) renameSavedView(sv.id, t);
                            setRenamingViewId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setRenamingViewId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-[12px] bg-transparent focus:outline-none"
                          style={{ color: 'var(--t)' }}
                        />
                      ) : (
                        <span className="flex-1 text-[12px] truncate">{sv.name}</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenameDraft(sv.name); setRenamingViewId(sv.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--t3)' }}
                        title="Rename"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSavedView(sv.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--t3)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                        title="Delete"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Projects section */}
        <div className="mt-3 px-1">
          <button
            onClick={() => setShowProjects(!showProjects)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors mb-1"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t2)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
          >
            <ChevronDown
              size={10}
              style={{ transform: showProjects ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest">Projects</span>
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
                  const projAllTasks = tasks.filter((t) => t.projectId === proj.id);
                  const projActiveTasks = projAllTasks.filter((t) => !t.completed);
                  const projCompletedTasks = projAllTasks.filter((t) => t.completed);
                  const progress = projAllTasks.length > 0 ? projCompletedTasks.length / projAllTasks.length : 0;
                  const isActive = activeView === proj.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => onViewChange(proj.id)}
                      className="w-full flex flex-col px-2 py-2 rounded-xl transition-all text-left group mb-0.5"
                      style={{
                        background: isActive
                          ? `${proj.color}14`
                          : 'transparent',
                        border: isActive ? `1px solid ${proj.color}25` : '1px solid transparent',
                        opacity: proj.status === 'on_hold' ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        {/* Colored dot */}
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: proj.color,
                            boxShadow: isActive ? `0 0 6px ${proj.color}60` : 'none',
                          }}
                        />
                        <span
                          className="flex-1 text-[12px] font-medium truncate"
                          style={{ color: isActive ? 'var(--t)' : 'var(--t2)' }}
                        >
                          {proj.name}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete project "${proj.name}"? Tasks in this project will be moved to Inbox.`)) {
                                deleteProject(proj.id);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                if (confirm(`Delete project "${proj.name}"? Tasks in this project will be moved to Inbox.`)) {
                                  deleteProject(proj.id);
                                }
                              }
                            }}
                            className="w-4 h-4 flex items-center justify-center rounded cursor-pointer"
                            style={{ color: 'var(--t3)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                          >
                            <X size={10} />
                          </span>
                        </div>
                        {projActiveTasks.length > 0 && (
                          <span
                            className="text-[10px] shrink-0 px-1 rounded"
                            style={{
                              color: isActive ? proj.color : 'var(--t3)',
                              background: isActive ? `${proj.color}18` : 'transparent',
                            }}
                          >
                            {projActiveTasks.length}
                          </span>
                        )}
                      </div>
                      {/* Gradient progress bar */}
                      {projAllTasks.length > 0 && (
                        <div className="w-full mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress * 100}%`,
                              background: proj.status === 'completed'
                                ? 'var(--t3)'
                                : `linear-gradient(90deg, ${proj.color}, ${proj.color}cc)`,
                              boxShadow: progress > 0 ? `0 0 6px ${proj.color}60` : 'none',
                            }}
                          />
                        </div>
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
                      className="px-2 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--brd)' }}
                    >
                      {/* Color picker */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {PROJECT_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setNewProjectColor(c)}
                            className="w-4 h-4 rounded-full transition-all"
                            style={{
                              background: c,
                              transform: newProjectColor === c ? 'scale(1.3)' : 'scale(1)',
                              outline: newProjectColor === c ? `2px solid ${c}` : 'none',
                              outlineOffset: '1px',
                              boxShadow: newProjectColor === c ? `0 0 8px ${c}80` : 'none',
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
                          className="text-[11px] px-2.5 py-1 rounded-lg transition-all"
                          style={{
                            background: 'var(--accent)',
                            color: 'white',
                            boxShadow: '0 2px 8px var(--accent-g)',
                          }}
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingProject(false); setNewProjectName(''); }}
                          className="text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t3)' }}
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
          <div className="mt-3 px-1">
            <button
              onClick={() => setShowTags(!showTags)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors mb-1"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t2)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
            >
              <ChevronDown
                size={10}
                style={{ transform: showTags ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
              />
              <span className="text-[10px] font-bold uppercase tracking-widest">Tags</span>
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
                    const isActiveTag = activeView === tagView;
                    const tagCount = tasks.filter((t) => !t.completed && t.tags.includes(tag)).length;
                    return (
                      <button
                        key={tag}
                        onClick={() => onViewChange(tagView)}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all text-left mb-0.5"
                        style={{
                          background: isActiveTag ? 'rgba(255,255,255,0.04)' : 'transparent',
                          color: isActiveTag ? 'var(--t)' : 'var(--t2)',
                        }}
                        onMouseEnter={(e) => { if (!isActiveTag) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { if (!isActiveTag) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Tag size={11} style={{ color: isActiveTag ? 'var(--accent)' : 'var(--t3)', flexShrink: 0 }} />
                        <span className="flex-1 text-[12px] truncate">{tag}</span>
                        {tagCount > 0 && (
                          <span
                            className="text-[10px] shrink-0 px-1 rounded"
                            style={{ color: isActiveTag ? 'var(--accent)' : 'var(--t3)' }}
                          >
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
        className="px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--brd)' }}
      >
        <div className="text-[10px] uppercase tracking-widest mb-0.5 font-semibold" style={{ color: 'var(--t3)' }}>
          Today's Focus
        </div>
        <div
          className="text-[15px] font-semibold tabular-nums"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, #ff8080 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {formatTime(todayFocusSeconds)}
        </div>
      </div>
    </div>
  );
};
