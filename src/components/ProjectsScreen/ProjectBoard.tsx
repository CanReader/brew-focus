import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
  DragOverlay, DragEndEvent,
} from '@dnd-kit/core';
import { Flag, GripVertical, Play } from 'lucide-react';
import {
  Task, TaskStatus, TASK_STATUS_META, taskTypeColor, Project,
} from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'done'];

interface Props {
  project: Project;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onSwitchToFocus: () => void;
}

const priorityColor: Record<Task['priority'], string> = {
  p1: 'var(--accent)',
  p2: 'var(--amb)',
  p3: 'var(--blu)',
  p4: 'var(--t3)',
};

function BoardCard({
  task, projectColor, onOpen, onPlay,
}: { task: Task; projectColor: string; onOpen: () => void; onPlay: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const typeColor = taskTypeColor(task.type);

  return (
    <div
      ref={setNodeRef}
      className="group relative rounded-xl p-3 transition-all"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd)',
        opacity: isDragging ? 0.4 : 1,
        cursor: 'default',
        borderLeft: `2px solid ${typeColor}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brd2)'; e.currentTarget.style.borderLeftColor = typeColor; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--brd)'; e.currentTarget.style.borderLeftColor = typeColor; }}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--t3)', cursor: 'grab' }}
        title="Drag to reorder"
      >
        <GripVertical size={12} />
      </button>

      {/* Title */}
      <button onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start gap-1.5 pr-5">
          {task.priority !== 'p4' && (
            <Flag
              size={11}
              fill={priorityColor[task.priority]}
              color={priorityColor[task.priority]}
              className="mt-0.5 shrink-0"
            />
          )}
          <span
            className="text-[12.5px] font-medium leading-snug"
            style={{
              color: task.completed ? 'var(--t3)' : 'var(--t)',
              textDecoration: task.completed ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </span>
        </div>
      </button>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2 text-[10.5px]" style={{ color: 'var(--t3)' }}>
        <span
          className="px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider"
          style={{ color: typeColor, background: typeColor + '15', border: `1px solid ${typeColor}33` }}
        >
          {task.type}
        </span>
        {task.pomodoroEstimate > 0 && (
          <span className="tabular-nums">
            {task.pomodoroCompleted}/{task.pomodoroEstimate}
          </span>
        )}
        {task.subtasks.length > 0 && (
          <span className="tabular-nums">
            ✓ {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
          </span>
        )}
        {!task.completed && task.status !== 'done' && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1.5 py-0.5 rounded-md"
            style={{ background: projectColor + '20', color: projectColor }}
            title="Start focus"
          >
            <Play size={9} fill={projectColor} />
            Focus
          </button>
        )}
      </div>
    </div>
  );
}

function Column({
  status, project, tasks, onOpenTask, onPlay,
}: {
  status: TaskStatus;
  project: Project;
  tasks: Task[];
  onOpenTask: (id: string) => void;
  onPlay: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = TASK_STATUS_META[status];
  const sorted = tasks
    .slice()
    .sort((a, b) => (a.boardPosition ?? 0) - (b.boardPosition ?? 0));

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-2xl p-3 min-w-[280px] flex-1 transition-colors"
      style={{
        background: isOver ? meta.color + '0E' : 'var(--bg2)',
        border: `1px solid ${isOver ? meta.color + '44' : 'var(--brd)'}`,
      }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--t3)' }}>
          {sorted.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 360px)' }}>
        <AnimatePresence mode="popLayout">
          {sorted.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <BoardCard
                task={t}
                projectColor={project.color}
                onOpen={() => onOpenTask(t.id)}
                onPlay={() => onPlay(t)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <div
            className="flex items-center justify-center text-[11px] rounded-xl py-6"
            style={{
              color: 'var(--t3)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed var(--brd)',
            }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export const ProjectBoard: React.FC<Props> = ({ project, tasks, onOpenTask, onSwitchToFocus }) => {
  const { setTaskBoardPosition, setActiveTask } = useTaskStore();
  const { reset, start, setActiveTask: setTimerActiveTask } = useTimerStore();
  const { settings } = useSettingsStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const grouped: Record<TaskStatus, Task[]> = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
    blocked: [], // not rendered as a column; surfaced via TaskItem badge instead
  };

  const handlePlay = async (task: Task) => {
    await setActiveTask(task.id);
    setTimerActiveTask(task.id);
    const workDuration = task.customWorkDuration
      ?? project.customWorkDuration ?? settings.workDuration;
    reset(workDuration);
    start();
    onSwitchToFocus();
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = active.id as string;
    const targetStatus = over.id as TaskStatus;
    if (!COLUMNS.includes(targetStatus)) return;
    const targetGroup = grouped[targetStatus] ?? [];
    const lastPos = targetGroup.reduce((m, t) => Math.max(m, t.boardPosition ?? 0), 0);
    await setTaskBoardPosition(taskId, targetStatus, lastPos + 1024);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 flex-1 min-h-0 overflow-x-auto pb-2">
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            project={project}
            tasks={grouped[status]}
            onOpenTask={onOpenTask}
            onPlay={handlePlay}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div
            className="rounded-xl p-3"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--brd2)',
              boxShadow: `0 12px 32px rgba(0,0,0,0.5)`,
              borderLeft: `2px solid ${taskTypeColor(activeTask.type)}`,
              cursor: 'grabbing',
              minWidth: 240,
            }}
          >
            <span className="text-[12.5px] font-medium" style={{ color: 'var(--t)' }}>
              {activeTask.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
