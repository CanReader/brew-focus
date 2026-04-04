import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Package, Clock, CheckSquare, TrendingUp,
  Flame, Zap, Trophy, Download, ChevronDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';
import { useTaskStore } from '../../store/taskStore';
import { useSettingsStore } from '../../store/settingsStore';

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const ACCENT   = 'var(--accent)';
const ACCENT_R = '255,77,77';
const BLU_R    = '91,141,238';
const GRN_R    = '34,211,165';
const AMB_R    = '245,166,35';
const PUR_R    = '167,139,250';
const ORG_R    = '249,115,22';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = ACCENT }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="w-[3px] h-[18px] rounded-full" style={{ background: color }} />
    <h3 className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>{children}</h3>
  </div>
);

const NoData: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: 'var(--t3)' }}>
    <Package size={22} strokeWidth={1.5} />
    <span className="text-[11px]">No data yet</span>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; accent?: string }> = ({ children, className = '', accent }) => (
  <div
    className={`rounded-2xl p-5 relative ${className}`}
    style={{
      background: accent
        ? `linear-gradient(135deg, rgba(${accent},0.07) 0%, var(--card) 60%)`
        : 'var(--card)',
      border: '1px solid var(--brd)',
    }}
  >
    {accent && (
      <div
        className="absolute top-0 right-0 w-52 h-52 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${accent},0.13) 0%, transparent 60%)`,
          transform: 'translate(55%, -55%)',
          zIndex: 0,
        }}
      />
    )}
    <div className="relative" style={{ zIndex: 1 }}>{children}</div>
  </div>
);

const TimeRangeTabs: React.FC<{ value: TimeRange; onChange: (v: TimeRange) => void }> = ({ value, onChange }) => (
  <div className="flex rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}>
    {(['daily', 'weekly', 'monthly', 'yearly'] as TimeRange[]).map((r) => (
      <button
        key={r}
        onClick={() => onChange(r)}
        className="px-2.5 py-1 text-[11px] font-medium rounded-lg capitalize transition-all"
        style={{
          background: value === r ? 'rgba(255,255,255,0.09)' : 'transparent',
          color: value === r ? 'var(--t)' : 'var(--t3)',
        }}
      >
        {r}
      </button>
    ))}
  </div>
);

// Pill-style bar chart
const BarChart: React.FC<{
  data: { label: string; value: number }[];
  maxVal: number;
  height?: number;
  color: string;
  colorRgb: string;
  activeIdx?: number;
}> = ({ data, maxVal, height = 150, color, colorRgb, activeIdx }) => (
  <div>
    <div className="relative" style={{ height }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <div key={pct} className="absolute left-0 right-0" style={{ bottom: `${pct * 100}%`, borderTop: '1px solid rgba(255,255,255,0.04)' }} />
      ))}
      <div className="absolute inset-0 flex items-end gap-1">
        {data.map((d, i) => {
          const isActive = i === activeIdx;
          const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.5, delay: i * 0.02, ease: 'easeOut' }}
                className="w-full relative"
                style={{
                  borderRadius: '4px 4px 2px 2px',
                  background: isActive
                    ? `linear-gradient(180deg, ${color} 0%, rgba(${colorRgb},0.45) 100%)`
                    : d.value > 0
                    ? `rgba(255,255,255,0.09)`
                    : `rgba(255,255,255,0.03)`,
                  boxShadow: isActive && d.value > 0 ? `0 -6px 20px rgba(${colorRgb},0.4)` : 'none',
                  minHeight: d.value > 0 ? '4px' : '0',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
    <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--t3)' }}>
      <span>{data[0]?.label}</span>
      <span>{data[data.length - 1]?.label}</span>
    </div>
  </div>
);

// SVG donut
const DonutChart: React.FC<{ segments: { value: number; color: string; label: string }[]; size?: number }> = ({ segments, size = 110 }) => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <NoData />;
  const cx = size / 2, cy = size / 2, r = size * 0.39, ir = size * 0.25;
  let angle = -Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        if (seg.value === 0) return null;
        const frac = seg.value / total;
        const sa = angle, ea = angle + frac * 2 * Math.PI;
        angle = ea;
        const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
        const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
        const ix1 = cx + ir * Math.cos(ea), iy1 = cy + ir * Math.sin(ea);
        const ix2 = cx + ir * Math.cos(sa), iy2 = cy + ir * Math.sin(sa);
        const lg = frac > 0.5 ? 1 : 0;
        const d = `M${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2} L${ix1} ${iy1} A${ir} ${ir} 0 ${lg} 0 ${ix2} ${iy2} Z`;
        return <path key={i} d={d} fill={seg.color} opacity={0.9} />;
      })}
    </svg>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────

export const ReportsScreen: React.FC = () => {
  const { sessions, todayFocusSeconds } = useTimerStore();
  const { tasks, projects } = useTaskStore();
  const { settings } = useSettingsStore();

  const [focusTimeRange, setFocusTimeRange]   = useState<TimeRange>('daily');
  const [projectTimeRange, setProjectTimeRange] = useState<TimeRange>('daily');
  const [focusChartRange, setFocusChartRange]   = useState<TimeRange>('daily');
  const [taskChartRange, setTaskChartRange]     = useState<TimeRange>('daily');
  const [focusChartOffset, setFocusChartOffset] = useState(0);
  const [taskChartOffset, setTaskChartOffset]   = useState(0);
  const [calendarDate, setCalendarDate]         = useState(new Date());
  const [expandedTask, setExpandedTask]         = useState<string | null>(null);

  const getDateRange = (range: TimeRange, base: Date = new Date()) => {
    const s = new Date(base), e = new Date(base);
    switch (range) {
      case 'daily':   s.setHours(0,0,0,0); e.setHours(23,59,59,999); break;
      case 'weekly': {
        const day = s.getDay(); s.setDate(s.getDate()-day); s.setHours(0,0,0,0);
        e.setTime(s.getTime()); e.setDate(e.getDate()+6); e.setHours(23,59,59,999); break;
      }
      case 'monthly': s.setDate(1); s.setHours(0,0,0,0); e.setMonth(e.getMonth()+1,0); e.setHours(23,59,59,999); break;
      case 'yearly':  s.setMonth(0,1); s.setHours(0,0,0,0); e.setMonth(11,31); e.setHours(23,59,59,999); break;
    }
    return { start: s, end: e };
  };

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);
    const weekStart  = new Date(now); weekStart.setDate(now.getDate()-now.getDay()); weekStart.setHours(0,0,0,0);
    const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate()-7);
    const prevWeekEnd   = new Date(weekStart); prevWeekEnd.setMilliseconds(-1);
    const yestStart = new Date(todayStart); yestStart.setDate(yestStart.getDate()-1);
    const yestEnd   = new Date(todayStart); yestEnd.setMilliseconds(-1);

    const work = sessions.filter(s => s.phase === 'work');
    const totalFocus   = work.reduce((a,s) => a+s.duration, 0);
    const weekFocus    = work.filter(s => s.startedAt >= weekStart.getTime()).reduce((a,s) => a+s.duration, 0);
    const prevWkFocus  = work.filter(s => s.startedAt >= prevWeekStart.getTime() && s.startedAt <= prevWeekEnd.getTime()).reduce((a,s) => a+s.duration, 0);
    const todayCalc    = work.filter(s => s.startedAt >= todayStart.getTime() && s.startedAt <= todayEnd.getTime()).reduce((a,s) => a+s.duration, 0);
    const yestFocus    = work.filter(s => s.startedAt >= yestStart.getTime() && s.startedAt <= yestEnd.getTime()).reduce((a,s) => a+s.duration, 0);
    const effectiveToday = Math.max(todayFocusSeconds, todayCalc);

    const done      = tasks.filter(t => t.completed);
    const weekDone  = done.filter(t => t.completedAt && t.completedAt >= weekStart.getTime()).length;
    const prevWkDone= done.filter(t => t.completedAt && t.completedAt >= prevWeekStart.getTime() && t.completedAt! <= prevWeekEnd.getTime()).length;
    const todayDone = done.filter(t => t.completedAt && t.completedAt >= todayStart.getTime() && t.completedAt! <= todayEnd.getTime()).length;
    const yestDone  = done.filter(t => t.completedAt && t.completedAt >= yestStart.getTime() && t.completedAt! <= yestEnd.getTime()).length;

    const trend = (curr: number, prev: number) => prev > 0 ? Math.round(((curr-prev)/prev)*100) : null;

    return {
      totalFocusTime: fmtTime(totalFocus),
      weekFocusTime:  fmtTime(weekFocus),
      todayFocusTime: fmtTime(effectiveToday),
      totalDone:      done.length,
      weekDone, todayDone,
      weekFocusTrend: trend(weekFocus, prevWkFocus),
      todayFocusTrend: trend(effectiveToday, yestFocus),
      weekTaskTrend:  trend(weekDone, prevWkDone),
      todayTaskTrend: trend(todayDone, yestDone),
    };
  }, [sessions, tasks, todayFocusSeconds]);

  // Records
  const records = useMemo(() => {
    const work = sessions.filter(s => s.phase === 'work');
    const dayMap: Record<string, number> = {};
    const dayCnt: Record<string, number> = {};
    work.forEach(s => {
      const k = dayKey(s.startedAt);
      dayMap[k] = (dayMap[k]??0) + s.duration;
      dayCnt[k] = (dayCnt[k]??0) + 1;
    });
    const bestDaySecs  = Math.max(0, ...Object.values(dayMap));
    const mostSessions = Math.max(0, ...Object.values(dayCnt));
    const focusDays    = new Set(work.map(s => dayKey(s.startedAt)));
    const today = new Date(); today.setHours(0,0,0,0);

    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate()-i);
      if (focusDays.has(dayKey(d.getTime()))) currentStreak++;
      else break;
    }
    const sorted = Array.from(focusDays).sort();
    let longestStreak = sorted.length > 0 ? 1 : 0, streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i-1]), curr = new Date(sorted[i]);
      if ((curr.getTime()-prev.getTime())/86400000 === 1) { streak++; longestStreak = Math.max(longestStreak, streak); }
      else streak = 1;
    }
    const avgSecs = work.length > 0 ? work.reduce((a,s) => a+s.duration, 0) / work.length : 0;
    return { bestDaySecs, mostSessions, currentStreak, longestStreak, avgSecs, total: work.length };
  }, [sessions]);

  // Hourly
  const hourlyData = useMemo(() => {
    const h = new Array(24).fill(0);
    sessions.filter(s => s.phase==='work').forEach(s => { h[new Date(s.startedAt).getHours()] += s.duration/60; });
    return h.map((mins, i) => ({ label: `${i}`, value: Math.round(mins) }));
  }, [sessions]);

  // Ratio
  const ratio = useMemo(() => {
    const work = sessions.filter(s => s.phase==='work').reduce((a,s) => a+s.duration, 0);
    const brk  = sessions.filter(s => s.phase!=='work').reduce((a,s) => a+s.duration, 0);
    const tot  = work+brk;
    return { workPct: tot>0?Math.round((work/tot)*100):0, brkPct: tot>0?Math.round((brk/tot)*100):0, workTime: fmtTime(work), brkTime: fmtTime(brk), hasData: tot>0 };
  }, [sessions]);

  // Project donut
  const projectDonut = useMemo(() => projects.map(p => ({
    value: Math.round(sessions.filter(s => { if(s.phase!=='work'||!s.taskId) return false; return tasks.find(t=>t.id===s.taskId)?.projectId===p.id; }).reduce((a,s)=>a+s.duration,0)/60),
    color: p.color, label: p.name,
  })).filter(s => s.value>0), [sessions, projects, tasks]);

  // Completion rate
  const completionRate = useMemo(() => projects.map(p => {
    const pt = tasks.filter(t => t.projectId===p.id);
    const done = pt.filter(t => t.completed).length;
    return { id: p.id, name: p.name, color: p.color, total: pt.length, done, rate: pt.length>0?Math.round((done/pt.length)*100):0 };
  }).filter(p => p.total>0).sort((a,b) => b.rate-a.rate), [tasks, projects]);

  // Task history
  const taskHistory = useMemo(() => {
    const map = new Map<string, { title: string; sessions: typeof sessions; totalMins: number }>();
    sessions.filter(s => s.phase==='work').forEach(s => {
      const k = s.taskId??'__none__';
      const ex = map.get(k);
      if (ex) { ex.sessions.push(s); ex.totalMins += s.duration/60; }
      else map.set(k, { title: s.taskTitle??'No task', sessions: [s], totalMins: s.duration/60 });
    });
    return Array.from(map.values()).map(v=>({...v,totalMins:Math.round(v.totalMins)})).sort((a,b)=>b.totalMins-a.totalMins).slice(0,20);
  }, [sessions]);

  // Mood
  const moodData = useMemo(() => {
    const ms = sessions.filter(s => s.phase==='work' && s.mood!=null);
    if (!ms.length) return null;
    const dm: Record<string, number[]> = {};
    ms.forEach(s => { const k=dayKey(s.startedAt); if(!dm[k]) dm[k]=[]; dm[k].push(s.mood!); });
    const days = Object.entries(dm).map(([k,moods]) => {
      const [y,m,d]=k.split('-').map(Number);
      return { date: new Date(y,m,d), avg: moods.reduce((a,v)=>a+v,0)/moods.length };
    }).sort((a,b)=>a.date.getTime()-b.date.getTime()).slice(-14);
    const overall = ms.reduce((a,s)=>a+s.mood!,0)/ms.length;
    return { days, overall: Math.round(overall*10)/10, emoji: ['','😴','😐','🙂','😊','🔥'][Math.round(overall)], count: ms.length };
  }, [sessions]);

  // Pomodoro heatmap
  const pomodoroRecords = useMemo(() => {
    const today = new Date();
    return Array.from({length:14},(_,i) => {
      const d = new Date(today); d.setDate(today.getDate()-i); d.setHours(0,0,0,0);
      const label = i===0?'Today':i===1?'Yesterday':d.toLocaleDateString('en-US',{day:'numeric',month:'short'});
      const hours = new Array(24).fill(0);
      sessions.filter(s => { const sd=new Date(s.startedAt); return s.phase==='work'&&sd.getDate()===d.getDate()&&sd.getMonth()===d.getMonth()&&sd.getFullYear()===d.getFullYear(); })
        .forEach(s => { hours[new Date(s.startedAt).getHours()] += s.duration/60; });
      return { label, hours };
    });
  }, [sessions]);

  // Focus time breakdown
  const focusTimeData = useMemo(() => {
    const { start, end } = getDateRange(focusTimeRange);
    const filtered = sessions.filter(s => s.phase==='work' && s.startedAt>=start.getTime() && s.startedAt<=end.getTime());
    const tm = new Map<string,{title:string;minutes:number}>();
    filtered.forEach(s => { const k=s.taskId??'__none__'; const ex=tm.get(k); if(ex) ex.minutes+=s.duration/60; else tm.set(k,{title:s.taskTitle??'No task',minutes:s.duration/60}); });
    return { totalMinutes: Math.round(filtered.reduce((a,s)=>a+s.duration,0)/60), taskBreakdown: Array.from(tm.values()).map(t=>({...t,minutes:Math.round(t.minutes)})).sort((a,b)=>b.minutes-a.minutes), hasData: filtered.length>0 };
  }, [sessions, focusTimeRange]);

  // Calendar
  const calendarData = useMemo(() => {
    const year=calendarDate.getFullYear(), month=calendarDate.getMonth();
    const first=new Date(year,month,1), last=new Date(year,month+1,0);
    const days=last.getDate(), adj=first.getDay()===0?6:first.getDay()-1;
    const weeks: (number|null)[][] = [];
    let cur: (number|null)[] = new Array(adj).fill(null);
    for (let d=1;d<=days;d++) { cur.push(d); if(cur.length===7){weeks.push(cur);cur=[];} }
    if(cur.length>0){while(cur.length<7)cur.push(null);weeks.push(cur);}
    const gs=settings.dailyFocusGoal*3600; let fd=0,gd=0; const dd:Record<number,number>={};
    for(let d=1;d<=days;d++){const ds=new Date(year,month,d,0,0,0,0),de=new Date(year,month,d,23,59,59,999);const s=sessions.filter(s=>s.phase==='work'&&s.startedAt>=ds.getTime()&&s.startedAt<=de.getTime()).reduce((a,s)=>a+s.duration,0);dd[d]=s;if(s>0)fd++;if(s>=gs)gd++;}
    return { weeks, monthLabel: calendarDate.toLocaleDateString('en-US',{month:'short',year:'numeric'}), focusDays:fd, goalDays:gd, completionRate:fd>0?Math.round((gd/fd)*100):0, dayData:dd, goalSeconds:gs };
  }, [calendarDate, sessions, settings.dailyFocusGoal]);

  // Charts
  const focusChartData = useMemo(() => {
    const range=focusChartRange, offset=focusChartOffset, now=new Date();
    const data:{label:string;value:number}[]=[];
    if(range==='daily'){const sh=offset*14;for(let i=13;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i-sh);d.setHours(0,0,0,0);const e=new Date(d);e.setHours(23,59,59,999);data.push({label:d.toLocaleDateString('en-US',{day:'numeric',month:'short'}),value:Math.round(sessions.filter(s=>s.phase==='work'&&s.startedAt>=d.getTime()&&s.startedAt<=e.getTime()).reduce((a,s)=>a+s.duration,0)/60)});}}
    else if(range==='weekly'){const sh=offset*8;for(let i=7;i>=0;i--){const ws=new Date(now);ws.setDate(now.getDate()-now.getDay()-(i+sh)*7);ws.setHours(0,0,0,0);const we=new Date(ws);we.setDate(ws.getDate()+6);we.setHours(23,59,59,999);data.push({label:ws.toLocaleDateString('en-US',{month:'short',day:'numeric'}),value:Math.round(sessions.filter(s=>s.phase==='work'&&s.startedAt>=ws.getTime()&&s.startedAt<=we.getTime()).reduce((a,s)=>a+s.duration,0)/60)});}}
    else if(range==='monthly'){const sh=offset*12;for(let i=11;i>=0;i--){const ms=new Date(now.getFullYear(),now.getMonth()-i-sh,1),me=new Date(now.getFullYear(),now.getMonth()-i-sh+1,0,23,59,59,999);data.push({label:ms.toLocaleDateString('en-US',{month:'short'}),value:Math.round(sessions.filter(s=>s.phase==='work'&&s.startedAt>=ms.getTime()&&s.startedAt<=me.getTime()).reduce((a,s)=>a+s.duration,0)/60)});}}
    else{const sh=offset*5;for(let i=4;i>=0;i--){const ys=new Date(now.getFullYear()-i-sh,0,1),ye=new Date(now.getFullYear()-i-sh,11,31,23,59,59,999);data.push({label:String(ys.getFullYear()),value:Math.round(sessions.filter(s=>s.phase==='work'&&s.startedAt>=ys.getTime()&&s.startedAt<=ye.getTime()).reduce((a,s)=>a+s.duration,0)/60)});}}
    return data;
  }, [sessions, focusChartRange, focusChartOffset]);

  const taskChartData = useMemo(() => {
    const range=taskChartRange, offset=taskChartOffset, now=new Date();
    const data:{label:string;value:number}[]=[];
    const ct=tasks.filter(t=>t.completed&&t.completedAt);
    if(range==='daily'){const sh=offset*14;for(let i=13;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i-sh);d.setHours(0,0,0,0);const e=new Date(d);e.setHours(23,59,59,999);data.push({label:d.toLocaleDateString('en-US',{day:'numeric',month:'short'}),value:ct.filter(t=>t.completedAt!>=d.getTime()&&t.completedAt!<=e.getTime()).length});}}
    else if(range==='weekly'){const sh=offset*8;for(let i=7;i>=0;i--){const ws=new Date(now);ws.setDate(now.getDate()-now.getDay()-(i+sh)*7);ws.setHours(0,0,0,0);const we=new Date(ws);we.setDate(ws.getDate()+6);we.setHours(23,59,59,999);data.push({label:ws.toLocaleDateString('en-US',{month:'short',day:'numeric'}),value:ct.filter(t=>t.completedAt!>=ws.getTime()&&t.completedAt!<=we.getTime()).length});}}
    else if(range==='monthly'){const sh=offset*12;for(let i=11;i>=0;i--){const ms=new Date(now.getFullYear(),now.getMonth()-i-sh,1),me=new Date(now.getFullYear(),now.getMonth()-i-sh+1,0,23,59,59,999);data.push({label:ms.toLocaleDateString('en-US',{month:'short'}),value:ct.filter(t=>t.completedAt!>=ms.getTime()&&t.completedAt!<=me.getTime()).length});}}
    else{const sh=offset*5;for(let i=4;i>=0;i--){const ys=new Date(now.getFullYear()-i-sh,0,1),ye=new Date(now.getFullYear()-i-sh,11,31,23,59,59,999);data.push({label:String(ys.getFullYear()),value:ct.filter(t=>t.completedAt!>=ys.getTime()&&t.completedAt!<=ye.getTime()).length});}}
    return data;
  }, [tasks, taskChartRange, taskChartOffset]);

  const maxFocusMins = Math.max(...focusChartData.map(d=>d.value), 60);
  const maxTaskCnt   = Math.max(...taskChartData.map(d=>d.value), 4);
  const maxHourMins  = Math.max(...hourlyData.map(d=>d.value), 1);
  const peakHour     = hourlyData.reduce((a,b) => a.value>=b.value ? a : b).label;

  const handleExport = () => {
    const rows = ['Date,Time,Duration (min),Phase,Task,Mood', ...sessions.map(s => { const d=new Date(s.startedAt); return `"${d.toLocaleDateString()}","${d.toLocaleTimeString()}",${Math.round(s.duration/60)},"${s.phase}","${(s.taskTitle??'').replace(/"/g,'""')}",${s.mood??''}`; })].join('\n');
    const url = URL.createObjectURL(new Blob([rows],{type:'text/csv'}));
    const a = Object.assign(document.createElement('a'),{href:url,download:`brew-focus-${new Date().toISOString().split('T')[0]}.csv`});
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 px-6 pt-5 pb-4 flex items-end justify-between"
        style={{ background: 'linear-gradient(180deg, var(--bg) 70%, transparent 100%)' }}>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--t)' }}>Reports</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>Your focus journey at a glance</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all mb-1"
          style={{ background: 'var(--card)', color: 'var(--t2)', border: '1px solid var(--brd)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--brd2)'; e.currentTarget.style.color='var(--t)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--brd)'; e.currentTarget.style.color='var(--t2)'; }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="px-6 pb-8 space-y-4">

        {/* ── Focus time cards ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Focus Time', value: stats.totalFocusTime, rgb: ACCENT_R, icon: <Clock size={15}/>, trend: null },
            { label: 'This Week',        value: stats.weekFocusTime,  rgb: BLU_R,    icon: <TrendingUp size={15}/>, trend: stats.weekFocusTrend },
            { label: 'Today',            value: stats.todayFocusTime, rgb: GRN_R,    icon: <Zap size={15}/>, trend: stats.todayFocusTrend },
          ].map((card, i) => (
            <motion.div key={i} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.35,delay:i*0.07}}
              className="rounded-2xl p-5 relative"
              style={{ background: `linear-gradient(145deg, rgba(${card.rgb},0.1) 0%, var(--card) 55%)`, border: '1px solid var(--brd)' }}>
              {/* Glow blob — extends outside card */}
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, rgba(${card.rgb},0.18) 0%, transparent 58%)`, zIndex: 0 }} />
              <div className="flex items-center justify-between mb-3" style={{ position:'relative', zIndex:1 }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `rgba(${card.rgb},0.15)`, color: `rgb(${card.rgb})` }}>
                  {card.icon}
                </div>
                {card.trend != null && (
                  <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold"
                    style={{ background: card.trend>=0?'rgba(34,211,165,0.12)':'rgba(255,107,107,0.12)', color: card.trend>=0?'var(--grn)':'#ff6b6b' }}>
                    {card.trend>=0 ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
                    {Math.abs(card.trend)}%
                  </div>
                )}
              </div>
              <div style={{ position:'relative', zIndex:1 }}>
                <div className="tabular-nums font-bold leading-none mb-1"
                  style={{ fontSize:'36px', letterSpacing:'-1.5px', background:`linear-gradient(135deg, var(--t) 30%, rgba(${card.rgb},0.8) 100%)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  {card.value}
                </div>
                <div className="text-[11px]" style={{ color:'var(--t3)' }}>{card.label}</div>
              </div>
              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px]"
                style={{ background:`linear-gradient(90deg, rgba(${card.rgb},0.7) 0%, transparent 70%)` }} />
            </motion.div>
          ))}
        </div>

        {/* ── Task cards ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Tasks Done',    value: String(stats.totalDone), rgb: GRN_R,   icon: <CheckSquare size={15}/>, trend: null },
            { label: 'Done This Week',      value: String(stats.weekDone),  rgb: AMB_R,   icon: <CheckSquare size={15}/>, trend: stats.weekTaskTrend },
            { label: 'Done Today',          value: String(stats.todayDone), rgb: ACCENT_R, icon: <CheckSquare size={15}/>, trend: stats.todayTaskTrend },
          ].map((card, i) => (
            <motion.div key={i} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.35,delay:0.21+i*0.07}}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: `linear-gradient(145deg, rgba(${card.rgb},0.08) 0%, var(--card) 55%)`, border: '1px solid var(--brd)' }}>
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, rgba(${card.rgb},0.14) 0%, transparent 65%)` }} />
              <div className="flex items-center justify-between mb-3" style={{ position:'relative', zIndex:1 }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `rgba(${card.rgb},0.15)`, color: `rgb(${card.rgb})` }}>
                  {card.icon}
                </div>
                {card.trend != null && (
                  <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold"
                    style={{ background: card.trend>=0?'rgba(34,211,165,0.12)':'rgba(255,107,107,0.12)', color: card.trend>=0?'var(--grn)':'#ff6b6b' }}>
                    {card.trend>=0 ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
                    {Math.abs(card.trend)}%
                  </div>
                )}
              </div>
              <div style={{ position:'relative', zIndex:1 }}>
                <div className="tabular-nums font-bold leading-none mb-1"
                  style={{ fontSize:'36px', letterSpacing:'-1.5px', background:`linear-gradient(135deg, var(--t) 30%, rgba(${card.rgb},0.8) 100%)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  {card.value}
                </div>
                <div className="text-[11px]" style={{ color:'var(--t3)' }}>{card.label}</div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[3px]"
                style={{ background:`linear-gradient(90deg, rgba(${card.rgb},0.7) 0%, transparent 70%)` }} />
            </motion.div>
          ))}
        </div>

        {/* ── Personal Records ── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: <Flame size={18}/>, label: 'Current Streak', value: `${records.currentStreak}`, unit: 'days',  rgb: ORG_R },
            { icon: <Trophy size={18}/>, label: 'Longest Streak', value: `${records.longestStreak}`, unit: 'days', rgb: AMB_R },
            { icon: <Zap size={18}/>,   label: 'Best Day Ever',   value: fmtTime(records.bestDaySecs), unit: '',    rgb: BLU_R },
            { icon: <Clock size={18}/>, label: 'Avg Session',     value: fmtTime(records.avgSecs),    unit: '',    rgb: GRN_R },
          ].map((item, i) => (
            <motion.div key={i} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{duration:0.3,delay:0.1+i*0.06}}
              className="rounded-2xl p-4 relative flex flex-col gap-3"
              style={{ background: `linear-gradient(145deg, rgba(${item.rgb},0.1) 0%, var(--card) 60%)`, border:'1px solid var(--brd)' }}>
              <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, rgba(${item.rgb},0.2) 0%, transparent 58%)`, zIndex:0 }} />
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ position:'relative', zIndex:1, background:`rgba(${item.rgb},0.18)`, color:`rgb(${item.rgb})`, boxShadow:`0 0 14px rgba(${item.rgb},0.25)` }}>
                {item.icon}
              </div>
              <div style={{ position:'relative', zIndex:1 }}>
                <div className="font-bold tabular-nums leading-none"
                  style={{ fontSize:'26px', letterSpacing:'-1px', color:'var(--t)' }}>
                  {item.value}
                </div>
                <div className="text-[10px] mt-1" style={{ color:'var(--t3)' }}>{item.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Focus Hours + Ratio ── */}
        <div className="grid grid-cols-2 gap-4">
          <Card accent={ACCENT_R}>
            <SectionTitle color={`rgb(${ACCENT_R})`}>Best Focus Hours</SectionTitle>
            {records.total === 0 ? <NoData /> : (
              <>
                <div className="relative h-[90px]">
                  {[0.25,0.5,0.75,1].map(p => (
                    <div key={p} className="absolute left-0 right-0 pointer-events-none"
                      style={{ bottom:`${p*100}%`, borderTop:'1px solid rgba(255,255,255,0.05)' }} />
                  ))}
                  <div className="absolute inset-0 flex items-end gap-px">
                    {hourlyData.map((d, h) => {
                      const isPeak = String(h) === peakHour;
                      const pct = maxHourMins > 0 ? (d.value/maxHourMins)*100 : 0;
                      return (
                        <div key={h} className="flex-1 h-full flex items-end justify-center">
                          <motion.div
                            initial={{ height:0 }}
                            animate={{ height:`${pct}%` }}
                            transition={{ duration:0.5, delay:h*0.015 }}
                            className="w-full"
                            style={{
                              borderRadius:'3px 3px 1px 1px',
                              background: isPeak
                                ? `linear-gradient(180deg, rgb(${ACCENT_R}) 0%, rgba(${ACCENT_R},0.4) 100%)`
                                : d.value>0 ? `rgba(${ACCENT_R},0.28)` : 'rgba(255,255,255,0.04)',
                              boxShadow: isPeak && d.value>0 ? `0 -4px 16px rgba(${ACCENT_R},0.45)` : 'none',
                              minHeight: d.value>0 ? '3px' : '0',
                            }}
                            title={`${h}:00 — ${d.value}m`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between mt-1.5 text-[9px]" style={{ color:'var(--t3)' }}>
                  {[0,4,8,12,16,20,23].map(h => <span key={h}>{h}:00</span>)}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background:`rgb(${ACCENT_R})` }} />
                  <span className="text-[11px]" style={{ color:'var(--t3)' }}>
                    Peak: <span style={{ color:'var(--t2)', fontWeight:600 }}>{peakHour}:00</span>
                    <span className="ml-2">({hourlyData[parseInt(peakHour)]?.value}m total)</span>
                  </span>
                </div>
              </>
            )}
          </Card>

          <Card accent={GRN_R}>
            <SectionTitle color={`rgb(${GRN_R})`}>Focus vs Break Ratio</SectionTitle>
            {!ratio.hasData ? <NoData /> : (
              <div className="space-y-4">
                {[
                  { label:'Focus', time: ratio.workTime, pct: ratio.workPct, rgb: ACCENT_R },
                  { label:'Breaks', time: ratio.brkTime, pct: ratio.brkPct, rgb: GRN_R },
                ].map(bar => (
                  <div key={bar.label}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[12px] font-medium" style={{ color:`rgb(${bar.rgb})` }}>{bar.label}</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[18px] font-bold tabular-nums" style={{ color:'var(--t)', letterSpacing:'-0.5px' }}>{bar.pct}%</span>
                        <span className="text-[11px]" style={{ color:'var(--t3)' }}>{bar.time}</span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                      <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${bar.pct}%`}} transition={{duration:0.7,ease:'easeOut'}}
                        style={{ background:`linear-gradient(90deg, rgb(${bar.rgb}), rgba(${bar.rgb},0.6))`, boxShadow:`0 0 8px rgba(${bar.rgb},0.4)` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 text-[11px]" style={{ color:'var(--t3)', borderTop:'1px solid var(--brd)' }}>
                  Your ratio is{' '}
                  <span style={{ color: ratio.workPct>=70?`rgb(${GRN_R})`:`rgb(${AMB_R})`, fontWeight:600 }}>
                    {ratio.workPct>0&&ratio.brkPct>0 ? `${Math.round(ratio.workPct/ratio.brkPct*10)/10}:1` : '—'}
                  </span>
                  {' '}(ideal: 4:1)
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Heatmap + Project Breakdown ── */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <SectionTitle>Pomodoro Heatmap</SectionTitle>
            <div className="space-y-1">
              <div className="flex items-center gap-1 mb-1.5">
                <div className="w-[72px]" />
                {[0,2,4,6,8,10,12,14,16,18,20,22].map(h => (
                  <div key={h} className="flex-1 text-[8px] text-center" style={{ color:'var(--t3)' }}>{h}</div>
                ))}
              </div>
              {pomodoroRecords.map((day, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="text-[9px] shrink-0" style={{ width:72, color:'var(--t3)' }}>{day.label}</div>
                  <div className="flex-1 flex gap-0.5">
                    {day.hours.map((mins, h) => (
                      <div key={h} className="h-3 flex-1 rounded-[2px]"
                        style={{ background: mins>0 ? `rgba(${ACCENT_R},${Math.min(0.9,0.15+(mins/30)*0.75)})` : 'rgba(255,255,255,0.04)' }}
                        title={`${day.label} ${h}:00 — ${Math.round(mins)}m`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card accent={PUR_R}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-[18px] rounded-full" style={{ background:`rgb(${PUR_R})` }} />
                <h3 className="text-[14px] font-semibold" style={{ color:'var(--t)' }}>Project Breakdown</h3>
              </div>
              <TimeRangeTabs value={projectTimeRange} onChange={setProjectTimeRange} />
            </div>
            {projects.length===0 ? <NoData /> : (
              <div className="flex gap-3 items-center">
                <div className="shrink-0">
                  <DonutChart segments={projectDonut} size={80} />
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  {projects.map(p => {
                    const {start,end} = getDateRange(projectTimeRange);
                    const mins = Math.round(sessions.filter(s=>{ if(s.phase!=='work'||!s.taskId)return false; return tasks.find(t=>t.id===s.taskId)?.projectId===p.id&&s.startedAt>=start.getTime()&&s.startedAt<=end.getTime(); }).reduce((a,s)=>a+s.duration,0)/60);
                    const maxM = Math.max(...projects.map(pp=>Math.round(sessions.filter(s=>{if(s.phase!=='work'||!s.taskId)return false;return tasks.find(t=>t.id===s.taskId)?.projectId===pp.id&&s.startedAt>=start.getTime()&&s.startedAt<=end.getTime();}).reduce((a,s)=>a+s.duration,0)/60)),1);
                    return (
                      <div key={p.id}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background:p.color, boxShadow:`0 0 5px ${p.color}60` }} />
                          <span className="flex-1 text-[11px] truncate" style={{ color:'var(--t2)' }}>{p.name}</span>
                          <span className="text-[10px] tabular-nums shrink-0" style={{ color:'var(--t3)' }}>{mins}m</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                          <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${(mins/maxM)*100}%`}} transition={{duration:0.6}}
                            style={{ background:`linear-gradient(90deg, ${p.color}, ${p.color}99)`, boxShadow:mins>0?`0 0 6px ${p.color}50`:'none' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Focus Time Breakdown + Calendar ── */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle color={`rgb(${ACCENT_R})`}>Focus Time</SectionTitle>
              <TimeRangeTabs value={focusTimeRange} onChange={setFocusTimeRange} />
            </div>
            <div className="text-[28px] font-bold tabular-nums mb-4" style={{ letterSpacing:'-1px', background:`linear-gradient(135deg, var(--t) 0%, rgba(${ACCENT_R},0.8) 100%)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              {focusTimeData.totalMinutes>=60?`${Math.floor(focusTimeData.totalMinutes/60)}h ${focusTimeData.totalMinutes%60}m`:`${focusTimeData.totalMinutes}m`}
            </div>
            {!focusTimeData.hasData ? <NoData /> : (
              <div className="space-y-2.5">
                {focusTimeData.taskBreakdown.map((t, i) => {
                  const maxM = focusTimeData.taskBreakdown[0]?.minutes ?? 1;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[11px] w-24 truncate shrink-0" style={{ color:'var(--t2)' }}>{t.title}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${(t.minutes/maxM)*100}%`}} transition={{duration:0.5,delay:i*0.05}}
                          style={{ background:`linear-gradient(90deg, rgb(${ACCENT_R}), rgba(${ACCENT_R},0.5))`, boxShadow:`0 0 6px rgba(${ACCENT_R},0.35)`, minWidth:t.minutes>0?'4px':'0' }} />
                      </div>
                      <span className="text-[10px] tabular-nums shrink-0 w-8 text-right" style={{ color:'var(--t3)' }}>{t.minutes}m</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card accent={GRN_R}>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle color={`rgb(${GRN_R})`}>Focus Goal Calendar</SectionTitle>
              <div className="px-2.5 py-1 text-[11px] rounded-xl font-semibold" style={{ background:`rgba(${ACCENT_R},0.15)`, color:`rgb(${ACCENT_R})`, border:`1px solid rgba(${ACCENT_R},0.25)` }}>
                {settings.dailyFocusGoal}h goal
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              {[
                { label:'Focus Days', value:calendarData.focusDays,     rgb:BLU_R },
                { label:'Goal Days',  value:calendarData.goalDays,      rgb:GRN_R },
                { label:'Goal Rate',  value:`${calendarData.completionRate}%`, rgb:AMB_R },
              ].map(s => (
                <div key={s.label} className="flex-1 rounded-xl px-2 py-2 text-center" style={{ background:`rgba(${s.rgb},0.1)`, border:`1px solid rgba(${s.rgb},0.15)` }}>
                  <div className="text-[16px] font-bold leading-none" style={{ color:`rgb(${s.rgb})` }}>{s.value}</div>
                  <div className="text-[9px] mt-0.5" style={{ color:'var(--t3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <button className="p-1 rounded-lg" style={{ color:'var(--t3)' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';}} onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1))}><ChevronLeft size={14}/></button>
              <span className="text-[12px] font-medium" style={{ color:'var(--t)' }}>{calendarData.monthLabel}</span>
              <button className="p-1 rounded-lg" style={{ color:'var(--t3)' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';}} onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1))}><ChevronRight size={14}/></button>
            </div>
            <div className="space-y-0.5">
              <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] mb-1" style={{ color:'var(--t3)' }}>
                {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=><div key={d}>{d}</div>)}
              </div>
              {calendarData.weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-0.5">
                  {week.map((day, di) => {
                    const isToday = day!==null&&new Date().getDate()===day&&new Date().getMonth()===calendarDate.getMonth()&&new Date().getFullYear()===calendarDate.getFullYear();
                    const secs = day?(calendarData.dayData[day]??0):0;
                    const goalPct = secs>0?Math.min(1,secs/calendarData.goalSeconds):0;
                    const hasFocus = secs>0;
                    return (
                      <div key={di} className="h-7 flex items-center justify-center text-[10px] rounded-md transition-all"
                        style={{
                          background: isToday?`rgb(${ACCENT_R})`:hasFocus?`rgba(${GRN_R},${0.1+goalPct*0.45})`:'transparent',
                          color: day===null?'transparent':isToday?'white':hasFocus?'var(--t)':'var(--t3)',
                          border: isToday?'none':hasFocus?`1px solid rgba(${GRN_R},${0.15+goalPct*0.25})`:'1px solid transparent',
                          boxShadow: isToday?`0 0 10px rgba(${ACCENT_R},0.5)`:hasFocus&&goalPct===1?`0 0 6px rgba(${GRN_R},0.35)`:'none',
                        }}>
                        {day}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Task Completion + Per-task History ── */}
        <div className="grid grid-cols-2 gap-4">
          <Card accent={GRN_R}>
            <SectionTitle color={`rgb(${GRN_R})`}>Task Completion Rate</SectionTitle>
            {completionRate.length===0 ? (
              <div>
                <NoData />
                <div className="mt-2 pt-3" style={{ borderTop:'1px solid var(--brd)' }}>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span style={{ color:'var(--t2)' }}>Overall</span>
                    <span style={{ color:'var(--t3)' }}>{tasks.filter(t=>t.completed).length}/{tasks.length}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                    <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${tasks.length>0?(tasks.filter(t=>t.completed).length/tasks.length)*100:0}%`}} transition={{duration:0.6}} style={{ background:`rgb(${GRN_R})` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {completionRate.map(p => (
                  <div key={p.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background:p.color, boxShadow:`0 0 4px ${p.color}60` }} />
                      <span className="flex-1 text-[11px] truncate" style={{ color:'var(--t2)' }}>{p.name}</span>
                      <span className="text-[10px] tabular-nums" style={{ color:'var(--t3)' }}>{p.done}/{p.total}</span>
                      <span className="text-[11px] font-bold w-9 text-right" style={{ color:p.rate>=75?`rgb(${GRN_R})`:p.rate>=40?`rgb(${AMB_R})`:`rgb(${ACCENT_R})` }}>{p.rate}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                      <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${p.rate}%`}} transition={{duration:0.6}}
                        style={{ background:`linear-gradient(90deg, ${p.color}, ${p.color}80)`, boxShadow:`0 0 6px ${p.color}40` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2.5" style={{ borderTop:'1px solid var(--brd)' }}>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span style={{ color:'var(--t2)' }}>Overall</span>
                    <span style={{ color:'var(--t3)' }}>{tasks.filter(t=>t.completed).length}/{tasks.length} ({tasks.length>0?Math.round((tasks.filter(t=>t.completed).length/tasks.length)*100):0}%)</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                    <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${tasks.length>0?(tasks.filter(t=>t.completed).length/tasks.length)*100:0}%`}} transition={{duration:0.6}} style={{ background:`rgb(${GRN_R})`, boxShadow:`0 0 6px rgba(${GRN_R},0.4)` }} />
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>Per-Task History</SectionTitle>
            {taskHistory.length===0 ? <NoData /> : (
              <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-1">
                {taskHistory.map((item, i) => (
                  <div key={i}>
                    <button
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all text-left"
                      style={{ background: expandedTask===item.title?'rgba(255,255,255,0.07)':'transparent' }}
                      onMouseEnter={e=>{ if(expandedTask!==item.title) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e=>{ if(expandedTask!==item.title) e.currentTarget.style.background='transparent'; }}
                      onClick={()=>setExpandedTask(expandedTask===item.title?null:item.title)}
                    >
                      <ChevronDown size={11} style={{ color:'var(--t3)', transition:'transform 0.2s', transform:expandedTask===item.title?'rotate(180deg)':'rotate(0deg)', flexShrink:0 }} />
                      <span className="flex-1 text-[12px] truncate" style={{ color:'var(--t2)' }}>{item.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-md" style={{ background:'rgba(255,255,255,0.06)', color:'var(--t3)' }}>{item.totalMins}m</span>
                        <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-md" style={{ background:'rgba(255,255,255,0.06)', color:'var(--t3)' }}>{item.sessions.length}×</span>
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedTask===item.title && (
                        <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.15}} className="overflow-hidden">
                          <div className="ml-7 mb-1.5 space-y-0.5">
                            {item.sessions.slice(0,8).map((s,j) => {
                              const d = new Date(s.startedAt);
                              return (
                                <div key={j} className="flex items-center gap-2 text-[10px] py-0.5 px-1">
                                  <div className="w-1 h-1 rounded-full shrink-0" style={{ background:`rgb(${ACCENT_R})` }} />
                                  <span style={{ color:'var(--t3)' }}>{d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} {d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span>
                                  <span style={{ color:'var(--t3)' }}>·</span>
                                  <span style={{ color:'var(--t2)', fontWeight:500 }}>{Math.round(s.duration/60)}m</span>
                                  {s.mood && <span className="ml-auto">{['','😴','😐','🙂','😊','🔥'][s.mood]}</span>}
                                </div>
                              );
                            })}
                            {item.sessions.length>8 && <div className="text-[10px] pl-3 py-0.5" style={{ color:'var(--t3)' }}>+{item.sessions.length-8} more sessions</div>}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Mood Log ── */}
        {moodData && (
          <Card accent={PUR_R}>
            <div className="flex items-start justify-between mb-4">
              <SectionTitle color={`rgb(${PUR_R})`}>Energy Log</SectionTitle>
              <div className="flex items-center gap-3">
                <div className="text-[32px]">{moodData.emoji}</div>
                <div>
                  <div className="text-[22px] font-bold tabular-nums leading-none" style={{ color:'var(--t)' }}>{moodData.overall}<span className="text-[14px] ml-0.5" style={{ color:'var(--t3)' }}>/5</span></div>
                  <div className="text-[10px]" style={{ color:'var(--t3)' }}>{moodData.count} ratings</div>
                </div>
              </div>
            </div>
            <div className="flex items-end gap-1 h-[60px]">
              {moodData.days.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full"
                  title={`${day.date.toLocaleDateString('en-US',{month:'short',day:'numeric'})} — ${day.avg.toFixed(1)}/5`}>
                  <motion.div initial={{height:0}} animate={{height:`${(day.avg/5)*100}%`}} transition={{duration:0.5,delay:i*0.03}}
                    className="w-full rounded-t-sm"
                    style={{ background:`rgba(${PUR_R},${0.3+(day.avg/5)*0.6})`, boxShadow:day.avg>=4?`0 -3px 8px rgba(${PUR_R},0.4)`:'none', minHeight:'3px' }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-[9px]" style={{ color:'var(--t3)' }}>
              <span>{moodData.days[0]?.date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
              <span>{moodData.days[moodData.days.length-1]?.date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
            </div>
          </Card>
        )}

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-2 gap-4">
          <Card accent={ACCENT_R}>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle color={`rgb(${ACCENT_R})`}>Focus Time Chart</SectionTitle>
              <div className="flex items-center gap-2">
                <TimeRangeTabs value={focusChartRange} onChange={v=>{setFocusChartRange(v);setFocusChartOffset(0);}} />
                <div className="flex items-center gap-0.5">
                  <button className="p-1 rounded-lg" style={{ color:'var(--t3)' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='var(--t)';}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--t3)';}} onClick={()=>setFocusChartOffset(o=>o+1)}><ChevronLeft size={13}/></button>
                  <button className="text-[10px] px-1 min-w-[24px] text-center" style={{ color:'var(--t3)' }} onClick={()=>setFocusChartOffset(0)}>{focusChartOffset===0?'Now':`−${focusChartOffset}`}</button>
                  <button className="p-1 rounded-lg" style={{ color:focusChartOffset>0?'var(--t3)':'var(--brd2)' }} disabled={focusChartOffset===0} onMouseEnter={e=>{if(focusChartOffset>0){e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='var(--t)';}}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=focusChartOffset>0?'var(--t3)':'var(--brd2)';}} onClick={()=>setFocusChartOffset(o=>Math.max(0,o-1))}><ChevronRight size={13}/></button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-[11px] mb-3" style={{ color:'var(--t3)' }}>
              <span>Top: <span style={{ color:'var(--t2)', fontWeight:600 }}>{Math.max(...focusChartData.map(d=>d.value))}m</span></span>
              <span>Avg: <span style={{ color:'var(--t2)', fontWeight:600 }}>{focusChartData.length>0?Math.round(focusChartData.reduce((a,d)=>a+d.value,0)/focusChartData.length):0}m</span></span>
            </div>
            <BarChart data={focusChartData} maxVal={maxFocusMins} height={150} color={`rgb(${ACCENT_R})`} colorRgb={ACCENT_R} activeIdx={focusChartOffset===0?focusChartData.length-1:undefined} />
          </Card>

          <Card accent={GRN_R}>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle color={`rgb(${GRN_R})`}>Task Completions</SectionTitle>
              <div className="flex items-center gap-2">
                <TimeRangeTabs value={taskChartRange} onChange={v=>{setTaskChartRange(v);setTaskChartOffset(0);}} />
                <div className="flex items-center gap-0.5">
                  <button className="p-1 rounded-lg" style={{ color:'var(--t3)' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='var(--t)';}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--t3)';}} onClick={()=>setTaskChartOffset(o=>o+1)}><ChevronLeft size={13}/></button>
                  <button className="text-[10px] px-1 min-w-[24px] text-center" style={{ color:'var(--t3)' }} onClick={()=>setTaskChartOffset(0)}>{taskChartOffset===0?'Now':`−${taskChartOffset}`}</button>
                  <button className="p-1 rounded-lg" style={{ color:taskChartOffset>0?'var(--t3)':'var(--brd2)' }} disabled={taskChartOffset===0} onMouseEnter={e=>{if(taskChartOffset>0){e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='var(--t)';}}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=taskChartOffset>0?'var(--t3)':'var(--brd2)';}} onClick={()=>setTaskChartOffset(o=>Math.max(0,o-1))}><ChevronRight size={13}/></button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-[11px] mb-3" style={{ color:'var(--t3)' }}>
              <span>Top: <span style={{ color:'var(--t2)', fontWeight:600 }}>{Math.max(...taskChartData.map(d=>d.value))} tasks</span></span>
              <span>Avg: <span style={{ color:'var(--t2)', fontWeight:600 }}>{taskChartData.length>0?(taskChartData.reduce((a,d)=>a+d.value,0)/taskChartData.length).toFixed(1):0} tasks</span></span>
            </div>
            <BarChart data={taskChartData} maxVal={maxTaskCnt} height={150} color={`rgb(${GRN_R})`} colorRgb={GRN_R} activeIdx={taskChartOffset===0?taskChartData.length-1:undefined} />
          </Card>
        </div>

      </div>
    </div>
  );
};
