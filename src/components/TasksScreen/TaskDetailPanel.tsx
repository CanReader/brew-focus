import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Trash2, Check, Plus, Flag, GripVertical,
  Clock, Calendar, FolderOpen, Bell, RefreshCw, Edit3, FileText,
  Tag as TagIcon, Target, Lock, Search,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  arrayMove, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Task, Priority, DueDate, Project, RepeatType, SubTask,
  TaskStatus, TASK_STATUS_META, DEFAULT_TASK_TYPES, taskTypeColor,
  formatDueDateDisplay, isDueDateOverdue,
} from '../../types';
import { ActivityTimeline } from '../ActivityTimeline';
import { dependencyCandidates, blockingTasks } from '../../utils/dependencies';
import { MarkdownNotes } from '../MarkdownNotes';
import { preprocessWikiLinks, makeWikiLinkComponent } from '../../utils/wikiLinks';
import { useTaskStore } from '../../store/taskStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ProBadge } from '../ProBadge';

interface TaskDetailPanelProps {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onUpdate: (partial: Partial<Task>) => void;
  onDelete: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; labelKey: 'priorityHigh' | 'priorityMed' | 'priorityLow' | 'priorityNone'; color: string }[] = [
  { value: 'p1', labelKey: 'priorityHigh',  color: 'var(--accent)' },
  { value: 'p2', labelKey: 'priorityMed',   color: 'var(--amb)' },
  { value: 'p3', labelKey: 'priorityLow',   color: 'var(--blu)' },
  { value: 'p4', labelKey: 'priorityNone',  color: 'var(--t3)' },
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

type ExpandedRow = 'pomodoro' | 'dueDate' | 'project' | 'reminder' | 'repeat' | 'priority' | 'status' | 'type' | 'milestone' | 'depends' | null;

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  expanded?: boolean;
  pro?: boolean;
}> = ({ icon, label, value, valueColor, onClick, children, expanded, pro }) => (
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
      {pro && <ProBadge />}
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
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation('tasks');

  const { addSubtask, toggleSubtask, updateSubtask, deleteSubtask, reorderSubtasks, addTag, removeTag } = useTaskStore();

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSubtaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = task.subtasks.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorderSubtasks(task.id, arrayMove(ids, oldIndex, newIndex));
  };
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
    ? t(`detail.repeatOptions.${task.repeatType}`)
    : t('detail.repeatOptions.none');
  const reminderLabel = task.reminder
    ? new Date(task.reminder).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : t('detail.dependsNone');

  const flagColor = priorityFlagColors[task.priority];
  const overdue = !task.completed && isDueDateOverdue(task.dueDate);
  const dueDateDisplay = formatDueDateDisplay(task.dueDate);

  const DATE_SHORTCUTS: { labelKey: 'today' | 'tomorrow' | 'nextWeek' | 'someday' | 'none'; value: DueDate }[] = [
    { labelKey: 'today', value: 'today' },
    { labelKey: 'tomorrow', value: 'tomorrow' },
    { labelKey: 'nextWeek', value: isoDatePlusDays(7) },
    { labelKey: 'someday', value: 'someday' },
    { labelKey: 'none', value: null },
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
            title={t('detail.changePriority')}
          >
            <Flag size={14} fill={task.priority !== 'p4' ? flagColor : 'none'} />
          </button>
        </div>

        {/* Status + type pills row */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <button
            onClick={() => toggleRow('status')}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium uppercase tracking-wider transition-all"
            style={{
              color: TASK_STATUS_META[task.status].color,
              background: TASK_STATUS_META[task.status].color + '18',
              border: `1px solid ${TASK_STATUS_META[task.status].color}40`,
            }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: TASK_STATUS_META[task.status].dot }} />
            {TASK_STATUS_META[task.status].label}
          </button>
          <button
            onClick={() => toggleRow('type')}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium uppercase tracking-wider transition-all"
            style={{
              color: taskTypeColor(task.type),
              background: taskTypeColor(task.type) + '15',
              border: `1px solid ${taskTypeColor(task.type)}33`,
            }}
          >
            <TagIcon size={9} />
            {task.type}
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
                {PRIORITY_OPTIONS.map((p) => {
                  const isSelected = task.priority === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => { onUpdate({ priority: p.value }); setExpanded(null); }}
                      className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={{
                        background: isSelected ? `${p.color}20` : 'rgba(255,255,255,0.04)',
                        color: isSelected ? p.color : 'var(--t3)',
                        border: `1.5px solid ${isSelected ? p.color : 'var(--brd)'}`,
                        boxShadow: isSelected ? `0 0 10px ${p.color}30` : 'none',
                      }}
                    >
                      <Flag size={11} color={isSelected ? p.color : 'var(--t3)'} fill={isSelected ? p.color : 'transparent'} strokeWidth={2} />
                      {t(`detail.${p.labelKey}`)}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status picker */}
        <AnimatePresence>
          {expanded === 'status' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--brd)' }}
            >
              <div className="flex flex-col gap-1">
                {(['todo', 'in_progress', 'blocked', 'done'] as TaskStatus[]).map((s) => {
                  const meta = TASK_STATUS_META[s];
                  const isSelected = task.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => { onUpdate({ status: s }); setExpanded(null); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-all"
                      style={{
                        background: isSelected ? meta.color + '18' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? meta.color : 'var(--t2)',
                        border: `1px solid ${isSelected ? meta.color + '40' : 'var(--brd)'}`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Type picker */}
        <AnimatePresence>
          {expanded === 'type' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--brd)' }}
            >
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_TASK_TYPES.map((t) => {
                  const isSelected = task.type === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => { onUpdate({ type: t.value }); setExpanded(null); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={{
                        background: isSelected ? t.color + '20' : 'rgba(255,255,255,0.04)',
                        color: isSelected ? t.color : 'var(--t3)',
                        border: `1.5px solid ${isSelected ? t.color : 'var(--brd)'}`,
                      }}
                    >
                      <TagIcon size={10} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {!DEFAULT_TASK_TYPES.find((d) => d.value === task.type) && (
                <div className="mt-2 text-[10.5px]" style={{ color: 'var(--t3)' }}>
                  {t('detail.customType')} <span style={{ color: taskTypeColor(task.type) }}>{task.type}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tags */}
        <div className="px-4 py-2.5 flex flex-wrap gap-1.5 items-center min-h-[40px] relative" style={{ borderBottom: '1px solid var(--brd)' }}>
          <div className="absolute top-1.5 right-3"><ProBadge /></div>
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
            placeholder={t('detail.addTag')}
            className="text-[12px] bg-transparent focus:outline-none w-14 focus:w-20 transition-all"
            style={{ color: 'var(--t3)' }}
          />
        </div>

        {/* Notes — markdown */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--brd)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText size={11} style={{ color: 'var(--t3)' }} />
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--t3)' }}>{t('detail.notes')}</span>
          </div>
          <MarkdownNotes
            value={task.notes}
            onChange={(notes) => onUpdate({ notes })}
            placeholder={t('detail.notesPlaceholder')}
            minEditHeight={120}
            preprocess={preprocessWikiLinks}
            componentOverrides={{
              a: makeWikiLinkComponent({
                tasks: useTaskStore.getState().tasks,
                projects,
                /* Task notes can't easily route to project pages from here — links resolve, click is a no-op for now. */
              }) as any,
            }}
          />
        </div>

        {/* Gradient section divider */}
        <div className="section-divider mx-4" />

        {/* Detail rows */}
        <DetailRow
          icon={<Clock size={12} />}
          label={t('detail.pomodoro')}
          value={pomodoroValue}
          expanded={expanded === 'pomodoro'}
          onClick={() => toggleRow('pomodoro')}
          pro
        >
          <div className="pt-2 flex flex-col gap-2">
            <PomodoroRow
              label={t('detail.sessions')}
              value={task.pomodoroEstimate}
              min={1}
              onDec={() => { if (task.pomodoroEstimate > 1) onUpdate({ pomodoroEstimate: task.pomodoroEstimate - 1 }); }}
              onInc={() => onUpdate({ pomodoroEstimate: task.pomodoroEstimate + 1 })}
            />
            <PomodoroRow
              label={t('detail.workMin')}
              value={task.customWorkDuration ?? settings.workDuration}
              min={1}
              onDec={() => onUpdate({ customWorkDuration: Math.max(1, (task.customWorkDuration ?? settings.workDuration) - 1) })}
              onInc={() => onUpdate({ customWorkDuration: (task.customWorkDuration ?? settings.workDuration) + 1 })}
            />
            <PomodoroRow
              label={t('detail.shortBreakMin')}
              value={task.customShortBreakDuration ?? settings.shortBreakDuration}
              min={1}
              onDec={() => onUpdate({ customShortBreakDuration: Math.max(1, (task.customShortBreakDuration ?? settings.shortBreakDuration) - 1) })}
              onInc={() => onUpdate({ customShortBreakDuration: (task.customShortBreakDuration ?? settings.shortBreakDuration) + 1 })}
            />

            <div className="border-t pt-2 mt-0.5 flex flex-col gap-2" style={{ borderColor: 'var(--brd)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{t('detail.skipLongBreaks')}</span>
                <label className="toggle shrink-0">
                  <input
                    type="checkbox"
                    checked={!!task.skipLongBreak}
                    onChange={(e) => onUpdate({ skipLongBreak: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              {!task.skipLongBreak && (
                <>
                  <PomodoroRow
                    label={t('detail.longBreakMin')}
                    value={task.customLongBreakDuration ?? settings.longBreakDuration}
                    min={1}
                    onDec={() => onUpdate({ customLongBreakDuration: Math.max(1, (task.customLongBreakDuration ?? settings.longBreakDuration) - 1) })}
                    onInc={() => onUpdate({ customLongBreakDuration: (task.customLongBreakDuration ?? settings.longBreakDuration) + 1 })}
                  />
                  <PomodoroRow
                    label={t('detail.longBreakAfter')}
                    value={task.customLongBreakInterval ?? settings.longBreakInterval}
                    min={2}
                    suffix={t('detail.sessionsSuffix')}
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
                {t('detail.resetToDefaults')}
              </button>
            )}
          </div>
        </DetailRow>

        <DetailRow
          icon={<Calendar size={12} />}
          label={t('detail.dueDate')}
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
                    {t(`detail.dueOptions.${s.labelKey}`)}
                  </button>
                );
              })}
            </div>
            <div>
              <span className="text-[11px] block mb-1" style={{ color: 'var(--t3)' }}>{t('detail.customDate')}</span>
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
                style={{ color: 'var(--t)', borderColor: 'var(--brd)' }}
              />
            </div>
          </div>
        </DetailRow>

        {/* Depends on */}
        {(() => {
          const allTasks = useTaskStore.getState().tasks;
          const blockers = blockingTasks(task, allTasks);
          const dependsOnTasks = (task.dependsOn ?? [])
            .map((id) => allTasks.find((t) => t.id === id))
            .filter((t): t is Task => !!t);
          const candidates = dependencyCandidates(task, allTasks);
          const valueText = dependsOnTasks.length === 0
            ? t('detail.dependsNone')
            : blockers.length > 0
              ? t('detail.blockingCount', { count: blockers.length })
              : t('detail.doneCount', { count: dependsOnTasks.length });
          return (
            <DetailRow
              icon={<Lock size={12} />}
              label={t('detail.dependsOn')}
              value={valueText}
              valueColor={blockers.length > 0 ? 'var(--amb)' : dependsOnTasks.length > 0 ? 'var(--grn)' : 'var(--t3)'}
              expanded={expanded === 'depends'}
              onClick={() => toggleRow('depends')}
            >
              <div className="pt-2 flex flex-col gap-1">
                {dependsOnTasks.length === 0 && (
                  <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{t('detail.noDependencies')}</span>
                )}
                {dependsOnTasks.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg group/dep"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--brd)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: d.completed ? 'var(--grn)' : 'var(--amb)' }}
                    />
                    <span
                      className="text-[11.5px] flex-1 min-w-0 truncate"
                      style={{
                        color: d.completed ? 'var(--t3)' : 'var(--t2)',
                        textDecoration: d.completed ? 'line-through' : 'none',
                      }}
                    >
                      {d.title}
                    </span>
                    <button
                      onClick={() => onUpdate({ dependsOn: (task.dependsOn ?? []).filter((id) => id !== d.id) })}
                      className="opacity-0 group-hover/dep:opacity-100 transition-opacity"
                      style={{ color: 'var(--t3)' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* Picker */}
                {candidates.length > 0 && (
                  <div className="pt-1">
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--brd2)' }}
                    >
                      <Search size={10} style={{ color: 'var(--t3)' }} />
                      <span className="text-[11px] flex-1" style={{ color: 'var(--t3)' }}>
                        {t('detail.addDependencyHint')}
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto mt-1 flex flex-col gap-0.5">
                      {candidates.slice(0, 12).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onUpdate({ dependsOn: [...(task.dependsOn ?? []), c.id] })}
                          className="flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors"
                          style={{ color: 'var(--t2)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Plus size={10} style={{ color: 'var(--t3)' }} />
                          <span className="text-[11.5px] truncate">{c.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DetailRow>
          );
        })()}

        {/* Milestone — only when the assigned project has milestones */}
        {(() => {
          const proj = projects.find((p) => p.id === task.projectId);
          if (!proj || proj.milestones.length === 0) return null;
          const ms = proj.milestones.find((m) => m.id === task.milestoneId);
          return (
            <DetailRow
              icon={<Target size={12} />}
              label={t('detail.milestoneLabel')}
              value={ms?.title ?? t('detail.dependsNone')}
              valueColor={ms ? proj.color : 'var(--t3)'}
              expanded={expanded === 'milestone'}
              onClick={() => toggleRow('milestone')}
            >
              <div className="pt-2 flex flex-col gap-1">
                <button
                  onClick={() => { onUpdate({ milestoneId: undefined }); setExpanded(null); }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
                  style={{ background: !task.milestoneId ? 'rgba(255,255,255,0.05)' : 'transparent', color: !task.milestoneId ? 'var(--t2)' : 'var(--t3)' }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--brd2)' }} />
                  <span className="text-[12px]">{t('detail.noMilestone')}</span>
                </button>
                {proj.milestones.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { onUpdate({ milestoneId: m.id }); setExpanded(null); }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
                    style={{
                      background: task.milestoneId === m.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                      color: task.milestoneId === m.id ? 'var(--t)' : 'var(--t2)',
                    }}
                    onMouseEnter={(e) => { if (task.milestoneId !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { if (task.milestoneId !== m.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: m.completed ? 'var(--grn)' : proj.color }}
                    />
                    <span className="text-[12px] flex-1 min-w-0 truncate">{m.title}</span>
                    {m.targetDate && (
                      <span className="text-[10px]" style={{ color: 'var(--t3)' }}>
                        {new Date(m.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </DetailRow>
          );
        })()}

        <DetailRow
          icon={<FolderOpen size={12} />}
          label={t('detail.projectLabel')}
          value={projects.find((p) => p.id === task.projectId)?.name ?? t('detail.noProject')}
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
              <span className="text-[12px]">{t('detail.noProject')}</span>
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
          label={t('detail.reminder')}
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
              style={{ color: 'var(--t)', borderColor: 'var(--brd)' }}
            />
            {task.reminder && (
              <button
                onClick={() => { onUpdate({ reminder: undefined }); setExpanded(null); }}
                className="text-[11px] text-left underline"
                style={{ color: 'var(--t3)' }}
              >
                {t('detail.clearReminder')}
              </button>
            )}
          </div>
        </DetailRow>

        <DetailRow
          icon={<RefreshCw size={12} />}
          label={t('detail.repeat')}
          value={repeatLabel}
          valueColor={task.repeatType && task.repeatType !== 'none' ? 'var(--t2)' : 'var(--t3)'}
          expanded={expanded === 'repeat'}
          onClick={() => toggleRow('repeat')}
          pro
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
                  {t(`detail.repeatOptions.${r}`)}
                </button>
              );
            })}
          </div>
        </DetailRow>

        {/* Gradient divider */}
        <div className="section-divider mx-0 my-1" />

        {/* Subtasks */}
        <div className="px-4 py-2 relative">
          <div className="absolute top-1.5 right-3"><ProBadge /></div>
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSubtaskDragEnd}
          >
            <SortableContext
              items={task.subtasks.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {task.subtasks.map((subtask) => (
                <SortableSubtaskRow
                  key={subtask.id}
                  subtask={subtask}
                  isEditing={editingSubtaskId === subtask.id}
                  draft={subtaskDraft}
                  onDraftChange={setSubtaskDraft}
                  onStartEdit={() => {
                    setEditingSubtaskId(subtask.id);
                    setSubtaskDraft(subtask.title);
                  }}
                  onCommit={() => {
                    const trimmed = subtaskDraft.trim();
                    if (trimmed && trimmed !== subtask.title) {
                      updateSubtask(task.id, subtask.id, trimmed);
                    }
                    setEditingSubtaskId(null);
                    setSubtaskDraft('');
                  }}
                  onCancel={() => {
                    setEditingSubtaskId(null);
                    setSubtaskDraft('');
                  }}
                  onToggle={() => toggleSubtask(task.id, subtask.id)}
                  onDelete={() => deleteSubtask(task.id, subtask.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <div className="flex items-center gap-2 pt-2">
            <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: 'var(--brd2)' }} />
            <input
              value={newSubtaskValue}
              onChange={(e) => setNewSubtaskValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubtask();
                if (e.key === 'Escape') setNewSubtaskValue('');
              }}
              placeholder={t('detail.addStep')}
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

        {/* Activity timeline */}
        <div className="section-divider mx-0 my-1" />
        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--t3)' }}>
            {t('detail.activity')}
          </span>
        </div>
        <div className="pb-3">
          <ActivityTimeline taskId={task.id} compact />
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
            title={t('detail.editTitle')}
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-7 h-7 flex items-center justify-center rounded-xl transition-all"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,77,77,0.12)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
            title={t('detail.deleteTask')}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

interface SortableSubtaskRowProps {
  subtask: SubTask;
  isEditing: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  onStartEdit: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const SortableSubtaskRow: React.FC<SortableSubtaskRowProps> = ({
  subtask, isEditing, draft, onDraftChange, onStartEdit, onCommit, onCancel, onToggle, onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });
  const { t } = useTranslation('tasks');
  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-1.5 py-2 group/sub border-b"
      style={{
        borderColor: 'var(--brd)',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? 'rgba(255,255,255,0.03)' : undefined,
      }}
    >
      <span
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/sub:opacity-60 transition-opacity"
        style={{ color: 'var(--t3)', touchAction: 'none' }}
        title={t('detail.dragToReorder')}
      >
        <GripVertical size={12} />
      </span>
      <button
        onClick={onToggle}
        className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
        style={{
          // Use the theme's border token so the unchecked checkbox stays
          // visible on light themes (was rgba(255,255,255,0.14) — invisible
          // on a white card).
          borderColor: subtask.completed ? 'var(--grn)' : 'var(--brd2)',
          background: subtask.completed ? 'var(--grn)' : 'transparent',
        }}
      >
        {subtask.completed && <Check size={8} color="white" strokeWidth={3} />}
      </button>
      {isEditing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          className="flex-1 text-[12px] bg-transparent focus:outline-none min-w-0"
          style={{ color: 'var(--t)', caretColor: 'var(--accent)' }}
        />
      ) : (
        <span
          onDoubleClick={() => { if (!subtask.completed) onStartEdit(); }}
          className="flex-1 text-[12px] min-w-0 cursor-text"
          style={{
            color: subtask.completed ? 'var(--t3)' : 'var(--t)',
            textDecoration: subtask.completed ? 'line-through' : 'none',
          }}
          title={t('detail.doubleClickToEdit')}
        >
          {subtask.title}
        </span>
      )}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover/sub:opacity-100 transition-opacity"
        style={{ color: 'var(--t3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
      >
        <X size={11} />
      </button>
    </div>
  );
};
