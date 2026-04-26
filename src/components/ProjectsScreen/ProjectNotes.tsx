import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
