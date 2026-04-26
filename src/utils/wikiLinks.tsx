import React from 'react';
import { Project, Task } from '../types';

/**
 * `[[Name]]` and `[[Name|alias]]` are turned into a regular markdown link with
 * a custom scheme so react-markdown's link plumbing carries them through. The
 * downstream `a` component intercepts the scheme and renders a Brew Focus
 * wiki-link instead of an external link.
 */
const WIKI_RE = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g;

export function preprocessWikiLinks(raw: string): string {
  return raw.replace(WIKI_RE, (_match, target: string, alias?: string) => {
    const label = (alias ?? target).trim();
    const safeTarget = encodeURIComponent(target.trim());
    return `[${label}](brewfocus://wiki/${safeTarget})`;
  });
}

/** Tries to resolve a wiki-link target to a known task or project. */
function resolveTarget(
  rawTarget: string,
  tasks: Task[],
  projects: Project[],
): { kind: 'task'; task: Task } | { kind: 'project'; project: Project } | null {
  const q = rawTarget.toLowerCase();

  // 1. Project exact name match
  const exactProj = projects.find((p) => p.name.toLowerCase() === q);
  if (exactProj) return { kind: 'project', project: exactProj };

  // 2. Task exact title match
  const exactTask = tasks.find((t) => t.title.toLowerCase() === q);
  if (exactTask) return { kind: 'task', task: exactTask };

  // 3. Project startsWith
  const sProj = projects.find((p) => p.name.toLowerCase().startsWith(q));
  if (sProj) return { kind: 'project', project: sProj };

  // 4. Task startsWith
  const sTask = tasks.find((t) => t.title.toLowerCase().startsWith(q));
  if (sTask) return { kind: 'task', task: sTask };

  // 5. Loose contains
  const cTask = tasks.find((t) => t.title.toLowerCase().includes(q));
  if (cTask) return { kind: 'task', task: cTask };

  return null;
}

export interface WikiLinkHandlers {
  tasks: Task[];
  projects: Project[];
  onOpenTask?: (taskId: string) => void;
  onOpenProject?: (projectId: string) => void;
  /** Color for resolved links. Defaults to --blu. */
  resolvedColor?: string;
}

/**
 * Builds an `a`-component override for ReactMarkdown that intercepts
 * `brewfocus://wiki/...` hrefs and renders a wiki-link pill. Unknown targets
 * render as a soft, dashed-underline indicator instead of a real link.
 */
export function makeWikiLinkComponent(handlers: WikiLinkHandlers) {
  const Anchor: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href, children, ...rest }) => {
    if (!href || !href.startsWith('brewfocus://wiki/')) {
      // Real external link — defer to default styling.
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          className="underline decoration-dotted underline-offset-2"
          style={{ color: handlers.resolvedColor ?? 'var(--blu)' }}
          {...rest}
        >
          {children}
        </a>
      );
    }

    const target = decodeURIComponent(href.replace('brewfocus://wiki/', ''));
    const resolved = resolveTarget(target, handlers.tasks, handlers.projects);
    const color = handlers.resolvedColor ?? 'var(--blu)';

    if (!resolved) {
      return (
        <span
          className="cursor-help"
          style={{
            color: 'var(--amb)',
            background: 'rgba(245,166,35,0.08)',
            border: '1px dashed rgba(245,166,35,0.35)',
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: '0.95em',
          }}
          title={`No task or project named "${target}"`}
        >
          {children}
        </span>
      );
    }

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (resolved.kind === 'task') handlers.onOpenTask?.(resolved.task.id);
      else handlers.onOpenProject?.(resolved.project.id);
    };

    const pillColor = resolved.kind === 'project' ? resolved.project.color : color;

    return (
      <a
        href={href}
        onClick={handleClick}
        className="cursor-pointer transition-colors"
        style={{
          color: pillColor,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${pillColor}55`,
          padding: '1px 5px',
          borderRadius: 4,
          fontSize: '0.95em',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${pillColor}18`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        title={resolved.kind === 'task' ? `Task: ${resolved.task.title}` : `Project: ${resolved.project.name}`}
        {...rest}
      >
        {children}
      </a>
    );
  };

  return Anchor;
}
