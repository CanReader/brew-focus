import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Inbox, Sun, Calendar, AlignLeft, BarChart2, Flag,
} from 'lucide-react';
import { Task, Project, Priority } from '../../types';

interface Command {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandGroup {
  label: string;
  commands: Command[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onCreateTask: () => void;
  tasks: Task[];
  projects: Project[];
  activeTaskId: string | null;
  onSetPriority: (taskId: string, priority: Priority) => void;
}

const PRIORITY_META: { priority: Priority; label: string; color: string }[] = [
  { priority: 'p1', label: 'High',   color: '#e8453c' },
  { priority: 'p2', label: 'Medium', color: '#e8a83e' },
  { priority: 'p3', label: 'Low',    color: '#5a9cf5' },
  { priority: 'p4', label: 'None',   color: 'var(--t3)' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onClose,
  onNavigate,
  onCreateTask,
  projects,
  activeTaskId,
  onSetPriority,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset selection whenever query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const groups: CommandGroup[] = useMemo(() => {
    const nav: Command[] = [
      {
        id: 'nav-inbox',
        label: 'Go to Inbox',
        icon: <Inbox size={14} style={{ color: 'var(--t2)' }} />,
        action: () => { onNavigate('all'); onClose(); },
        keywords: ['inbox', 'tasks'],
      },
      {
        id: 'nav-today',
        label: 'Go to Today',
        icon: <Sun size={14} style={{ color: 'var(--t2)' }} />,
        action: () => { onNavigate('today'); onClose(); },
        keywords: ['today', 'daily'],
      },
      {
        id: 'nav-week',
        label: 'Go to This Week',
        icon: <Calendar size={14} style={{ color: 'var(--t2)' }} />,
        action: () => { onNavigate('week'); onClose(); },
        keywords: ['week', 'weekly'],
      },
      {
        id: 'nav-all',
        label: 'Go to All Tasks',
        icon: <AlignLeft size={14} style={{ color: 'var(--t2)' }} />,
        action: () => { onNavigate('all'); onClose(); },
        keywords: ['all', 'tasks', 'list'],
      },
      {
        id: 'nav-focus-week',
        label: 'Go to Focus Week',
        icon: <BarChart2 size={14} style={{ color: 'var(--t2)' }} />,
        action: () => { onNavigate('focus-week'); onClose(); },
        keywords: ['focus', 'week', 'calendar', 'schedule'],
      },
    ];

    const actions: Command[] = [
      {
        id: 'action-new-task',
        label: 'New Task',
        icon: <Plus size={14} style={{ color: 'var(--t2)' }} />,
        action: () => { onCreateTask(); onClose(); },
        keywords: ['new', 'create', 'add', 'task'],
      },
    ];

    const projectCommands: Command[] = projects.map((p) => ({
      id: `project-${p.id}`,
      label: `Open ${p.name}`,
      sublabel: 'Project',
      icon: (
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: p.color }}
        />
      ),
      action: () => { onNavigate(p.id); onClose(); },
      keywords: [p.name.toLowerCase(), 'project', 'open'],
    }));

    const priorityCommands: Command[] = activeTaskId
      ? PRIORITY_META.map((pm) => ({
          id: `priority-${pm.priority}`,
          label: `Set Priority: ${pm.label}`,
          sublabel: 'Active task',
          icon: <Flag size={14} style={{ color: pm.color }} />,
          action: () => { onSetPriority(activeTaskId, pm.priority); onClose(); },
          keywords: ['priority', pm.label.toLowerCase(), pm.priority, 'flag'],
        }))
      : [];

    return [
      { label: 'Navigation', commands: nav },
      { label: 'Actions',    commands: actions },
      { label: 'Projects',   commands: projectCommands },
      { label: 'Priority',   commands: priorityCommands },
    ];
  }, [projects, activeTaskId, onNavigate, onCreateTask, onClose, onSetPriority]);

  // Filtered flat list for keyboard nav + rendering
  const filteredGroups: CommandGroup[] = useMemo(() => {
    if (!query.trim()) return groups.filter((g) => g.commands.length > 0);
    const q = query.toLowerCase();
    return groups
      .map((g) => ({
        label: g.label,
        commands: g.commands.filter((c) => {
          const haystack = [
            c.label,
            c.sublabel ?? '',
            ...(c.keywords ?? []),
          ].join(' ').toLowerCase();
          return haystack.includes(q);
        }),
      }))
      .filter((g) => g.commands.length > 0);
  }, [groups, query]);

  const flatCommands = useMemo(
    () => filteredGroups.flatMap((g) => g.commands),
    [filteredGroups],
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        flatCommands[selectedIndex]?.action();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flatCommands, selectedIndex, onClose]);

  // Build a flat index map so we can look up absolute index per group item
  let flatIdx = 0;
  const groupsWithIndex: Array<{ label: string; commands: Array<Command & { flatIndex: number }> }> = filteredGroups.map((g) => ({
    label: g.label,
    commands: g.commands.map((c) => ({ ...c, flatIndex: flatIdx++ })),
  }));

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Palette box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: 0.15 }}
        style={{
          width: 480,
          background: 'var(--card)',
          borderRadius: 14,
          border: '1px solid var(--brd2)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'var(--brd)' }}
        >
          <Search size={16} style={{ color: 'var(--t3)', flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 text-[14px] bg-transparent focus:outline-none"
            style={{ color: 'var(--t)' }}
            aria-label="Search commands"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={
              flatCommands[selectedIndex] ? `cmd-${flatCommands[selectedIndex].id}` : undefined
            }
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--brd)', color: 'var(--t3)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="overflow-y-auto"
          style={{ maxHeight: 280 }}
        >
          {flatCommands.length === 0 ? (
            <div
              className="flex items-center justify-center py-8 text-[13px]"
              style={{ color: 'var(--t3)' }}
            >
              No commands found
            </div>
          ) : (
            groupsWithIndex.map((group) => (
              <div key={group.label}>
                {/* Group label */}
                <div
                  className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--t3)' }}
                >
                  {group.label}
                </div>

                {/* Group commands */}
                {group.commands.map((cmd) => {
                  const isSelected = cmd.flatIndex === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      id={`cmd-${cmd.id}`}
                      ref={(el) => { itemRefs.current[cmd.flatIndex] = el; }}
                      role="option"
                      aria-selected={isSelected}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(cmd.flatIndex)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: isSelected ? 'var(--accent-d)' : 'transparent',
                      }}
                    >
                      {/* Icon container */}
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: 'var(--card-h)' }}
                      >
                        {cmd.icon}
                      </div>

                      {/* Labels */}
                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-[13px] leading-snug truncate"
                          style={{ color: 'var(--t)' }}
                        >
                          {cmd.label}
                        </span>
                        {cmd.sublabel && (
                          <span
                            className="text-[11px] leading-snug truncate"
                            style={{ color: 'var(--t3)' }}
                          >
                            {cmd.sublabel}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
