import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Trash2, Check, Plus, Flag,
  Clock, Calendar, FolderOpen, Bell, RefreshCw, Edit3, FileText,
} from 'lucide-react';
import { Task, Priority, DueDate, Project, RepeatType, formatDueDateDisplay, isDueDateOverdue } from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { useSettingsStore } from '../../store/settingsStore';

interface TaskDetailPanelProps {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onUpdate: (partial: Partial<Task>) => void;
  onDelete: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'p1', label: 'High',  color: 'var(--accent)' },
  { value: 'p2', label: 'Med',   color: 'var(--amb)' },
  { value: 'p3', label: 'Low',   color: 'var(--blu)' },
  { value: 'p4', label: 'None',  color: 'var(--t3)' },
];

const priorityFlagColors: Record<Priority, string> = {
  p1: 'var(--accent)',
  p2: 'var(--amb)',
  p3: 'var(--blu)',
  p4: 'var(--t3)',
};

function formatCreatedAt(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function msToDatetimeLocal(ms?: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoDatePlusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type ExpandedRow = 'pomodoro' | 'dueDate' | 'project' | 'reminder' | 'repeat' | 'priority' | null;

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  expanded?: boolean;
}> = ({ icon, label, value, valueColor, onClick, children, expanded }) => (
  <div>
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-left"
      style={{
        background: expanded ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderLeft: expanded ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
      onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: 'var(--t3)', flexShrink: 0, width: 15 }}>{icon}</span>
      <span className="text-[12px] w-20 shrink-0 font-medium" style={{ color: 'var(--t3)' }}>{label}</span>
      <span className="flex-1 text-[12px] text-right truncate" style={{ color: valueColor ?? 'var(--t2)' }}>
        {value}
      </span>
    </button>
    <AnimatePresence>
      {expanded && children && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden px-4 pb-3"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const PomodoroRow: React.FC<{
  label: string;
  value: number;
  min: number;
  suffix?: string;
  onDec: () => void;
  onInc: () => void;
}> = ({ label, value, min, suffix, onDec, onInc }) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{label}</span>
    <div className="flex items-center gap-1.5">
      <button
        onClick={onDec}
        disabled={value <= min}
        className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
        style={{
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--t3)',
          opacity: value <= min ? 0.3 : 1,
          border: '1px solid var(--brd)',
        }}
      >−</button>
      <span className="text-[12px] tabular-nums text-center" style={{ color: 'var(--t)', minWidth: suffix ? 48 : 20 }}>
        {value}{suffix ? ` ${suffix}` : ''}
      </span>
      <button
        onClick={onInc}
        className="w-6 h-6 flex items-center justify-center rounded-lg"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t3)', border: '1px solid var(--brd)' }}
      >+</button>
    </div>
  </div>
);

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  projects,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [titleValue, setTitleValue] = useState(task.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [notesValue, setNotesValue] = useState(task.notes || '');
  const [newSubtaskValue, setNewSubtaskValue] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [expanded, setExpanded] = useState<ExpandedRow>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const { addSubtask, toggleSubtask, deleteSubtask, addTag, removeTag } = useTaskStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    setTitleValue(task.title);
    setNotesValue(task.notes || '');
    setExpanded(null);
  }, [task.id]);

  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
    }
  }, [notesValue]);

  const handleTitleBlur = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
    else setTitleValue(task.title);
    setIsEditingTitle(false);
  };

  const handleNotesBlur = () => {
    if (notesValue !== task.notes) onUpdate({ notes: notesValue });
  };

  const handleAddSubtask = () => {
    const trimmed = newSubtaskValue.trim();
    if (!trimmed) return;
    addSubtask(task.id, trimmed);
    setNewSubtaskValue('');
  };

  const handleAddTag = () => {
    const trimmed = newTagValue.trim().toLowerCase();
    if (!trimmed || task.tags.includes(trimmed)) return;
    addTag(task.id, trimmed);
    setNewTagValue('');
  };

  const toggleRow = (row: ExpandedRow) => setExpanded((prev) => (prev === row ? null : row));

  const workMins = task.customWorkDuration ?? settings.workDuration;
  const estimatedMins = task.pomodoroEstimate * workMins;
  const estimatedStr = estimatedMins >= 60
    ? `${Math.floor(estimatedMins / 60)}h ${estimatedMins % 60 > 0 ? `${estimatedMins % 60}m` : ''}`
    : `~${estimatedMins}m`;

  const pomodoroValue = `${task.pomodoroCompleted}/${task.pomodoroEstimate}  ${estimatedStr}`;
  const repeatLabel = task.repeatType && task.repeatType !== 'none'
    ? task.repeatType.charAt(0).toUpperCase() + task.repeatType.slice(1)
    : 'None';
  const reminderLabel = task.reminder
    ? new Date(task.reminder).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'None';

  const flagColor = priorityFlagColors[task.priority];
  const overdue = !task.completed && isDueDateOverdue(task.dueDate);
  const dueDateDisplay = formatDueDateDisplay(task.dueDate);

  const DATE_SHORTCUTS: { label: string; value: DueDate }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'Next Week', value: isoDatePlusDays(7) },
    { label: 'Someday', value: 'someday' },
    { label: 'None', value: null },
  ];

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full flex flex-col"
      style={{
        background: 'var(--bg2)',
        borderLeft: '1px solid var(--brd)',
        width: '280px',
        flexShrink: 0,
      }}
    >
      {/* Header gradient area */}
      <div
        className="px-4 pt-4 pb-3 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,77,77,0.06) 0%, rgba(255,77,77,0.02) 100%)',
          borderBottom: '1px solid var(--brd)',
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }}
        />
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <textarea
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleBlur(); }
                  if (e.key === 'Escape') { setTitleValue(task.title); setIsEditingTitle(false); }
                }}
                rows={2}
                className="w-full text-[15px] font-medium bg-transparent resize-none focus:outline-none leading-snug"
                style={{ color: 'var(--t)' }}
              />
            ) : (
              <div
                className="flex items-start gap-1.5 cursor-text group/title"
                onClick={() => !task.completed && setIsEditingTitle(true)}
              >
                <span
                  className="text-[15px] font-semibold leading-snug flex-1"
                  style={{
                    color: task.completed ? 'var(--t3)' : overdue ? '#ff6b5a' : 'var(--t)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>
                {!task.completed && (
                  <Edit3 size={12} className="opacity-0 group-hover/title:opacity-40 mt-0.5 shrink-0 transition-opacity" style={{ color: 'var(--t3)' }} />
                )}
              </div>
            )}
          </div>

          {/* Priority flag */}
          <button
            onClick={() => toggleRow('priority')}
            className="mt-0.5 shrink-0 p-1.5 rounded-lg transition-all"
            style={{
              color: flagColor,
              background: expanded === 'priority' ? `${flagColor}18` : 'transparent',
            }}
            title="Change priority"
          >
            <Flag size={14} fill={task.priority !== 'p4' ? flagColor : 'none'} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Priority picker */}
        <AnimatePresence>
          {expanded === 'priority' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--brd)' }}
            >
              <div className="flex gap-1.5">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { onUpdate({ priority: p.value }); setExpanded(null); }}
                    className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                    style={{
                      background: task.priority === p.value ? `${p.color}20` : 'rgba(255,255,255,0.04)',
                      color: task.priority === p.value ? p.color : 'var(--t3)',
                      border: `1.5px solid ${task.priority === p.value ? p.color : 'var(--brd)'}`,
                      boxShadow: task.priority === p.value ? `0 0 10px ${p.color}30` : 'none',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tags */}
        <div className="px-4 py-2.5 flex flex-wrap gap-1.5 items-center min-h-[40px]" style={{ borderBottom: '1px solid var(--brd)' }}>
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--t2)',
                border: '1px solid var(--brd)',
              }}
            >
              #{tag}
              <button
                onClick={() => removeTag(task.id, tag)}
                className="flex items-center justify-center w-3 h-3 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--t3)' }}
              >
                <X size={8} />
              </button>
            </span>
          ))}
          <input
            value={newTagValue}
            onChange={(e) => setNewTagValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag();
              if (e.key === 'Escape') setNewTagValue('');
            }}
            onBlur={() => { if (newTagValue.trim()) handleAddTag(); }}
            placeholder="+ tag"
            className="text-[12px] bg-transparent focus:outline-none w-14 focus:w-20 transition-all"
            style={{ color: 'var(--t3)' }}
          />
        </div>

        {/* Notes */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--brd)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText size={11} style={{ color: 'var(--t3)' }} />
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--t3)' }}>Notes</span>
          </div>
          <div
            className="rounded-xl p-2.5 focus-glow"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--brd)' }}
          >
            <textarea
              ref={notesRef}
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes…"
              rows={2}
              className="w-full text-[12px] bg-transparent resize-none focus:outline-none leading-relaxed"
              style={{ color: 'var(--t2)', minHeight: 40, caretColor: 'var(--accent)' }}
            />
          </div>
        </div>

        {/* Gradient section divider */}
        <div className="section-divider mx-4" />

        {/* Detail rows */}
        <DetailRow
          icon={<Clock size={12} />}
          label="Pomodoro"
          value={pomodoroValue}
          expanded={expanded === 'pomodoro'}
          onClick={() => toggleRow('pomodoro')}
        >
          <div className="pt-2 flex flex-col gap-2">
            <PomodoroRow
              label="Sessions"
              value={task.pomodoroEstimate}
              min={1}
              onDec={() => { if (task.pomodoroEstimate > 1) onUpdate({ pomodoroEstimate: task.pomodoroEstimate - 1 }); }}
              onInc={() => onUpdate({ pomodoroEstimate: task.pomodoroEstimate + 1 })}
            />
            <PomodoroRow
              label="Work (min)"
              value={task.customWorkDuration ?? settings.workDuration}
              min={1}
              onDec={() => onUpdate({ customWorkDuration: Math.max(1, (task.customWorkDuration ?? settings.workDuration) - 1) })}
              onInc={() => onUpdate({ customWorkDuration: (task.customWorkDuration ?? settings.workDuration) + 1 })}
            />
            <PomodoroRow
              label="Short break (min)"
              value={task.customShortBreakDuration ?? settings.shortBreakDuration}
              min={1}
              onDec={() => onUpdate({ customShortBreakDuration: Math.max(1, (task.customShortBreakDuration ?? settings.shortBreakDuration) - 1) })}
              onInc={() => onUpdate({ customShortBreakDuration: (task.customShortBreakDuration ?? settings.shortBreakDuration) + 1 })}
            />

            <div className="border-t pt-2 mt-0.5 flex flex-col gap-2" style={{ borderColor: 'var(--brd)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'var(--t3)' }}>Skip long breaks</span>
                <button
                  onClick={() => onUpdate({ skipLongBreak: !task.skipLongBreak })}
                  className="w-8 h-4 rounded-full relative transition-colors duration-200 shrink-0"
                  style={{ background: task.skipLongBreak ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }}
                >
                  <span
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200"
                    style={{ transform: task.skipLongBreak ? 'translateX(17px)' : 'translateX(1px)' }}
                  />
                </button>
              </div>
              {!task.skipLongBreak && (
                <>
                  <PomodoroRow
                    label="Long break (min)"
                    value={task.customLongBreakDuration ?? settings.longBreakDuration}
                    min={1}
                    onDec={() => onUpdate({ customLongBreakDuration: Math.max(1, (task.customLongBreakDuration ?? settings.longBreakDuration) - 1) })}
                    onInc={() => onUpdate({ customLongBreakDuration: (task.customLongBreakDuration ?? settings.longBreakDuration) + 1 })}
                  />
                  <PomodoroRow
                    label="Long break after"
                    value={task.customLongBreakInterval ?? settings.longBreakInterval}
                    min={2}
                    suffix="sessions"
                    onDec={() => onUpdate({ customLongBreakInterval: Math.max(2, (task.customLongBreakInterval ?? settings.longBreakInterval) - 1) })}
                    onInc={() => onUpdate({ customLongBreakInterval: (task.customLongBreakInterval ?? settings.longBreakInterval) + 1 })}
                  />
                </>
              )}
            </div>

            {(task.customWorkDuration || task.customShortBreakDuration || task.customLongBreakDuration || task.customLongBreakInterval || task.skipLongBreak) && (
              <button
                onClick={() => onUpdate({
                  customWorkDuration: undefined,
                  customShortBreakDuration: undefined,
                  customLongBreakDuration: undefined,
                  customLongBreakInterval: undefined,
                  skipLongBreak: false,
                })}
                className="text-[11px] text-left underline"
                style={{ color: 'var(--t3)' }}
              >
                Reset to defaults
              </button>
            )}
          </div>
        </DetailRow>

        <DetailRow
          icon={<Calendar size={12} />}
          label="Due Date"
          value={dueDateDisplay}
          valueColor={task.dueDate ? (overdue ? '#ff6b5a' : 'var(--accent)') : 'var(--t3)'}
          expanded={expanded === 'dueDate'}
          onClick={() => toggleRow('dueDate')}
        >
          <div className="pt-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {DATE_SHORTCUTS.map((s) => {
                const isSelected = (task.dueDate ?? null) === s.value ||
                  (s.value !== null && s.value !== 'today' && s.value !== 'tomorrow' && s.value !== 'someday' &&
                   task.dueDate === s.value);
                return (
                  <button
                    key={String(s.value)}
                    onClick={() => { onUpdate({ dueDate: s.value ?? undefined }); setExpanded(null); }}
                    className="px-2 py-1 rounded-lg text-[11px] font-medium transition-all"
                    style={{
                      background: isSelected ? 'var(--accent-d)' : 'rgba(255,255,255,0.05)',
                      color: isSelected ? 'var(--accent)' : 'var(--t3)',
                      border: `1.5px solid ${isSelected ? 'var(--accent-g)' : 'var(--brd)'}`,
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div>
              <span className="text-[11px] block mb-1" style={{ color: 'var(--t3)' }}>Custom date</span>
              <input
                type="date"
                value={
                  task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
                    ? task.dueDate
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdate({ dueDate: val || undefined });
                }}
                className="w-full text-[12px] bg-transparent focus:outline-none border rounded-xl px-2 py-1.5"
                style={{ color: 'var(--t)', borderColor: 'var(--brd)', colorScheme: 'dark' }}
              />
            </div>
          </div>
        </DetailRow>

        <DetailRow
          icon={<FolderOpen size={12} />}
          label="Project"
          value={projects.find((p) => p.id === task.projectId)?.name ?? 'None'}
          valueColor={task.projectId ? 'var(--t2)' : 'var(--t3)'}
          expanded={expanded === 'project'}
          onClick={() => toggleRow('project')}
        >
          <div className="pt-2 flex flex-col gap-1">
            <button
              onClick={() => { onUpdate({ projectId: undefined }); setExpanded(null); }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
              style={{ background: !task.projectId ? 'rgba(255,255,255,0.05)' : 'transparent', color: !task.projectId ? 'var(--t2)' : 'var(--t3)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--brd2)' }} />
              <span className="text-[12px]">None</span>
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { onUpdate({ projectId: p.id }); setExpanded(null); }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
                style={{ background: task.projectId === p.id ? 'rgba(255,255,255,0.05)' : 'transparent', color: task.projectId === p.id ? 'var(--t)' : 'var(--t3)' }}
                onMouseEnter={(e) => { if (task.projectId !== p.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={(e) => { if (task.projectId !== p.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: p.color,
                    boxShadow: task.projectId === p.id ? `0 0 5px ${p.color}60` : 'none',
                  }}
                />
                <span className="text-[12px]">{p.name}</span>
              </button>
            ))}
          </div>
        </DetailRow>

        <DetailRow
          icon={<Bell size={12} />}
          label="Reminder"
          value={reminderLabel}
          valueColor={task.reminder ? 'var(--t2)' : 'var(--t3)'}
          expanded={expanded === 'reminder'}
          onClick={() => toggleRow('reminder')}
        >
          <div className="pt-2 flex flex-col gap-2">
            <input
              type="datetime-local"
              value={msToDatetimeLocal(task.reminder)}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate({ reminder: val ? new Date(val).getTime() : undefined });
              }}
              className="w-full text-[12px] bg-transparent focus:outline-none border rounded-xl px-2 py-1.5"
              style={{ color: 'var(--t)', borderColor: 'var(--brd)', colorScheme: 'dark' }}
            />
            {task.reminder && (
              <button
                onClick={() => { onUpdate({ reminder: undefined }); setExpanded(null); }}
                className="text-[11px] text-left underline"
                style={{ color: 'var(--t3)' }}
              >
                Clear reminder
              </button>
            )}
          </div>
        </DetailRow>

        <DetailRow
          icon={<RefreshCw size={12} />}
          label="Repeat"
          value={repeatLabel}
          valueColor={task.repeatType && task.repeatType !== 'none' ? 'var(--t2)' : 'var(--t3)'}
          expanded={expanded === 'repeat'}
          onClick={() => toggleRow('repeat')}
        >
          <div className="pt-2 flex gap-1.5 flex-wrap">
            {(['none', 'daily', 'weekly', 'monthly'] as RepeatType[]).map((r) => {
              const isSelected = (task.repeatType ?? 'none') === r;
              return (
                <button
                  key={r}
                  onClick={() => { onUpdate({ repeatType: r }); setExpanded(null); }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all"
                  style={{
                    background: isSelected ? 'var(--accent-d)' : 'rgba(255,255,255,0.05)',
                    color: isSelected ? 'var(--accent)' : 'var(--t3)',
                    border: `1.5px solid ${isSelected ? 'var(--accent-g)' : 'var(--brd)'}`,
                  }}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              );
            })}
          </div>
        </DetailRow>

        {/* Gradient divider */}
        <div className="section-divider mx-0 my-1" />

        {/* Subtasks */}
        <div className="px-4 py-2">
          {task.subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-2.5 py-2 group/sub border-b"
              style={{ borderColor: 'var(--brd)' }}
            >
              <button
                onClick={() => toggleSubtask(task.id, subtask.id)}
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                style={{
                  borderColor: subtask.completed ? 'var(--grn)' : 'rgba(255,255,255,0.14)',
                  background: subtask.completed ? 'var(--grn)' : 'transparent',
                }}
              >
                {subtask.completed && <Check size={8} color="white" strokeWidth={3} />}
              </button>
              <span
                className="flex-1 text-[12px] min-w-0"
                style={{
                  color: subtask.completed ? 'var(--t3)' : 'var(--t)',
                  textDecoration: subtask.completed ? 'line-through' : 'none',
                }}
              >
                {subtask.title}
              </span>
              <button
                onClick={() => deleteSubtask(task.id, subtask.id)}
                className="opacity-0 group-hover/sub:opacity-100 transition-opacity"
                style={{ color: 'var(--t3)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
              >
                <X size={11} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <input
              value={newSubtaskValue}
              onChange={(e) => setNewSubtaskValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubtask();
                if (e.key === 'Escape') setNewSubtaskValue('');
              }}
              placeholder="Add a step…"
              className="flex-1 text-[12px] bg-transparent focus:outline-none"
              style={{ color: 'var(--t)', caretColor: 'var(--accent)' }}
            />
            {newSubtaskValue.trim() && (
              <button
                onClick={handleAddSubtask}
                className="w-5 h-5 flex items-center justify-center rounded-lg shrink-0"
                style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 0 8px var(--accent-g)' }}
              >
                <Plus size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--brd)' }}
      >
        <span className="text-[10px]" style={{ color: 'var(--t3)' }}>
          {formatCreatedAt(task.createdAt)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditingTitle(true)}
            className="w-7 h-7 flex items-center justify-center rounded-xl transition-all"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--t)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
            title="Edit title"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-7 h-7 flex items-center justify-center rounded-xl transition-all"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,77,77,0.12)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
            title="Delete task"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
