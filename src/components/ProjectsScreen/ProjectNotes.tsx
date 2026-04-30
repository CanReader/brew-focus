import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { MarkdownNotes } from '../MarkdownNotes';
import { useTaskStore } from '../../store/taskStore';
import { preprocessWikiLinks, makeWikiLinkComponent } from '../../utils/wikiLinks';

interface Props {
  value: string;
  onChange: (next: string) => void;
  accentColor: string;
  onOpenTask?: (taskId: string) => void;
  onOpenProject?: (projectId: string) => void;
}

export const ProjectNotes: React.FC<Props> = ({ value, onChange, accentColor, onOpenTask, onOpenProject }) => {
  const { tasks, projects } = useTaskStore();
  const [open, setOpen] = useState(true);
  const trimmed = (value || '').trim();

  const wikiAnchor = useMemo(
    () => makeWikiLinkComponent({ tasks, projects, onOpenTask, onOpenProject, resolvedColor: accentColor }),
    [tasks, projects, onOpenTask, onOpenProject, accentColor]
  );
  const previewLines = trimmed
    ? trimmed.split('\n').filter(Boolean).slice(0, 3).join(' · ')
    : '';

  return (
    <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--brd)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 mb-3"
      >
        {open ? <ChevronDown size={11} style={{ color: 'var(--t3)' }} /> : <ChevronRight size={11} style={{ color: 'var(--t3)' }} />}
        <FileText size={11} style={{ color: 'var(--t3)' }} />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
          Notes
        </span>
        {!open && previewLines && (
          <span className="text-[11px] font-normal truncate ml-2" style={{ color: 'var(--t3)', maxWidth: 600 }}>
            {previewLines}
          </span>
        )}
      </button>

      {/* Open/close uses opacity + grid-rows trick instead of framer-motion's
          `animate={{ height: 'auto' }}` because the latter locked the
          container at the tallest measured height — when the user typed text
          and then deleted it, the wrapper kept the old height and left an
          empty padding band below the editor. With the grid-rows technique
          the wrapper always matches the child's intrinsic height. */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          transition: 'grid-template-rows 0.22s ease, opacity 0.18s ease',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div className="py-2">
            <MarkdownNotes
              value={value}
              onChange={onChange}
              placeholder="Click Edit to write — README, decisions, links, anything. Markdown supported. Use [[Task name]] or [[Project name]] to link."
              accentColor={accentColor}
              minEditHeight={240}
              preprocess={preprocessWikiLinks}
              componentOverrides={{ a: wikiAnchor as any }}
              /* Full width by default — no centering. */
            />
          </div>
        </div>
      </div>
    </div>
  );
};
