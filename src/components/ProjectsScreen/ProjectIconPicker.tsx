import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';

interface Props {
  current?: string;
  projectColor: string;
  anchorRect: DOMRect;
  onPick: (emoji: string | undefined) => void;
  onClose: () => void;
}

const CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Work',
    emojis: ['💼','📁','🗂️','📋','📌','📎','📝','✏️','📊','📈','🎯','🚀','⚡','🔧','⚙️','🛠️','📅','🗓️','🔔','📣','💰','📦','🏢','🏠'],
  },
  {
    label: 'Code & tech',
    emojis: ['💻','🖥️','📱','⌨️','🖱️','🌐','🔗','🔐','🔑','🐛','🪲','💾','🧪','🧬','🔬','⚛️','🤖','🧠','🪐','📡','🖲️','💿','📀','🎛️'],
  },
  {
    label: 'Creative',
    emojis: ['🎨','🎭','🎬','🎵','🎤','🎸','🎹','🎺','🎻','📚','🎓','🏆','🎖️','📷','🎥','🎮','🎲','🧩','🖌️','🖍️','✨','💡','🪄','🎪'],
  },
  {
    label: 'Life',
    emojis: ['☕','🍵','🍺','🍷','🌱','🌿','🌳','🌲','☀️','🌙','⭐','🔥','💧','🌊','🏃','🚴','🧘','🥾','🍎','🥗','💪','❤️','🧡','💚'],
  },
  {
    label: 'Symbols',
    emojis: ['✅','☑️','⚠️','❌','❓','❗','💯','🆕','🔁','🔄','⏰','⏳','🎁','🏁','🚩','🏷️','🔖','🌟','💫','🎉','🎊','🌈','🪶','🗝️'],
  },
];

export const ProjectIconPicker: React.FC<Props> = ({
  current, projectColor, anchorRect, onPick, onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    let attached = false;
    const tid = window.setTimeout(() => {
      attached = true;
      document.addEventListener('mousedown', handle);
      document.addEventListener('keydown', handleKey);
    }, 50);
    return () => {
      clearTimeout(tid);
      if (attached) {
        document.removeEventListener('mousedown', handle);
        document.removeEventListener('keydown', handleKey);
      }
    };
  }, [onClose]);

  // Smart-flip positioning: anchor below the avatar by default; flip above if no room.
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: anchorRect.left, y: anchorRect.bottom + 8 });
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const margin = 12;

    let nx = anchorRect.left;
    let ny = anchorRect.bottom + 8;

    if (ny + h + margin > window.innerHeight) {
      ny = anchorRect.top - h - 8;
    }
    if (nx + w + margin > window.innerWidth) {
      nx = window.innerWidth - w - margin;
    }
    nx = Math.max(margin, nx);
    ny = Math.max(margin, ny);

    setPos({ x: nx, y: ny });
    setMeasured(true);
  }, [anchorRect.left, anchorRect.top, anchorRect.bottom]);

  const node = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="fixed z-[999] rounded-2xl overflow-hidden flex flex-col"
      style={{
        left: pos.x,
        top: pos.y,
        width: 360,
        maxHeight: 440,
        background: 'var(--card)',
        border: '1px solid var(--brd2)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
        visibility: measured ? 'visible' : 'hidden',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${projectColor}, transparent)`, opacity: 0.7 }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${projectColor}33, ${projectColor}11)`,
              border: `1px solid ${projectColor}55`,
            }}
          >
            {current ? (
              <span className="text-[15px] leading-none">{current}</span>
            ) : (
              <div className="w-2 h-2 rounded" style={{ background: projectColor }} />
            )}
          </div>
          <div>
            <div className="text-[12.5px] font-semibold" style={{ color: 'var(--t)' }}>Pick an icon</div>
            <div className="text-[10.5px]" style={{ color: 'var(--t3)' }}>Click any emoji to set it.</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable categories */}
      <div className="overflow-y-auto px-3 pb-2" style={{ maskImage: 'linear-gradient(to bottom, black, black 96%, transparent)' }}>
        {CATEGORIES.map((cat) => (
          <div key={cat.label} className="mb-2">
            <div
              className="text-[10px] font-semibold uppercase tracking-wider px-1 py-1"
              style={{ color: 'var(--t3)' }}
            >
              {cat.label}
            </div>
            <div className="grid grid-cols-8 gap-1">
              {cat.emojis.map((emoji) => {
                const isSelected = emoji === current;
                return (
                  <button
                    key={emoji}
                    onClick={() => onPick(emoji)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
                    style={{
                      fontSize: 18,
                      background: isSelected ? `${projectColor}26` : 'transparent',
                      border: `1px solid ${isSelected ? projectColor : 'transparent'}`,
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--card-h)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    title={emoji}
                  >
                    <span className="leading-none">{emoji}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderTop: '1px solid var(--brd)', background: 'rgba(0,0,0,0.18)' }}
      >
        <button
          onClick={() => onPick(undefined)}
          disabled={!current}
          className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-colors"
          style={{
            color: current ? 'var(--accent)' : 'var(--t3)',
            opacity: current ? 1 : 0.5,
            cursor: current ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => { if (current) e.currentTarget.style.background = 'rgba(232,69,60,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={11} />
          Remove icon
        </button>
        <span className="text-[10.5px]" style={{ color: 'var(--t3)' }}>
          Press <kbd className="px-1 rounded text-[9.5px]" style={{ background: 'var(--card-h)' }}>Esc</kbd> to close
        </span>
      </div>
    </motion.div>
  );

  return createPortal(node, document.body);
};
