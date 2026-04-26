import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Tag as TagIcon, Folder, Flag, AlertCircle, X } from 'lucide-react';
import { ParsedTask, ParsedChip } from '../utils/quickCapture';

interface Props {
  parsed: ParsedTask;
  rawText: string;
  onRemoveToken: (rawToken: string) => void;
  onApplySuggestion: (badToken: string, suggestion: string) => void;
  onCreateProject?: (name: string) => void;
  showLegend?: boolean;
}

const chipBarColor = (chip: ParsedChip): string => {
  switch (chip.kind) {
    case 'date': return 'var(--accent)';
    case 'type': {
      const map: Record<string, string> = {
        feature: 'var(--blu)', bug: 'var(--accent)', chore: 'var(--amb)',
        idea: 'var(--grn)', task: 'var(--t3)',
      };
      return map[chip.value] ?? 'var(--t3)';
    }
    case 'project': return chip.color;
    case 'project-new': return 'var(--t3)';
    case 'priority': {
      const m: Record<string, string> = { p1: 'var(--accent)', p2: 'var(--amb)', p3: 'var(--blu)', p4: 'var(--t3)' };
      return m[chip.value];
    }
    case 'pomodoros': return 'var(--blu)';
  }
};

const chipIcon = (chip: ParsedChip) => {
  switch (chip.kind) {
    case 'date': return <Calendar size={9} />;
    case 'type': return <TagIcon size={9} />;
    case 'project': case 'project-new': return <Folder size={9} />;
    case 'priority': return <Flag size={9} />;
    case 'pomodoros': return null; // text suffix instead
  }
};

export const QuickCapturePreview: React.FC<Props> = ({
  parsed, rawText, onRemoveToken, onApplySuggestion, onCreateProject, showLegend,
}) => {
  const { t } = useTranslation('tasks');
  const chipLabel = (chip: ParsedChip): string => {
    switch (chip.kind) {
      case 'date': return chip.label;
      case 'type': return chip.value;
      case 'project': return chip.name;
      case 'project-new': return t('quickCapture.newSuffix', { name: chip.name });
      case 'priority': return chip.value.toUpperCase();
      case 'pomodoros': return t('quickCapture.pomos', { count: chip.value });
    }
  };
  const hasContent = parsed.chips.length > 0 || parsed.unknownTokens.length > 0;
  const hasNewProject = parsed.chips.some((c) => c.kind === 'project-new');

  if (!hasContent && (!showLegend || !rawText)) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="qcp"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.15 }}
        className="overflow-hidden"
      >
        <div className="flex flex-wrap gap-1 px-3 py-1.5 mt-1">
          {parsed.chips.map((chip) => {
            const bar = chipBarColor(chip);
            const icon = chipIcon(chip);
            return (
              <motion.span
                key={chip.raw}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                className="group inline-flex items-center gap-1 pl-0 pr-1.5 rounded text-[10.5px] font-medium overflow-hidden"
                style={{
                  background: 'var(--bg2)',
                  border: chip.kind === 'project-new' ? '1px dashed var(--brd2)' : '1px solid var(--brd)',
                  color: 'var(--t2)',
                  height: 22,
                }}
              >
                <span className="w-[3px] self-stretch shrink-0" style={{ background: bar }} />
                <span className="flex items-center gap-1 px-1">
                  {icon && <span style={{ color: bar }}>{icon}</span>}
                  <span>{chipLabel(chip)}</span>
                </span>
                {chip.kind === 'project-new' && onCreateProject && (
                  <button
                    onClick={() => onCreateProject(chip.name)}
                    className="ml-0.5 px-1 py-0.5 rounded text-[9.5px] font-semibold transition-colors"
                    style={{ background: 'var(--card-h)', color: 'var(--grn)' }}
                  >
                    {t('quickCapture.create')}
                  </button>
                )}
                <button
                  onClick={() => onRemoveToken(chip.raw)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--t3)' }}
                >
                  <X size={9} />
                </button>
              </motion.span>
            );
          })}

          {parsed.unknownTokens.map((u) => (
            <motion.span
              key={u.token}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="inline-flex items-center gap-1 px-1.5 rounded text-[10.5px] font-medium"
              style={{
                background: 'rgba(245,166,35,0.08)',
                border: '1px solid rgba(245,166,35,0.25)',
                color: 'var(--amb)',
                height: 22,
              }}
              title={u.suggestion ? t('quickCapture.didYouMean', { suggestion: u.suggestion }) : t('quickCapture.unknownToken')}
            >
              <AlertCircle size={9} />
              {u.token}
              {u.suggestion && (
                <button
                  onClick={() => onApplySuggestion(u.token, u.suggestion!)}
                  className="ml-0.5 underline"
                  style={{ color: 'var(--amb)' }}
                >
                  → {u.suggestion}
                </button>
              )}
            </motion.span>
          ))}
        </div>

        {hasNewProject && (
          <div className="px-3 pb-1 text-[10.5px]" style={{ color: 'var(--t3)' }}>
            {t('quickCapture.tipBefore')}<span style={{ color: 'var(--grn)' }}>{t('quickCapture.create')}</span>{t('quickCapture.tipAfter')}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export const QuickCaptureLegend: React.FC = () => {
  const { t } = useTranslation('tasks');
  return (
    <div className="flex items-center gap-3 px-3 pt-1 text-[10px]" style={{ color: 'var(--t3)' }}>
      <span><span style={{ color: 'var(--accent)' }}>!</span>{t('quickCapture.legendDate')}</span>
      <span><span style={{ color: 'var(--blu)' }}>#</span>{t('quickCapture.legendType')}</span>
      <span><span style={{ color: 'var(--grn)' }}>@</span>{t('quickCapture.legendProject')}</span>
      <span><span style={{ color: 'var(--amb)' }}>+</span>p1</span>
      <span><span style={{ color: 'var(--blu)' }}>*</span>3</span>
    </div>
  );
};
