import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROJECT_COLORS } from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { PROJECT_TEMPLATES, ProjectTemplate, daysFromNowMs, getTemplateName, getTemplateDescription, localizeTemplateMilestones, localizeTemplateTasks } from './projectTemplates';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'template' | 'customize';

export const NewProjectModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('projects');
  const { t: tCommon } = useTranslation('common');
  const { addProject, _seedProjectFromTemplate } = useTaskStore();
  const [step, setStep] = useState<Step>('template');
  const [template, setTemplate] = useState<ProjectTemplate | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reset = () => {
    setStep('template');
    setTemplate(null);
    setName('');
    setColor(PROJECT_COLORS[0]);
    setSubmitting(false);
    setSubmitError(null);
  };

  if (!open) return null;

  const pickTemplate = (t: ProjectTemplate) => {
    setTemplate(t);
    setColor(t.suggestedColor);
    setStep('customize');
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // addProject rolls back the optimistic add and rethrows when the
      // Supabase insert is rejected — surface the message instead of leaving
      // the modal hung with no feedback.
      await addProject(trimmed, color);
      // The new project is the last in the list — re-read from store rather
      // than the captured `projects` (stale).
      const created = useTaskStore.getState().projects.find((p) => p.name === trimmed && p.color === color);
      if (created && template && template.id !== 'blank') {
        const localizedMilestones = localizeTemplateMilestones(template);
        const localizedTasks = localizeTemplateTasks(template);
        const milestones = localizedMilestones.map((m) => ({
          title: m.title,
          targetDate: m.daysFromNow !== undefined ? daysFromNowMs(m.daysFromNow) : undefined,
        }));
        const dd = template.defaultDurations;
        const defaults = dd ? {
          customWorkDuration: dd.work,
          customShortBreakDuration: dd.shortBreak,
          customLongBreakDuration: dd.longBreak,
          customLongBreakInterval: dd.longBreakInterval,
          skipLongBreak: dd.skipLongBreak,
        } : undefined;
        await _seedProjectFromTemplate(
          created.id,
          template.emoji === '·' ? undefined : template.emoji,
          milestones,
          localizedTasks,
          defaults,
        );
      } else if (created && template && template.emoji !== '·') {
        // Blank template still gets the fallback (no emoji).
      }
      reset();
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[560px] rounded-2xl overflow-hidden relative"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--brd2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {step === 'customize' && (
                <button
                  onClick={() => setStep('template')}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
                >
                  <ArrowLeft size={13} />
                </button>
              )}
              <Sparkles size={14} style={{ color }} />
              <h3 className="font-fraunces text-[18px]" style={{ color: 'var(--t)' }}>
                {step === 'template' ? t('modal.title') : t('modal.customize')}
              </h3>
              <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
                {step === 'template' ? t('modal.pickTemplate') : (template ? `· ${getTemplateName(template)}` : '')}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
            >
              <X size={13} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 'template' ? (
              <motion.div
                key="step-template"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-2 gap-2.5"
              >
                {PROJECT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => pickTemplate(tpl)}
                    className="group flex flex-col items-start text-left p-4 rounded-xl transition-all"
                    style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--brd)',
                      minHeight: 140,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tpl.suggestedColor + '88';
                      e.currentTarget.style.background = 'var(--card-h)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brd)';
                      e.currentTarget.style.background = 'var(--bg2)';
                    }}
                  >
                    <span className="text-[28px] leading-none mb-2">{tpl.emoji}</span>
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--t)' }}>
                      {getTemplateName(tpl)}
                    </span>
                    <span className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
                      {getTemplateDescription(tpl)}
                    </span>
                    <div className="flex-1" />
                    <span className="text-[10.5px] mt-2" style={{ color: 'var(--t3)' }}>
                      {tpl.milestones.length === 0 && tpl.tasks.length === 0
                        ? t('modal.empty')
                        : t('modal.summary', { milestones: tpl.milestones.length, tasks: tpl.tasks.length })}
                    </span>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="step-customize"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
              >
                <div className="mb-4">
                  <label className="text-[10.5px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--t3)' }}>
                    {t('modal.name')}
                  </label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                    placeholder={t('modal.namePlaceholder')}
                    className="w-full px-3 py-2.5 rounded-xl text-[13px] focus:outline-none transition-all"
                    style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--brd)',
                      color: 'var(--t)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = color + '88'; e.currentTarget.style.boxShadow = `0 0 0 3px ${color}22`; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--brd)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                      {t('modal.color')}
                    </label>
                    {template && color === template.suggestedColor && (
                      <span className="text-[10.5px]" style={{ color: 'var(--t3)' }}>{t('modal.suggested')}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className="w-7 h-7 rounded-lg transition-all"
                        style={{
                          background: c,
                          transform: c === color ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: c === color ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {template && template.id !== 'blank' && (
                  <div
                    className="mb-5 rounded-xl p-3"
                    style={{ background: 'var(--bg2)', border: '1px solid var(--brd)' }}
                  >
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>
                      {t('modal.willBeCreated')}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {localizeTemplateMilestones(template).map((m, idx) => (
                        <div key={`m-${idx}`} className="flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--t2)' }}>
                          <span className="w-1 h-1 rounded-full" style={{ background: color }} />
                          <span className="flex-1">{m.title}</span>
                          {m.daysFromNow !== undefined && (
                            <span style={{ color: 'var(--t3)' }}>+{m.daysFromNow}d</span>
                          )}
                        </div>
                      ))}
                      {template.tasks.length > 0 && template.milestones.length > 0 && (
                        <div className="h-px my-1" style={{ background: 'var(--brd)' }} />
                      )}
                      {localizeTemplateTasks(template).map((task, idx) => (
                        <div key={`t-${idx}`} className="flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--t2)' }}>
                          <span style={{ color: 'var(--t3)' }}>·</span>
                          <span className="flex-1">{task.title}</span>
                          {task.type && (
                            <span className="text-[10px]" style={{ color: 'var(--t3)' }}>#{task.type}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {submitError && (
                  <div
                    className="mb-3 rounded-xl px-3 py-2 text-[11.5px]"
                    style={{
                      background: 'rgba(255,77,77,0.08)',
                      border: '1px solid rgba(255,77,77,0.25)',
                      color: '#ff8888',
                    }}
                  >
                    {submitError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handleClose}
                    className="px-3.5 py-2 rounded-xl text-[12px] font-medium transition-colors"
                    style={{ color: 'var(--t3)', background: 'transparent' }}
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    onClick={submit}
                    disabled={!name.trim() || submitting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
                    style={{
                      background: name.trim() && !submitting ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'var(--card-h)',
                      color: name.trim() && !submitting ? '#fff' : 'var(--t3)',
                      cursor: name.trim() && !submitting ? 'pointer' : 'not-allowed',
                      boxShadow: name.trim() && !submitting ? `0 4px 16px ${color}55` : 'none',
                    }}
                  >
                    {submitting ? tCommon('creating') : (
                      <>
                        {tCommon('create')}
                        <ArrowRight size={11} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
