import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, ArrowLeft, ArrowUpRight, ListTodo } from 'lucide-react';
import { Project, Task, taskTypeColor } from '../../types';
import { createSim, SimNode, SimEdge, seedCircular, Sim } from '../../utils/forceSim';

interface Props {
  projects: Project[];
  tasks: Task[];
  onOpenProject: (id: string) => void;
  onOpenTask: (id: string) => void;
}

interface Camera { x: number; y: number; scale: number; }

const TOP_LEVEL_RADIUS_MIN = 24;
const TOP_LEVEL_RADIUS_MAX = 64;
const TASK_RADIUS = 14;

function projectNodeRadius(taskCount: number) {
  return Math.min(
    TOP_LEVEL_RADIUS_MAX,
    TOP_LEVEL_RADIUS_MIN + Math.sqrt(Math.max(0, taskCount)) * 5
  );
}

function loadStoredPositions(key: string): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function saveStoredPositions(key: string, positions: Record<string, { x: number; y: number }>) {
  try { localStorage.setItem(key, JSON.stringify(positions)); } catch { /**/ }
}

export const GraphView: React.FC<Props> = ({ projects, tasks, onOpenProject, onOpenTask }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [zoomedProjectId, setZoomedProjectId] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [, setRenderTick] = useState(0);
  const simRef = useRef<Sim | null>(null);
  const dragStateRef = useRef<{ kind: 'pan' | 'node'; nodeId?: string; lastX: number; lastY: number; totalMove: number } | null>(null);
  const suppressNextClickRef = useRef(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Resize observer.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Build the active sim whenever the level changes.
  useEffect(() => {
    let nodes: SimNode[];
    let edges: SimEdge[];

    if (zoomedProjectId === null) {
      // Top level — projects.
      const stored = loadStoredPositions('graph:projects');
      nodes = projects.map((p) => {
        const taskCount = tasks.filter((t) => t.projectId === p.id).length;
        const r = projectNodeRadius(taskCount);
        const stash = stored[p.id];
        return {
          id: p.id,
          x: stash?.x ?? (Math.random() - 0.5) * 200,
          y: stash?.y ?? (Math.random() - 0.5) * 200,
          vx: 0, vy: 0, r,
        };
      });
      if (Object.keys(stored).length === 0) seedCircular(nodes, 220);
      edges = [];
    } else {
      // Task-level subgraph for one project.
      const projTasks = tasks.filter((t) => t.projectId === zoomedProjectId);
      const stored = loadStoredPositions(`graph:tasks:${zoomedProjectId}`);
      nodes = projTasks.map((t) => {
        const stash = stored[t.id];
        return {
          id: t.id,
          x: stash?.x ?? (Math.random() - 0.5) * 200,
          y: stash?.y ?? (Math.random() - 0.5) * 200,
          vx: 0, vy: 0, r: TASK_RADIUS,
          group: t.milestoneId,
        };
      });
      if (Object.keys(stored).length === 0) seedCircular(nodes, 180);
      const taskIds = new Set(projTasks.map((t) => t.id));
      edges = [];
      for (const t of projTasks) {
        for (const dep of t.dependsOn ?? []) {
          if (taskIds.has(dep)) edges.push({ source: dep, target: t.id });
        }
      }
    }

    simRef.current = createSim(nodes, edges, {
      cx: 0, cy: 0,
      springLength: zoomedProjectId === null ? 180 : 100,
      repulsion: zoomedProjectId === null ? 12000 : 4500,
      clusterStrength: 0.04,
    });

    let cancelled = false;
    let lastTime = performance.now();
    const loop = (now: number) => {
      if (cancelled) return;
      const sim = simRef.current;
      if (!sim) return;
      const stillSimmering = sim.step();
      // Persist once cooled (per-level).
      if (!stillSimmering) {
        const map: Record<string, { x: number; y: number }> = {};
        for (const n of sim.nodes) map[n.id] = { x: n.x, y: n.y };
        saveStoredPositions(zoomedProjectId === null ? 'graph:projects' : `graph:tasks:${zoomedProjectId}`, map);
      }
      setRenderTick((t) => (t + 1) & 0xffff);
      if (stillSimmering || performance.now() - lastTime < 800) {
        if (stillSimmering) lastTime = now;
        requestAnimationFrame(loop);
      }
    };
    requestAnimationFrame(loop);
    return () => { cancelled = true; };
  }, [zoomedProjectId, projects, tasks]);

  // Reset camera on level change.
  useEffect(() => {
    setCamera({ x: 0, y: 0, scale: zoomedProjectId === null ? 1 : 1.1 });
  }, [zoomedProjectId]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    const nextScale = Math.min(2.5, Math.max(0.4, camera.scale * factor));
    // Anchor zoom to cursor.
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    const wx = (mx - camera.x) / camera.scale;
    const wy = (my - camera.y) / camera.scale;
    setCamera({
      scale: nextScale,
      x: mx - wx * nextScale,
      y: my - wy * nextScale,
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const nodeEl = target.closest('[data-node-id]');
    const nodeId = nodeEl?.getAttribute('data-node-id') ?? undefined;
    if (nodeId) {
      dragStateRef.current = { kind: 'node', nodeId, lastX: e.clientX, lastY: e.clientY, totalMove: 0 };
      const sim = simRef.current;
      if (sim) {
        const n = sim.nodes.find((x) => x.id === nodeId);
        if (n) n.fixed = true;
      }
    } else {
      dragStateRef.current = { kind: 'pan', lastX: e.clientX, lastY: e.clientY, totalMove: 0 };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const dx = e.clientX - ds.lastX;
    const dy = e.clientY - ds.lastY;
    ds.lastX = e.clientX; ds.lastY = e.clientY;
    ds.totalMove += Math.abs(dx) + Math.abs(dy);
    if (ds.kind === 'pan') {
      setCamera((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
    } else if (ds.kind === 'node' && ds.nodeId) {
      const sim = simRef.current;
      if (!sim) return;
      const n = sim.nodes.find((x) => x.id === ds.nodeId);
      if (n) {
        n.x += dx / camera.scale;
        n.y += dy / camera.scale;
      }
      sim.reheat(0.4);
    }
  };

  const onMouseUp = () => {
    const ds = dragStateRef.current;
    if (ds?.kind === 'node' && ds.nodeId) {
      const sim = simRef.current;
      if (sim) {
        const n = sim.nodes.find((x) => x.id === ds.nodeId);
        if (n) n.fixed = false;
      }
    }
    if (ds && ds.totalMove > 6) suppressNextClickRef.current = true;
    dragStateRef.current = null;
  };

  // Empty-area click: zoom out if zoomed, otherwise no-op. Node clicks are
  // handled by per-node `onClick` below (more reliable than closest-walking
  // from a child `<circle>` target during re-renders).
  const onCanvasClick = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (zoomedProjectId !== null) setZoomedProjectId(null);
  };

  const handleNodeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (zoomedProjectId === null) {
      setZoomedProjectId(id);
    } else {
      onOpenTask(id);
    }
  };

  const onDoubleClickNode = (id: string) => {
    if (zoomedProjectId === null) onOpenProject(id);
  };

  const sim = simRef.current;

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const taskCountByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      m.set(t.projectId ?? '__inbox__', (m.get(t.projectId ?? '__inbox__') ?? 0) + 1);
    }
    return m;
  }, [tasks]);

  const showFlatNodes = camera.scale < 0.6;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(ellipse 90% 90% at 50% 50%, var(--bg2) 0%, var(--bg) 70%)',
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { dragStateRef.current = null; }}
      onClick={onCanvasClick}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
        }}
      />

      {/* Canvas */}
      <svg
        width={size.w}
        height={size.h}
        style={{ position: 'absolute', inset: 0, cursor: dragStateRef.current ? 'grabbing' : 'grab' }}
      >
        <defs>
          {projects.map((p) => (
            <radialGradient key={p.id} id={`glow-${p.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={p.color} stopOpacity="0.55" />
              <stop offset="60%" stopColor={p.color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0" />
            </radialGradient>
          ))}
          <marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(180,180,200,0.6)" />
          </marker>
        </defs>

        <g transform={`translate(${size.w / 2 + camera.x}, ${size.h / 2 + camera.y}) scale(${camera.scale})`}>
          {/* Edges (subgraph only) */}
          {zoomedProjectId !== null && sim?.edges.map((e, i) => {
            const a = sim.nodes.find((n) => n.id === e.source);
            const b = sim.nodes.find((n) => n.id === e.target);
            if (!a || !b) return null;
            return (
              <line
                key={`e-${i}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="rgba(180,180,200,0.35)"
                strokeWidth={1 / Math.max(0.5, camera.scale)}
                markerEnd="url(#dep-arrow)"
              />
            );
          })}

          {/* Anchor ring for the zoomed project */}
          {zoomedProjectId !== null && (() => {
            const proj = projectById.get(zoomedProjectId);
            if (!proj || !sim) return null;
            // Compute radius enclosing all task nodes + padding.
            let maxR = 80;
            for (const n of sim.nodes) {
              maxR = Math.max(maxR, Math.hypot(n.x, n.y) + n.r + 16);
            }
            return (
              <circle
                cx={0} cy={0} r={maxR}
                fill="none"
                stroke={proj.color}
                strokeOpacity={0.35}
                strokeWidth={1.5 / Math.max(0.5, camera.scale)}
                strokeDasharray="4 6"
              />
            );
          })()}

          {/* Nodes */}
          {sim?.nodes.map((n) => {
            const isProject = zoomedProjectId === null;
            const proj = isProject ? projectById.get(n.id) : null;
            const task = !isProject ? taskById.get(n.id) : null;
            const fill = isProject ? (proj?.color ?? '#999') : taskTypeColor(task?.type ?? 'task');
            const tCount = isProject ? (taskCountByProject.get(n.id) ?? 0) : 0;
            const isHover = hoverId === n.id;
            return (
              <g
                key={n.id}
                data-node-id={n.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId((h) => (h === n.id ? null : h))}
                onClick={(e) => handleNodeClick(n.id, e)}
                onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickNode(n.id); }}
              >
                {/* Outer glow */}
                {!showFlatNodes && (
                  <circle
                    cx={n.x} cy={n.y}
                    r={n.r + (isProject ? 18 : 8)}
                    fill={isProject && proj ? `url(#glow-${proj.id})` : fill}
                    opacity={isProject ? 0.9 : 0.35}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <circle
                  cx={n.x} cy={n.y}
                  r={n.r}
                  fill="var(--card)"
                  stroke={fill}
                  strokeWidth={isHover ? 2 : 1.4}
                  strokeOpacity={isProject ? 1 : 0.85}
                />
                {isProject ? (
                  <>
                    <text
                      x={n.x} y={n.y + 4}
                      fill="var(--t2)"
                      fontFamily="'Outfit', sans-serif"
                      fontWeight={500}
                      fontSize={Math.max(10, n.r * 0.4)}
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {tCount}
                    </text>
                    <text
                      x={n.x} y={n.y + n.r + 16}
                      fill="var(--t)"
                      fontFamily="'Outfit', sans-serif"
                      fontSize={11}
                      fontWeight={500}
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {proj?.name?.slice(0, 24) ?? ''}
                    </text>
                  </>
                ) : (
                  <>
                    {isHover && task && (
                      <text
                        x={n.x} y={n.y + n.r + 12}
                        fill="var(--t)"
                        fontFamily="'Outfit', sans-serif"
                        fontSize={10.5}
                        textAnchor="middle"
                        style={{ pointerEvents: 'none' }}
                      >
                        {task.title.slice(0, 28)}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Top-right zoom controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl p-0.5 z-10"
        style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setCamera((c) => ({ ...c, scale: Math.min(2.5, c.scale * 1.2) })); }}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        ><ZoomIn size={12} /></button>
        <button
          onClick={(e) => { e.stopPropagation(); setCamera((c) => ({ ...c, scale: Math.max(0.4, c.scale / 1.2) })); }}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        ><ZoomOut size={12} /></button>
        <button
          onClick={(e) => { e.stopPropagation(); setCamera({ x: 0, y: 0, scale: 1 }); }}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        >{camera.scale >= 1 ? <Minimize2 size={11} /> : <Maximize2 size={11} />}</button>
      </div>

      {/* Project header overlay when zoomed — feels like opening the project */}
      <AnimatePresence>
        {zoomedProjectId !== null && (() => {
          const proj = projectById.get(zoomedProjectId);
          if (!proj) return null;
          const projTasks = tasks.filter((t) => t.projectId === proj.id);
          const done = projTasks.filter((t) => t.completed).length;
          const total = projTasks.length;
          return (
            <motion.div
              key="project-header"
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-3 left-3 z-10 rounded-2xl overflow-hidden"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--brd2)',
                boxShadow: `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px ${proj.color}33`,
                maxWidth: 360,
              }}
            >
              {/* Top accent strip in project color */}
              <div
                className="h-[3px] w-full"
                style={{ background: `linear-gradient(90deg, ${proj.color}, ${proj.color}66)` }}
              />

              <div className="p-3">
                {/* Back link */}
                <button
                  onClick={(e) => { e.stopPropagation(); setZoomedProjectId(null); }}
                  className="flex items-center gap-1 text-[10.5px] mb-2"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                >
                  <ArrowLeft size={10} />
                  All projects
                </button>

                {/* Identity row */}
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${proj.color}33, ${proj.color}11)`,
                      border: `1px solid ${proj.color}55`,
                    }}
                  >
                    {proj.icon ? (
                      <span className="text-[18px] leading-none">{proj.icon}</span>
                    ) : (
                      <div className="w-3 h-3 rounded-md" style={{ background: proj.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-fraunces text-[15px] font-semibold leading-tight"
                      style={{ color: 'var(--t)' }}
                    >
                      {proj.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10.5px]" style={{ color: 'var(--t3)' }}>
                      <span className="flex items-center gap-1">
                        <ListTodo size={10} />
                        <span className="tabular-nums">{done}/{total}</span>
                      </span>
                      <span>·</span>
                      <span className="capitalize">{proj.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Open Project CTA */}
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenProject(proj.id); }}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${proj.color}, ${proj.color}cc)`,
                    color: '#fff',
                    boxShadow: `0 4px 12px ${proj.color}55`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Open project
                  <ArrowUpRight size={11} />
                </button>

                <div
                  className="text-[10px] mt-2 text-center"
                  style={{ color: 'var(--t3)' }}
                >
                  Tap a task node to view details
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
