import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, Inbox, Flag } from 'lucide-react';
import {
  Project, Task, Milestone, taskTypeColor, TASK_STATUS_META, Priority,
} from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { useSettingsStore } from '../../store/settingsStore';

interface Props {
  project: Project;
  tasks: Task[];
  onOpenTask: (id: string) => void;
}

const PRIORITY_RANK: Record<Priority, number> = { p1: 0, p2: 1, p3: 2, p4: 3 };
const STATUS_RANK = { in_progress: 0, todo: 1, blocked: 2, done: 3 } as const;
const ASSUMED_DAILY_FOCUS_HOURS = 2;

function dropTargetStyle(active: boolean): React.CSSProperties {
  return active
    ? { boxShadow: 'inset 0 0 0 2px var(--accent)' }
    : {};
}

function daysUntil(targetMs: number): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((targetMs - today.getTime()) / (1000 * 60 * 60 * 24));
}

function MilestoneSection({
  project, milestone, tasks, dailyMinutes, onOpenTask, onAssign, dragActive,
}: {
  project: Project;
  milestone: Milestone | null; // null = unscheduled
  tasks: Task[];
  dailyMinutes: number;
  onOpenTask: (id: string) => void;
  onAssign: (taskId: string) => void;
  dragActive: boolean;
}) {
  const sortedTasks = useMemo(() =>
    tasks.slice().sort((a, b) => {
      const sA = STATUS_RANK[a.status as keyof typeof STATUS_RANK] ?? 9;
      const sB = STATUS_RANK[b.status as keyof typeof STATUS_RANK] ?? 9;
      if (sA !== sB) return sA - sB;
      const pA = PRIORITY_RANK[a.priority] ?? 9;
      const pB = PRIORITY_RANK[b.priority] ?? 9;
      if (pA !== pB) return pA - pB;
      return a.createdAt - b.createdAt;
    }), [tasks]);

  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : done / total;

  // Estimated focus minutes total for this milestone.
  const estMinutes = tasks.reduce((s, t) => {
    const work = t.customWorkDuration ?? dailyMinutes;
    const remaining = Math.max(0, t.pomodoroEstimate - t.pomodoroCompleted);
    return s + remaining * work;
  }, 0);
  const estHours = estMinutes / 60;

  const dToDeadline = milestone?.targetDate ? daysUntil(milestone.targetDate) : null;
  const overdue = dToDeadline !== null && dToDeadline < 0 && !milestone?.completed;
  const overCapacity = milestone && dToDeadline !== null && dToDeadline > 0
    && estHours > dToDeadline * ASSUMED_DAILY_FOCUS_HOURS;

  const isUnscheduled = !milestone;
  const headerColor = isUnscheduled ? 'var(--t3)' : 'var(--t)';

  return (
    <div
      className="rounded-2xl mb-3"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd)',
        ...dropTargetStyle(dragActive),
      }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) onAssign(id);
      }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          {isUnscheduled ? (
            <Inbox size={12} style={{ color: 'var(--t3)' }} />
          ) : milestone?.completed ? (
            <Flag size={12} style={{ color: 'var(--grn)' }} fill="var(--grn)" />
          ) : (
            <Flag size={12} style={{ color: project.color }} />
          )}
          <span className="text-[14px] font-semibold" style={{ color: headerColor }}>
            {isUnscheduled ? 'Unscheduled' : milestone!.title}
          </span>
          <div className="flex-1" />
          {milestone?.targetDate && (
            <span
              className="flex items-center gap-1 text-[11px] tabular-nums"
              style={{ color: overdue ? 'var(--accent)' : 'var(--t3)' }}
            >
              <Calendar size={10} />
              {overdue
                ? `${Math.abs(dToDeadline!)}d over`
                : dToDeadline === 0
                  ? 'Today'
                  : `${dToDeadline}d left`}
            </span>
          )}
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--t3)' }}>
            {done}/{total}
          </span>
        </div>

        {/* Progress + capacity */}
        {!isUnscheduled && (
          <>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--bg2)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full"
                style={{ background: project.color, opacity: 0.85 }}
              />
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: 'var(--t3)' }}>
              <span className="tabular-nums">
                {estHours > 0 ? `${estHours.toFixed(1)}h estimated` : 'No estimate'}
              </span>
              {dToDeadline !== null && !milestone?.completed && (
                <>
                  <span>·</span>
                  <span className="tabular-nums">
                    {dToDeadline >= 0 ? `${dToDeadline}d remaining` : 'Past deadline'}
                  </span>
                </>
              )}
              {overCapacity && (
                <span
                  className="flex items-center gap-1 ml-auto"
                  style={{ color: 'var(--amb)' }}
                  title={`Estimated focus exceeds ${ASSUMED_DAILY_FOCUS_HOURS}h/day capacity for the time remaining.`}
                >
                  <AlertTriangle size={10} />
                  Tight
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Task grid */}
      <div className="px-4 pb-3">
        {sortedTasks.length === 0 ? (
          <div
            className="text-[11px] py-3 text-center rounded-lg"
            style={{ color: 'var(--t3)', background: 'var(--bg2)', border: '1px dashed var(--brd)' }}
          >
            {isUnscheduled ? 'No unscheduled tasks' : 'Drop tasks here, or assign from a task\'s detail panel'}
          </div>
        ) : (
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {sortedTasks.map((t) => {
              const tColor = taskTypeColor(t.type);
              const meta = TASK_STATUS_META[t.status];
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', t.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={() => onOpenTask(t.id)}
                  className="group rounded-lg px-2.5 py-2 cursor-pointer transition-colors"
                  style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--brd)',
                    borderLeft: `2px solid ${tColor}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--brd2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--brd)')}
                >
                  <div className="flex items-start gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                      style={{ background: meta.dot, opacity: t.completed ? 0.5 : 1 }}
                      title={meta.label}
                    />
                    <span
                      className="text-[12px] flex-1 leading-snug min-w-0"
                      style={{
                        color: t.completed ? 'var(--t3)' : 'var(--t2)',
                        textDecoration: t.completed ? 'line-through' : 'none',
                      }}
                    >
                      {t.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: 'var(--t3)' }}>
                    <span
                      className="px-1 py-0.5 rounded font-medium uppercase tracking-wider"
                      style={{ color: tColor, background: tColor + '14', border: `1px solid ${tColor}33` }}
                    >
                      {t.type}
                    </span>
                    {t.pomodoroEstimate > 0 && (
                      <span className="tabular-nums">
                        ◐ {t.pomodoroCompleted}/{t.pomodoroEstimate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const ProjectPlan: React.FC<Props> = ({ project, tasks, onOpenTask }) => {
  const { updateTask } = useTaskStore();
  const { settings } = useSettingsStore();
  const [dragOver, setDragOver] = React.useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string | null, Task[]>();
    map.set(null, []);
    for (const m of project.milestones) map.set(m.id, []);
    for (const t of tasks) {
      const key = t.milestoneId && map.has(t.milestoneId) ? t.milestoneId : null;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [project.milestones, tasks]);

  const assignTo = async (taskId: string, milestoneId: string | null) => {
    await updateTask(taskId, { milestoneId: milestoneId ?? undefined });
  };

  const handleDragEnter = (key: string) => setDragOver(key);
  const handleDragLeave = () => setDragOver(null);

  // Order: Unscheduled first, then milestones in their declared order.
  const order: { key: string; m: Milestone | null }[] = [
    { key: '__unscheduled__', m: null },
    ...project.milestones.map((m) => ({ key: m.id, m })),
  ];

  return (
    <div className="flex flex-col">
      {order.map(({ key, m }) => (
        <div
          key={key}
          onDragEnter={() => handleDragEnter(key)}
          onDragLeave={(e) => {
            // Only clear if the cursor truly left this section.
            if (!(e.relatedTarget as Node)?.parentNode) handleDragLeave();
          }}
        >
          <MilestoneSection
            project={project}
            milestone={m}
            tasks={grouped.get(m?.id ?? null) ?? []}
            dailyMinutes={project.customWorkDuration ?? settings.workDuration}
            onOpenTask={onOpenTask}
            onAssign={(taskId) => assignTo(taskId, m?.id ?? null)}
            dragActive={dragOver === key}
          />
        </div>
      ))}
    </div>
  );
};
