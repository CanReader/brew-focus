import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Package, Clock, CheckSquare, TrendingUp } from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';
import { useTaskStore } from '../../store/taskStore';
import { useSettingsStore } from '../../store/settingsStore';

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface StatCardProps {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
  gradient: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon, gradient }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden shine-card"
    style={{
      background: `linear-gradient(135deg, ${gradient} 0%, var(--card) 100%)`,
      border: '1px solid var(--brd)',
    }}
  >
    <div className="flex items-center justify-between">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: `${color}20`, border: `1px solid ${color}30` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
    </div>
    <div>
      <div
        className="text-[26px] font-semibold tabular-nums leading-none mb-1"
        style={{
          background: `linear-gradient(135deg, var(--t) 0%, var(--t2) 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {value}
      </div>
      <div className="text-[11px]" style={{ color: 'var(--t3)' }}>{label}</div>
    </div>
    {/* Bottom accent line */}
    <div
      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
      style={{ background: `linear-gradient(90deg, ${color}, transparent)`, opacity: 0.5 }}
    />
  </motion.div>
);

const TimeRangeTabs: React.FC<{ value: TimeRange; onChange: (v: TimeRange) => void }> = ({ value, onChange }) => (
  <div
    className="flex rounded-xl p-0.5"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
  >
    {(['daily', 'weekly', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
      <button
        key={range}
        onClick={() => onChange(range)}
        className="px-2.5 py-1 text-[11px] font-medium rounded-lg capitalize transition-all"
        style={{
          background: value === range ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: value === range ? 'var(--t)' : 'var(--t3)',
          boxShadow: value === range ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        {range}
      </button>
    ))}
  </div>
);

const NoDataPlaceholder: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ color: 'var(--t3)' }}>
    <Package size={28} strokeWidth={1.5} />
    <span className="text-[12px]">No data yet</span>
  </div>
);

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl p-5 ${className}`}
    style={{
      background: 'var(--card)',
      border: '1px solid var(--brd)',
    }}
  >
    {children}
  </div>
);

export const ReportsScreen: React.FC = () => {
  const { sessions, todayFocusSeconds } = useTimerStore();
  const { tasks, projects } = useTaskStore();
  const { settings } = useSettingsStore();

  const [focusTimeRange, setFocusTimeRange] = useState<TimeRange>('daily');
  const [projectTimeRange, setProjectTimeRange] = useState<TimeRange>('daily');
  const [focusChartRange, setFocusChartRange] = useState<TimeRange>('daily');
  const [taskChartRange, setTaskChartRange] = useState<TimeRange>('daily');
  const [focusChartOffset, setFocusChartOffset] = useState(0);
  const [taskChartOffset, setTaskChartOffset] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const getDateRange = (range: TimeRange, baseDate: Date = new Date()) => {
    const start = new Date(baseDate);
    const end = new Date(baseDate);

    switch (range) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly': {
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
        break;
    }
    return { start, end };
  };

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const totalFocusSeconds = sessions
      .filter(s => s.phase === 'work')
      .reduce((acc, s) => acc + s.duration, 0);

    const weekFocusSeconds = sessions
      .filter(s => s.phase === 'work' && s.startedAt >= weekStart.getTime())
      .reduce((acc, s) => acc + s.duration, 0);

    const todayFocusSecondsCalc = sessions
      .filter(s => s.phase === 'work' && s.startedAt >= todayStart.getTime() && s.startedAt <= todayEnd.getTime())
      .reduce((acc, s) => acc + s.duration, 0);

    const effectiveTodayFocus = Math.max(todayFocusSeconds, todayFocusSecondsCalc);

    const completedTasks = tasks.filter(t => t.completed);
    const totalCompleted = completedTasks.length;

    const weekCompleted = completedTasks.filter(t =>
      t.completedAt && t.completedAt >= weekStart.getTime()
    ).length;

    const todayCompleted = completedTasks.filter(t =>
      t.completedAt && t.completedAt >= todayStart.getTime() && t.completedAt <= todayEnd.getTime()
    ).length;

    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };

    return {
      totalFocusTime: formatTime(totalFocusSeconds),
      weekFocusTime: formatTime(weekFocusSeconds),
      todayFocusTime: formatTime(effectiveTodayFocus),
      totalCompleted,
      weekCompleted,
      todayCompleted,
    };
  }, [sessions, tasks, todayFocusSeconds]);

  const pomodoroRecords = useMemo(() => {
    const days: { label: string; date: Date; hours: number[] }[] = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const hours = new Array(24).fill(0);

      sessions
        .filter(s => {
          const sDate = new Date(s.startedAt);
          return s.phase === 'work' &&
            sDate.getDate() === d.getDate() &&
            sDate.getMonth() === d.getMonth() &&
            sDate.getFullYear() === d.getFullYear();
        })
        .forEach(s => {
          const hour = new Date(s.startedAt).getHours();
          hours[hour] += s.duration / 60;
        });

      days.push({ label, date: d, hours });
    }

    return days;
  }, [sessions]);

  const focusChartData = useMemo(() => {
    const range = focusChartRange;
    const offset = focusChartOffset;
    const data: { label: string; minutes: number }[] = [];
    const now = new Date();

    if (range === 'daily') {
      const shift = offset * 14;
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i - shift);
        d.setHours(0, 0, 0, 0);
        const endOfDay = new Date(d);
        endOfDay.setHours(23, 59, 59, 999);
        const mins = sessions
          .filter(s => s.phase === 'work' && s.startedAt >= d.getTime() && s.startedAt <= endOfDay.getTime())
          .reduce((acc, s) => acc + s.duration, 0) / 60;
        data.push({ label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), minutes: Math.round(mins) });
      }
    } else if (range === 'weekly') {
      const shift = offset * 8;
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - (i + shift) * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const mins = sessions
          .filter(s => s.phase === 'work' && s.startedAt >= weekStart.getTime() && s.startedAt <= weekEnd.getTime())
          .reduce((acc, s) => acc + s.duration, 0) / 60;
        data.push({ label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, minutes: Math.round(mins) });
      }
    } else if (range === 'monthly') {
      const shift = offset * 12;
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i - shift, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i - shift + 1, 0, 23, 59, 59, 999);
        const mins = sessions
          .filter(s => s.phase === 'work' && s.startedAt >= monthStart.getTime() && s.startedAt <= monthEnd.getTime())
          .reduce((acc, s) => acc + s.duration, 0) / 60;
        data.push({ label: monthStart.toLocaleDateString('en-US', { month: 'short' }), minutes: Math.round(mins) });
      }
    } else if (range === 'yearly') {
      const shift = offset * 5;
      for (let i = 4; i >= 0; i--) {
        const yearStart = new Date(now.getFullYear() - i - shift, 0, 1);
        const yearEnd = new Date(now.getFullYear() - i - shift, 11, 31, 23, 59, 59, 999);
        const mins = sessions
          .filter(s => s.phase === 'work' && s.startedAt >= yearStart.getTime() && s.startedAt <= yearEnd.getTime())
          .reduce((acc, s) => acc + s.duration, 0) / 60;
        data.push({ label: String(yearStart.getFullYear()), minutes: Math.round(mins) });
      }
    }

    return data;
  }, [sessions, focusChartRange, focusChartOffset]);

  const taskChartData = useMemo(() => {
    const range = taskChartRange;
    const offset = taskChartOffset;
    const data: { label: string; count: number }[] = [];
    const now = new Date();
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);

    if (range === 'daily') {
      const shift = offset * 14;
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i - shift);
        d.setHours(0, 0, 0, 0);
        const endOfDay = new Date(d);
        endOfDay.setHours(23, 59, 59, 999);
        const count = completedTasks.filter(t => t.completedAt! >= d.getTime() && t.completedAt! <= endOfDay.getTime()).length;
        data.push({ label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), count });
      }
    } else if (range === 'weekly') {
      const shift = offset * 8;
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - (i + shift) * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const count = completedTasks.filter(t => t.completedAt! >= weekStart.getTime() && t.completedAt! <= weekEnd.getTime()).length;
        data.push({ label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, count });
      }
    } else if (range === 'monthly') {
      const shift = offset * 12;
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i - shift, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i - shift + 1, 0, 23, 59, 59, 999);
        const count = completedTasks.filter(t => t.completedAt! >= monthStart.getTime() && t.completedAt! <= monthEnd.getTime()).length;
        data.push({ label: monthStart.toLocaleDateString('en-US', { month: 'short' }), count });
      }
    } else if (range === 'yearly') {
      const shift = offset * 5;
      for (let i = 4; i >= 0; i--) {
        const yearStart = new Date(now.getFullYear() - i - shift, 0, 1);
        const yearEnd = new Date(now.getFullYear() - i - shift, 11, 31, 23, 59, 59, 999);
        const count = completedTasks.filter(t => t.completedAt! >= yearStart.getTime() && t.completedAt! <= yearEnd.getTime()).length;
        data.push({ label: String(yearStart.getFullYear()), count });
      }
    }

    return data;
  }, [tasks, taskChartRange, taskChartOffset]);

  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = new Array(adjustedStart).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    const goalSeconds = settings.dailyFocusGoal * 3600;
    let focusDays = 0;
    let goalDays = 0;

    const dayData: Record<number, number> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, month, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month, day, 23, 59, 59, 999);
      const daySeconds = sessions
        .filter(s => s.phase === 'work' && s.startedAt >= dayStart.getTime() && s.startedAt <= dayEnd.getTime())
        .reduce((acc, s) => acc + s.duration, 0);
      dayData[day] = daySeconds;
      if (daySeconds > 0) focusDays++;
      if (daySeconds >= goalSeconds) goalDays++;
    }

    const completionRate = focusDays > 0 ? Math.round((goalDays / focusDays) * 100) : 0;

    return {
      weeks,
      monthLabel: calendarDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      focusDays,
      goalDays,
      completionRate,
      dayData,
      goalSeconds,
    };
  }, [calendarDate, sessions, settings.dailyFocusGoal]);

  const focusTimeData = useMemo(() => {
    const { start, end } = getDateRange(focusTimeRange);
    const filtered = sessions.filter(s =>
      s.phase === 'work' && s.startedAt >= start.getTime() && s.startedAt <= end.getTime()
    );
    const totalSeconds = filtered.reduce((acc, s) => acc + s.duration, 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    const taskMap = new Map<string, { title: string; minutes: number }>();
    filtered.forEach(s => {
      const key = s.taskId ?? '__none__';
      const existing = taskMap.get(key);
      if (existing) {
        existing.minutes += s.duration / 60;
      } else {
        taskMap.set(key, { title: s.taskTitle ?? 'No task', minutes: s.duration / 60 });
      }
    });

    const taskBreakdown = Array.from(taskMap.values())
      .map(t => ({ ...t, minutes: Math.round(t.minutes) }))
      .sort((a, b) => b.minutes - a.minutes);

    return { totalMinutes, taskBreakdown, hasData: filtered.length > 0 };
  }, [sessions, focusTimeRange]);

  const maxFocusMinutes = Math.max(...focusChartData.map(d => d.minutes), 60);
  const maxTaskCount = Math.max(...taskChartData.map(d => d.count), 4);
  const topFocusMinutes = Math.max(...focusChartData.map(d => d.minutes));
  const avgFocusMinutes = focusChartData.length > 0
    ? Math.round(focusChartData.reduce((a, d) => a + d.minutes, 0) / focusChartData.length)
    : 0;
  const topTaskCount = Math.max(...taskChartData.map(d => d.count));
  const avgTaskCount = taskChartData.length > 0
    ? (taskChartData.reduce((a, d) => a + d.count, 0) / taskChartData.length).toFixed(1)
    : '0';

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>
      {/* Subtle gradient header */}
      <div
        className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(180deg, var(--bg) 60%, transparent 100%)',
        }}
      >
        <div>
          <h1
            className="text-[20px] font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--t) 0%, var(--t2) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Reports
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
            Your focus journey at a glance
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-6 gap-3">
          <StatCard
            label="Total Focus"
            value={stats.totalFocusTime}
            color="var(--accent)"
            gradient="rgba(255,77,77,0.06)"
            icon={<Clock size={14} />}
          />
          <StatCard
            label="This Week"
            value={stats.weekFocusTime}
            color="var(--blu)"
            gradient="rgba(91,141,238,0.06)"
            icon={<TrendingUp size={14} />}
          />
          <StatCard
            label="Today"
            value={stats.todayFocusTime}
            color="var(--grn)"
            gradient="rgba(34,211,165,0.06)"
            icon={<Clock size={14} />}
          />
          <StatCard
            label="Tasks Done"
            value={String(stats.totalCompleted)}
            color="var(--grn)"
            gradient="rgba(34,211,165,0.06)"
            icon={<CheckSquare size={14} />}
          />
          <StatCard
            label="Done This Week"
            value={String(stats.weekCompleted)}
            color="var(--amb)"
            gradient="rgba(245,166,35,0.06)"
            icon={<CheckSquare size={14} />}
          />
          <StatCard
            label="Done Today"
            value={String(stats.todayCompleted)}
            color="var(--accent)"
            gradient="rgba(255,77,77,0.06)"
            icon={<CheckSquare size={14} />}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-5">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Pomodoro Records heatmap */}
            <SectionCard>
              <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--t)' }}>
                Pomodoro Records
              </h3>
              <div className="space-y-1">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-20" />
                  {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
                    <div key={h} className="flex-1 text-[9px] text-center" style={{ color: 'var(--t3)' }}>
                      {h}
                    </div>
                  ))}
                </div>
                {pomodoroRecords.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <div className="w-20 text-[10px] shrink-0 truncate" style={{ color: 'var(--t3)' }}>
                      {day.label}
                    </div>
                    <div className="flex-1 flex gap-0.5">
                      {day.hours.map((mins, h) => (
                        <div
                          key={h}
                          className="h-3.5 flex-1 rounded-sm transition-colors"
                          style={{
                            background: mins > 0
                              ? `rgba(255,77,77,${Math.min(0.9, 0.2 + (mins / 30) * 0.7)})`
                              : 'rgba(255,255,255,0.04)',
                          }}
                          title={`${day.label} ${h}:00 — ${Math.round(mins)}min`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Project Time Distribution */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>
                  Project Breakdown
                </h3>
                <TimeRangeTabs value={projectTimeRange} onChange={setProjectTimeRange} />
              </div>
              {projects.length === 0 ? (
                <NoDataPlaceholder />
              ) : (
                <div className="space-y-3">
                  {projects.map(project => {
                    const { start, end } = getDateRange(projectTimeRange);
                    const projectSessions = sessions.filter(s => {
                      if (s.phase !== 'work' || !s.taskId) return false;
                      const task = tasks.find(t => t.id === s.taskId);
                      return task?.projectId === project.id &&
                        s.startedAt >= start.getTime() &&
                        s.startedAt <= end.getTime();
                    });
                    const totalMins = projectSessions.reduce((a, s) => a + s.duration, 0) / 60;
                    const maxProjMins = Math.max(...projects.map(p => {
                      const pSessions = sessions.filter(s => {
                        if (s.phase !== 'work' || !s.taskId) return false;
                        const t = tasks.find(t => t.id === s.taskId);
                        return t?.projectId === p.id && s.startedAt >= start.getTime() && s.startedAt <= end.getTime();
                      });
                      return pSessions.reduce((a, s) => a + s.duration, 0) / 60;
                    }), 1);

                    return (
                      <div key={project.id}>
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: project.color, boxShadow: `0 0 5px ${project.color}80` }}
                          />
                          <span className="flex-1 text-[12px]" style={{ color: 'var(--t2)' }}>
                            {project.name}
                          </span>
                          <span className="text-[11px] tabular-nums" style={{ color: 'var(--t3)' }}>
                            {Math.round(totalMins)}m
                          </span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(totalMins / maxProjMins) * 100}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{
                              background: `linear-gradient(90deg, ${project.color}, ${project.color}99)`,
                              boxShadow: totalMins > 0 ? `0 0 6px ${project.color}60` : 'none',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Focus Time breakdown */}
            <SectionCard>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>
                  Focus Time
                </h3>
                <TimeRangeTabs value={focusTimeRange} onChange={setFocusTimeRange} />
              </div>
              <p className="text-[12px] mb-3" style={{ color: 'var(--t3)' }}>
                Total:{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  {focusTimeData.totalMinutes >= 60
                    ? `${Math.floor(focusTimeData.totalMinutes / 60)}h ${focusTimeData.totalMinutes % 60}m`
                    : `${focusTimeData.totalMinutes}m`}
                </span>
              </p>
              {!focusTimeData.hasData ? (
                <NoDataPlaceholder />
              ) : (
                <div className="space-y-2">
                  {focusTimeData.taskBreakdown.map((t, i) => {
                    const maxMins = focusTimeData.taskBreakdown[0]?.minutes ?? 1;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[11px] w-24 truncate shrink-0" style={{ color: 'var(--t2)' }}>
                          {t.title}
                        </span>
                        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(t.minutes / maxMins) * 100}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            style={{
                              background: 'linear-gradient(90deg, var(--accent), #ff8080)',
                              boxShadow: '0 0 6px var(--accent-g)',
                              minWidth: t.minutes > 0 ? '4px' : '0',
                            }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--t3)' }}>
                          {t.minutes}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Focus Time Goal Calendar */}
            <SectionCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>
                  Focus Goal Calendar
                </h3>
                <div
                  className="px-2.5 py-1 text-[11px] rounded-xl font-medium"
                  style={{ background: 'var(--accent-d)', color: 'var(--accent)', border: '1px solid var(--accent-g)' }}
                >
                  {settings.dailyFocusGoal}h goal
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-3 mb-3">
                {[
                  { label: 'Focus Days', value: calendarData.focusDays, color: 'var(--blu)' },
                  { label: 'Goal Days', value: calendarData.goalDays, color: 'var(--grn)' },
                  { label: 'Goal Rate', value: `${calendarData.completionRate}%`, color: 'var(--amb)' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex-1 rounded-xl p-2 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--brd)' }}
                  >
                    <div className="text-[15px] font-semibold" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-[10px]" style={{ color: 'var(--t3)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Calendar navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--t)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[13px] font-medium" style={{ color: 'var(--t)' }}>
                  {calendarData.monthLabel}
                </span>
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--t)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Calendar grid */}
              <div className="space-y-1">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-1.5" style={{ color: 'var(--t3)' }}>
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d}>{d}</div>)}
                </div>
                {calendarData.weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((day, di) => {
                      const isToday = day !== null &&
                        new Date().getDate() === day &&
                        new Date().getMonth() === calendarDate.getMonth() &&
                        new Date().getFullYear() === calendarDate.getFullYear();
                      const daySeconds = day ? (calendarData.dayData[day] ?? 0) : 0;
                      const goalPct = daySeconds > 0 ? Math.min(1, daySeconds / calendarData.goalSeconds) : 0;
                      const hasFocus = daySeconds > 0;

                      return (
                        <div
                          key={di}
                          className="aspect-square flex items-center justify-center text-[11px] rounded-lg transition-all"
                          style={{
                            background: isToday
                              ? 'var(--accent)'
                              : hasFocus
                              ? `rgba(34,211,165,${0.1 + goalPct * 0.4})`
                              : 'transparent',
                            color: day === null ? 'transparent' : isToday ? 'white' : hasFocus ? 'var(--t)' : 'var(--t3)',
                            border: isToday ? 'none' : hasFocus ? `1px solid rgba(34,211,165,${0.15 + goalPct * 0.2})` : '1px solid transparent',
                            boxShadow: isToday ? '0 0 8px var(--accent-g)' : 'none',
                          }}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-5">
          {/* Focus Time Chart */}
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>Focus Time Chart</h3>
              <div className="flex items-center gap-3">
                <TimeRangeTabs value={focusChartRange} onChange={(v) => { setFocusChartRange(v); setFocusChartOffset(0); }} />
                <div className="flex items-center gap-0.5">
                  <button
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--t3)' }}
                    onClick={() => setFocusChartOffset(o => o + 1)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--t)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    className="text-[10px] px-1"
                    style={{ color: 'var(--t3)' }}
                    onClick={() => setFocusChartOffset(0)}
                  >
                    {focusChartOffset === 0 ? 'Now' : `−${focusChartOffset}`}
                  </button>
                  <button
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: focusChartOffset > 0 ? 'var(--t3)' : 'var(--brd2)' }}
                    onClick={() => setFocusChartOffset(o => Math.max(0, o - 1))}
                    disabled={focusChartOffset === 0}
                    onMouseEnter={(e) => { if (focusChartOffset > 0) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--t)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = focusChartOffset > 0 ? 'var(--t3)' : 'var(--brd2)'; }}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-[11px] mb-4" style={{ color: 'var(--t3)' }}>
              <span>Top: <span style={{ color: 'var(--t2)' }}>{topFocusMinutes}m</span></span>
              <span>Avg: <span style={{ color: 'var(--t2)' }}>{avgFocusMinutes}m</span></span>
            </div>

            <div className="h-[140px] flex items-end gap-1">
              {focusChartData.map((d, i) => {
                const isLatest = i === focusChartData.length - 1 && focusChartOffset === 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="w-full relative h-full flex items-end justify-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.minutes / maxFocusMinutes) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.02, ease: 'easeOut' }}
                        className="w-full max-w-[24px] rounded-t-sm"
                        style={{
                          background: isLatest
                            ? 'linear-gradient(180deg, var(--accent), rgba(255,77,77,0.5))'
                            : d.minutes > 0
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.03)',
                          boxShadow: isLatest && d.minutes > 0 ? '0 0 12px var(--accent-g)' : 'none',
                          minHeight: d.minutes > 0 ? '4px' : '0',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--t3)' }}>
              <span>{focusChartData[0]?.label}</span>
              <span>{focusChartData[focusChartData.length - 1]?.label}</span>
            </div>
          </SectionCard>

          {/* Task Chart */}
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>Task Completions</h3>
              <div className="flex items-center gap-3">
                <TimeRangeTabs value={taskChartRange} onChange={(v) => { setTaskChartRange(v); setTaskChartOffset(0); }} />
                <div className="flex items-center gap-0.5">
                  <button
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--t3)' }}
                    onClick={() => setTaskChartOffset(o => o + 1)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--t)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    className="text-[10px] px-1"
                    style={{ color: 'var(--t3)' }}
                    onClick={() => setTaskChartOffset(0)}
                  >
                    {taskChartOffset === 0 ? 'Now' : `−${taskChartOffset}`}
                  </button>
                  <button
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: taskChartOffset > 0 ? 'var(--t3)' : 'var(--brd2)' }}
                    onClick={() => setTaskChartOffset(o => Math.max(0, o - 1))}
                    disabled={taskChartOffset === 0}
                    onMouseEnter={(e) => { if (taskChartOffset > 0) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--t)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = taskChartOffset > 0 ? 'var(--t3)' : 'var(--brd2)'; }}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-[11px] mb-4" style={{ color: 'var(--t3)' }}>
              <span>Top: <span style={{ color: 'var(--t2)' }}>{topTaskCount} tasks</span></span>
              <span>Avg: <span style={{ color: 'var(--t2)' }}>{avgTaskCount} tasks</span></span>
            </div>

            <div className="h-[140px] flex items-end gap-1">
              {taskChartData.map((d, i) => {
                const isLatest = i === taskChartData.length - 1 && taskChartOffset === 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="w-full relative h-full flex items-end justify-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.count / maxTaskCount) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.02, ease: 'easeOut' }}
                        className="w-full max-w-[24px] rounded-t-sm"
                        style={{
                          background: isLatest
                            ? 'linear-gradient(180deg, var(--grn), rgba(34,211,165,0.5))'
                            : d.count > 0
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.03)',
                          boxShadow: isLatest && d.count > 0 ? '0 0 12px rgba(34,211,165,0.3)' : 'none',
                          minHeight: d.count > 0 ? '4px' : '0',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--t3)' }}>
              <span>{taskChartData[0]?.label}</span>
              <span>{taskChartData[taskChartData.length - 1]?.label}</span>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
