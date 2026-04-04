export interface Background {
  id: string;
  name: string;
  emoji: string;
  /** Path to bundled image in /public, or null for the default animated gradient mesh */
  src: string | null;
}

export const BACKGROUNDS: Background[] = [
  { id: 'default',    name: 'Default',     emoji: '✦',  src: null },
  { id: 'aurora',     name: 'Aurora',      emoji: '🌌', src: '/backgrounds/aurora.jpg' },
  { id: 'galaxy',     name: 'Galaxy',      emoji: '🪐', src: '/backgrounds/galaxy.jpg' },
  { id: 'forest',     name: 'Forest',      emoji: '🌲', src: '/backgrounds/forest.jpg' },
  { id: 'sunset',     name: 'Sunset',      emoji: '🌅', src: '/backgrounds/sunset.jpg' },
  { id: 'ocean',      name: 'Ocean',       emoji: '🌊', src: '/backgrounds/ocean.jpg' },
  { id: 'sakura',     name: 'Sakura',      emoji: '🌸', src: '/backgrounds/sakura.jpg' },
  { id: 'mountain',   name: 'Mountain',    emoji: '🏔️', src: '/backgrounds/mountain.jpg' },
  { id: 'cyberpunk',  name: 'Cyberpunk',   emoji: '⚡', src: '/backgrounds/cyberpunk.jpg' },
  { id: 'cozy-cafe',  name: 'Cozy Café',   emoji: '☕', src: '/backgrounds/cozy-cafe.jpg' },
];

export function getBackground(id: string): Background {
  if (id === 'custom') return { id: 'custom', name: 'Custom', emoji: '🖼️', src: null };
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
}
