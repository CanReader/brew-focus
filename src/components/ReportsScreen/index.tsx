import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';
import { useTaskStore } from '../../store/taskStore';
import { useSettingsStore } from '../../store/settingsStore';

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => (
  <div
    className="rounded-xl p-4 flex flex-col gap-1"
    style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
  >
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 rounded-full" style={{ background: color }} />
      <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{label}</span>
    </div>
    <div className="text-[24px] font-semibold tabular-nums" style={{ color: 'var(--t)' }}>
      {value}
    </div>
  </div>
);

const TimeRangeTabs: React.FC<{ value: TimeRange; onChange: (v: TimeRange) => void }> = ({ value, onChange }) => (
  <div className="flex rounded-lg p-0.5" style={{ background: 'var(--bg2)' }}>
    {(['daily', 'weekly', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
      <button
        key={range}
        onClick={() => onChange(range)}
        className="px-3 py-1 text-[11px] font-medium rounded-md capitalize transition-all"
        style={{
          background: value === range ? 'var(--card)' : 'transparent',
          color: value === range ? 'var(--t)' : 'var(--t3)',
        }}
      >
        {range}
      </button>
    ))}
  </div>
);

const NoDataPlaceholder: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 gap-2" style={{ color: 'var(--t3)' }}>
    <Package size={32} strokeWidth={1.5} />
    <span className="text-[13px]">No Data</span>
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

  // Helper to get date ranges
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

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Total focus time from all sessions
    const totalFocusSeconds = sessions
      .filter(s => s.phase === 'work')
      .reduce((acc, s) => acc + s.duration, 0);

    // This week's focus time
    const weekFocusSeconds = sessions
      .filter(s => s.phase === 'work' && s.startedAt >= weekStart.getTime())
      .reduce((acc, s) => acc + s.duration, 0);

    // Today's focus time
    const todayFocusSecondsCalc = sessions
      .filter(s => s.phase === 'work' && s.startedAt >= todayStart.getTime() && s.startedAt <= todayEnd.getTime())
      .reduce((acc, s) => acc + s.duration, 0);

    // Use the store's todayFocusSeconds if higher (accounts for current session)
    const effectiveTodayFocus = Math.max(todayFocusSeconds, todayFocusSecondsCalc);

    // Completed tasks
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

  // Pomodoro records heatmap data (last 14 days)
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
          hours[hour] += s.duration / 60; // minutes
        });

      days.push({ label, date: d, hours });
    }

    return days;
  }, [sessions]);

  // Focus time chart data
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

        data.push({
          label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          minutes: Math.round(mins),
        });
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

        data.push({
          label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          minutes: Math.round(mins),
        });
      }
    } else if (range === 'monthly') {
      const shift = offset * 12;
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i - shift, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i - shift + 1, 0, 23, 59, 59, 999);

        const mins = sessions
          .filter(s => s.phase === 'work' && s.startedAt >= monthStart.getTime() && s.startedAt <= monthEnd.getTime())
          .reduce((acc, s) => acc + s.duration, 0) / 60;

        data.push({
          label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          minutes: Math.round(mins),
        });
      }
    } else if (range === 'yearly') {
      const shift = offset * 5;
      for (let i = 4; i >= 0; i--) {
        const yearStart = new Date(now.getFullYear() - i - shift, 0, 1);
        const yearEnd = new Date(now.getFullYear() - i - shift, 11, 31, 23, 59, 59, 999);

        const mins = sessions
          .filter(s => s.phase === 'work' && s.startedAt >= yearStart.getTime() && s.startedAt <= yearEnd.getTime())
          .reduce((acc, s) => acc + s.duration, 0) / 60;

        data.push({
          label: String(yearStart.getFullYear()),
          minutes: Math.round(mins),
        });
      }
    }

    return data;
  }, [sessions, focusChartRange, focusChartOffset]);

  // Task chart data
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

        const count = completedTasks.filter(t =>
          t.completedAt! >= d.getTime() && t.completedAt! <= endOfDay.getTime()
        ).length;

        data.push({
          label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          count,
        });
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

        const count = completedTasks.filter(t =>
          t.completedAt! >= weekStart.getTime() && t.completedAt! <= weekEnd.getTime()
        ).length;

        data.push({
          label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          count,
        });
      }
    } else if (range === 'monthly') {
      const shift = offset * 12;
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i - shift, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i - shift + 1, 0, 23, 59, 59, 999);

        const count = completedTasks.filter(t =>
          t.completedAt! >= monthStart.getTime() && t.completedAt! <= monthEnd.getTime()
        ).length;

        data.push({
          label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          count,
        });
      }
    } else if (range === 'yearly') {
      const shift = offset * 5;
      for (let i = 4; i >= 0; i--) {
        const yearStart = new Date(now.getFullYear() - i - shift, 0, 1);
        const yearEnd = new Date(now.getFullYear() - i - shift, 11, 31, 23, 59, 59, 999);

        const count = completedTasks.filter(t =>
          t.completedAt! >= yearStart.getTime() && t.completedAt! <= yearEnd.getTime()
        ).length;

        data.push({
          label: String(yearStart.getFullYear()),
          count,
        });
      }
    }

    return data;
  }, [tasks, taskChartRange, taskChartOffset]);

  // Focus goal calendar data
  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    // Adjust for Monday start (0 = Mon, 6 = Sun)
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

    // Calculate focus days and goal completion
    const goalSeconds = settings.dailyFocusGoal * 3600;
    let focusDays = 0;
    let goalDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, month, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month, day, 23, 59, 59, 999);

      const daySeconds = sessions
        .filter(s => s.phase === 'work' && s.startedAt >= dayStart.getTime() && s.startedAt <= dayEnd.getTime())
        .reduce((acc, s) => acc + s.duration, 0);

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
    };
  }, [calendarDate, sessions, settings.dailyFocusGoal]);

  // Focus time data for the "Focus Time" section (top-right card)
  const focusTimeData = useMemo(() => {
    const { start, end } = getDateRange(focusTimeRange);
    const filtered = sessions.filter(s =>
      s.phase === 'work' && s.startedAt >= start.getTime() && s.startedAt <= end.getTime()
    );
    const totalSeconds = filtered.reduce((acc, s) => acc + s.duration, 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    // Group by task
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
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold" style={{ color: 'var(--t)' }}>Report</h1>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-6 gap-3">
          <StatCard label="Total Focus Time" value={stats.totalFocusTime} color="#e8453c" />
          <StatCard label="Focus Time of This Week" value={stats.weekFocusTime} color="#5a9cf5" />
          <StatCard label="Focus Time of Today" value={stats.todayFocusTime} color="#5a9cf5" />
          <StatCard label="Total Completed Tasks" value={String(stats.totalCompleted)} color="#34c759" />
          <StatCard label="Tasks Completed This Week" value={String(stats.weekCompleted)} color="#e8453c" />
          <StatCard label="Tasks Completed Today" value={String(stats.todayCompleted)} color="#e8453c" />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Pomodoro Records */}
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
            >
              <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--t)' }}>
                Pomodoro Records
              </h3>
              <div className="space-y-1">
                {/* Hours header */}
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-20" />
                  {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
                    <div key={h} className="flex-1 text-[10px] text-center" style={{ color: 'var(--t3)' }}>
                      {h}:00
                    </div>
                  ))}
                </div>
                {/* Days rows */}
                {pomodoroRecords.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <div className="w-20 text-[11px] shrink-0" style={{ color: 'var(--t3)' }}>
                      {day.label}
                    </div>
                    <div className="flex-1 flex gap-0.5">
                      {day.hours.map((mins, h) => (
                        <div
                          key={h}
                          className="h-4 flex-1 rounded-sm transition-colors"
                          style={{
                            background: mins > 0
                              ? `rgba(232, 69, 60, ${Math.min(1, mins / 30)})`
                              : 'var(--bg2)',
                          }}
                          title={`${day.label} ${h}:00 - ${Math.round(mins)}min`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Time Distribution */}
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>
                  Project Time Distribution
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

                    return (
                      <div key={project.id} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ background: project.color }} />
                        <span className="flex-1 text-[13px]" style={{ color: 'var(--t2)' }}>
                          {project.name}
                        </span>
                        <span className="text-[13px] tabular-nums" style={{ color: 'var(--t3)' }}>
                          {Math.round(totalMins)}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Focus Time */}
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>
                  Focus Time
                </h3>
                <TimeRangeTabs value={focusTimeRange} onChange={setFocusTimeRange} />
              </div>
              <p className="text-[12px] mb-3" style={{ color: 'var(--t3)' }}>
                Total: {focusTimeData.totalMinutes >= 60
                  ? `${Math.floor(focusTimeData.totalMinutes / 60)}h ${focusTimeData.totalMinutes % 60}m`
                  : `${focusTimeData.totalMinutes}m`}
              </p>
              <div className="mt-2">
                {!focusTimeData.hasData ? (
                  <NoDataPlaceholder />
                ) : (
                  <div className="space-y-2">
                    {focusTimeData.taskBreakdown.map((t, i) => {
                      const maxMins = focusTimeData.taskBreakdown[0]?.minutes ?? 1;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[12px] w-24 truncate shrink-0" style={{ color: 'var(--t2)' }}>
                            {t.title}
                          </span>
                          <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ background: 'var(--bg2)' }}>
                            <div
                              className="h-full rounded-sm"
                              style={{
                                width: `${(t.minutes / maxMins) * 100}%`,
                                background: 'var(--accent)',
                                minWidth: t.minutes > 0 ? '4px' : '0',
                              }}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums shrink-0" style={{ color: 'var(--t3)' }}>
                            {t.minutes}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Focus Time Goal */}
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>
                  Focus Time Goal
                </h3>
                <div
                  className="px-3 py-1 text-[11px] rounded-lg font-medium"
                  style={{ background: 'var(--bg2)', color: 'var(--t2)' }}
                >
                  Goal: {settings.dailyFocusGoal}H
                </div>
              </div>

              <div className="text-[12px] mb-4" style={{ color: 'var(--t3)' }}>
                Focus Days: {calendarData.focusDays} days, Completed Goal Days: {calendarData.goalDays} days, Goal Completion Rate: {calendarData.completionRate}%
              </div>

              {/* Calendar Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--t3)' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[13px] font-medium" style={{ color: 'var(--t)' }}>
                  {calendarData.monthLabel}
                </span>
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--t3)' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Calendar */}
              <div className="space-y-1">
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-2" style={{ color: 'var(--t3)' }}>
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                {calendarData.weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((day, di) => {
                      const isToday = day !== null &&
                        new Date().getDate() === day &&
                        new Date().getMonth() === calendarDate.getMonth() &&
                        new Date().getFullYear() === calendarDate.getFullYear();

                      return (
                        <div
                          key={di}
                          className="aspect-square flex items-center justify-center text-[12px] rounded-md"
                          style={{
                            background: isToday ? 'var(--accent)' : 'transparent',
                            color: day === null ? 'transparent' : isToday ? 'white' : 'var(--t2)',
                          }}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Focus Time Chart */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>
                Focus Time Chart
              </h3>
              <div className="flex items-center gap-4">
                <TimeRangeTabs value={focusChartRange} onChange={(v) => { setFocusChartRange(v); setFocusChartOffset(0); }} />
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 rounded transition-colors"
                    style={{ color: 'var(--t3)' }}
                    onClick={() => setFocusChartOffset(o => o + 1)}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    className="text-[11px] px-1"
                    style={{ color: 'var(--t3)' }}
                    onClick={() => setFocusChartOffset(0)}
                  >
                    {focusChartOffset === 0 ? 'Now' : `−${focusChartOffset}`}
                  </button>
                  <button
                    className="p-1 rounded transition-colors"
                    style={{ color: focusChartOffset > 0 ? 'var(--t3)' : 'var(--brd2)' }}
                    onClick={() => setFocusChartOffset(o => Math.max(0, o - 1))}
                    disabled={focusChartOffset === 0}
                    onMouseEnter={(e) => { if (focusChartOffset > 0) e.currentTarget.style.color = 'var(--t)'; }}
                    onMouseLeave={(e) => (e.currentTarget.style.color = focusChartOffset > 0 ? 'var(--t3)' : 'var(--brd2)')}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-[12px] mb-4" style={{ color: 'var(--t3)' }}>
              <span>Top: {topFocusMinutes}m</span>
              <span>Average: {avgFocusMinutes}m</span>
            </div>

            <div className="h-[160px] flex items-end gap-1">
              {focusChartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="w-full relative h-full flex items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.minutes / maxFocusMinutes) * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.02 }}
                      className="w-full max-w-[24px] rounded-t-sm"
                      style={{
                        background: i === focusChartData.length - 1 && focusChartOffset === 0 ? 'var(--accent)' : 'var(--bg2)',
                        minHeight: d.minutes > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--t3)' }}>
              <span>{focusChartData[0]?.label}</span>
              <span>{focusChartData[focusChartData.length - 1]?.label}</span>
            </div>
          </div>

          {/* Task Chart */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>
                Task Chart
              </h3>
              <div className="flex items-center gap-4">
                <TimeRangeTabs value={taskChartRange} onChange={(v) => { setTaskChartRange(v); setTaskChartOffset(0); }} />
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 rounded transition-colors"
                    style={{ color: 'var(--t3)' }}
                    onClick={() => setTaskChartOffset(o => o + 1)}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    className="text-[11px] px-1"
                    style={{ color: 'var(--t3)' }}
                    onClick={() => setTaskChartOffset(0)}
                  >
                    {taskChartOffset === 0 ? 'Now' : `−${taskChartOffset}`}
                  </button>
                  <button
                    className="p-1 rounded transition-colors"
                    style={{ color: taskChartOffset > 0 ? 'var(--t3)' : 'var(--brd2)' }}
                    onClick={() => setTaskChartOffset(o => Math.max(0, o - 1))}
                    disabled={taskChartOffset === 0}
                    onMouseEnter={(e) => { if (taskChartOffset > 0) e.currentTarget.style.color = 'var(--t)'; }}
                    onMouseLeave={(e) => (e.currentTarget.style.color = taskChartOffset > 0 ? 'var(--t3)' : 'var(--brd2)')}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-[12px] mb-4" style={{ color: 'var(--t3)' }}>
              <span>Top: {topTaskCount} Tasks</span>
              <span>Average: {avgTaskCount} Tasks</span>
            </div>

            <div className="h-[160px] flex items-end gap-1">
              {taskChartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="w-full relative h-full flex items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.count / maxTaskCount) * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.02 }}
                      className="w-full max-w-[24px] rounded-t-sm"
                      style={{
                        background: i === taskChartData.length - 1 && taskChartOffset === 0 ? 'var(--accent)' : 'var(--bg2)',
                        minHeight: d.count > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--t3)' }}>
              <span>{taskChartData[0]?.label}</span>
              <span>{taskChartData[taskChartData.length - 1]?.label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
