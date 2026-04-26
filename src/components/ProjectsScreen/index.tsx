import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, Search, X, LayoutGrid, GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import { ProjectCard } from './ProjectCard';
import { ProjectDetail } from './ProjectDetail';
import { NewProjectModal } from './NewProjectModal';
import { GraphView } from './GraphView';
import { visibleProjects } from './projectMetrics';
import { TaskDetailPanel } from '../TasksScreen/TaskDetailPanel';

type Filter = 'all' | 'active' | 'on_hold' | 'completed' | 'archived';

interface Props {
  onSwitchToFocus: () => void;
}

export const ProjectsScreen: React.FC<Props> = ({ onSwitchToFocus }) => {
  const { t } = useTranslation('projects');
  const FILTER_TABS: { id: Filter; label: string }[] = [
    { id: 'all',       label: t('filter.all')       },
    { id: 'active',    label: t('filter.active')    },
    { id: 'on_hold',   label: t('filter.onHold')   },
    { id: 'completed', label: t('filter.completed') },
    { id: 'archived',  label: t('filter.archived')  },
  ];
  const { projects, tasks, updateTask, deleteTask } = useTaskStore();
  const { sessions } = useTimerStore();
  const [graphSelectedTaskId, setGraphSelectedTaskId] = useState<string | null>(null);
  const graphSelectedTask = graphSelectedTaskId ? tasks.find((t) => t.id === graphSelectedTaskId) : null;
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [topView, setTopView] = useState<'grid' | 'graph'>('grid');

  const filtered = useMemo(() => {
    let list = visibleProjects(projects, filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    // Sort: priority asc, then by createdAt desc.
    return list.slice().sort((a, b) => {
      const pri = (a.priority ?? 'p3').localeCompare(b.priority ?? 'p3');
      if (pri !== 0) return pri;
      return b.createdAt - a.createdAt;
    });
  }, [projects, filter, search]);

  const openProject = openProjectId ? projects.find((p) => p.id === openProjectId) : null;

  if (openProject) {
    return (
      <ProjectDetail
        key={openProject.id}
        project={openProject}
        onBack={() => setOpenProjectId(null)}
        onSwitchToFocus={onSwitchToFocus}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-8 pt-6 pb-3 shrink-0">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1
              className="font-fraunces text-[28px] mb-0.5"
              style={{
                background: 'linear-gradient(135deg, var(--t) 0%, var(--t2) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('title')}
            </h1>
            <p className="text-[12px]" style={{ color: 'var(--t3)' }}>
              {t('project_count', { ns: 'common', count: filtered.length })}
              {search && ` ${t('matching', { query: search })}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Grid | Graph toggle */}
            <div
              className="flex items-center rounded-xl p-0.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
            >
              {([['grid', LayoutGrid, t('view.grid')], ['graph', GitBranch, t('view.graph')]] as const).map(([v, Icon, label]) => {
                const isActive = topView === v;
                return (
                  <button
                    key={v}
                    onClick={() => setTopView(v)}
                    className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors"
                    style={{ color: isActive ? 'var(--t)' : 'var(--t3)' }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="projects-top-view"
                        className="absolute inset-0 rounded-lg"
                        style={{ background: 'var(--card-h)' }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                      />
                    )}
                    <Icon size={11} className="relative z-10" />
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setNewOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #ff2929)',
                color: '#fff',
                boxShadow: '0 4px 16px var(--accent-g)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px var(--accent-g)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-g)'; }}
            >
              <Plus size={13} />
              {t('newProject')}
            </button>
          </div>
        </div>

        {/* Filter tabs + search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-0.5 rounded-xl p-0.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
          >
            {FILTER_TABS.map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className="relative px-3 py-1 rounded-lg text-[11.5px] font-medium transition-colors"
                  style={{ color: isActive ? 'var(--t)' : 'var(--t3)' }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="project-filter-bg"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: 'var(--card-h)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-[180px] max-w-[280px] transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid ' + (search ? 'var(--brd2)' : 'var(--brd)'),
            }}
          >
            <Search size={12} style={{ color: 'var(--t3)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="flex-1 text-[12px] bg-transparent focus:outline-none"
              style={{ color: 'var(--t)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: 'var(--t3)' }}>
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      {topView === 'graph' ? (
        <div className="flex-1 min-h-0 flex">
          <GraphView
            projects={projects}
            tasks={tasks}
            onOpenProject={(id) => setOpenProjectId(id)}
            onOpenTask={(id) => setGraphSelectedTaskId(id)}
          />
          <AnimatePresence>
            {graphSelectedTask && (
              <TaskDetailPanel
                task={graphSelectedTask}
                projects={projects}
                onClose={() => setGraphSelectedTaskId(null)}
                onUpdate={(partial) => updateTask(graphSelectedTask.id, partial)}
                onDelete={() => { deleteTask(graphSelectedTask.id); setGraphSelectedTaskId(null); }}
              />
            )}
          </AnimatePresence>
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto px-8 pb-8 pt-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--brd)',
              }}
            >
              <Folder size={26} style={{ color: 'var(--t3)' }} />
            </div>
            <p className="text-[13px]" style={{ color: 'var(--t2)' }}>
              {projects.length === 0 ? t('noProjectsYet') : t('nothingHere')}
            </p>
            <p className="text-[11.5px]" style={{ color: 'var(--t3)' }}>
              {projects.length === 0
                ? t('tagline')
                : t('tryFilter')}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setNewOpen(true)}
                className="mt-2 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), #ff2929)',
                  color: '#fff',
                  boxShadow: '0 4px 16px var(--accent-g)',
                }}
              >
                <Plus size={13} />
                {t('createFirstProject')}
              </button>
            )}
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  tasks={tasks}
                  sessions={sessions}
                  onOpen={() => setOpenProjectId(p.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      )}

      <AnimatePresence>
        {newOpen && <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};
