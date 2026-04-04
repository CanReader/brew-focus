export interface AppTheme {
  id: string;
  name: string;
  category: 'dark' | 'neutral' | 'warm' | 'colorful';
  bg: string;
  bg2: string;
  card: string;
  cardH: string;
  brd: string;
  brd2: string;
  t: string;
  t2: string;
  t3: string;
}

export const THEMES: AppTheme[] = [
  // ── Dark ─────────────────────────────────────────────────────────────────
  {
    id: 'obsidian',
    name: 'Obsidian',
    category: 'dark',
    bg: '#080810', bg2: '#0e0e1a', card: '#13131f', cardH: '#181828',
    brd: 'rgba(255,255,255,0.06)', brd2: 'rgba(255,255,255,0.12)',
    t: '#f0f0ff', t2: '#9090b0', t3: '#55556a',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'dark',
    bg: '#04050f', bg2: '#080c18', card: '#0d1121', cardH: '#121628',
    brd: 'rgba(255,255,255,0.06)', brd2: 'rgba(255,255,255,0.12)',
    t: '#e8eeff', t2: '#7888b8', t3: '#445070',
  },
  {
    id: 'abyss',
    name: 'Abyss',
    category: 'dark',
    bg: '#020202', bg2: '#080808', card: '#0e0e0e', cardH: '#141414',
    brd: 'rgba(255,255,255,0.05)', brd2: 'rgba(255,255,255,0.10)',
    t: '#f0f0f0', t2: '#888888', t3: '#505050',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    category: 'neutral',
    bg: '#111111', bg2: '#181818', card: '#202020', cardH: '#282828',
    brd: 'rgba(255,255,255,0.07)', brd2: 'rgba(255,255,255,0.13)',
    t: '#f0f0f0', t2: '#909090', t3: '#505050',
  },
  // ── Neutral / Slate ───────────────────────────────────────────────────────
  {
    id: 'slate',
    name: 'Slate',
    category: 'neutral',
    bg: '#0d1117', bg2: '#161b22', card: '#1c2128', cardH: '#222d38',
    brd: 'rgba(255,255,255,0.07)', brd2: 'rgba(255,255,255,0.13)',
    t: '#e6edf3', t2: '#8b949e', t3: '#484f58',
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    category: 'neutral',
    bg: '#1a1d22', bg2: '#21252b', card: '#282c34', cardH: '#2f333d',
    brd: 'rgba(255,255,255,0.07)', brd2: 'rgba(255,255,255,0.13)',
    t: '#abb2bf', t2: '#636d83', t3: '#3e4451',
  },
  {
    id: 'nord',
    name: 'Nord',
    category: 'neutral',
    bg: '#1e2430', bg2: '#242933', card: '#2e3440', cardH: '#3b4252',
    brd: 'rgba(255,255,255,0.07)', brd2: 'rgba(255,255,255,0.13)',
    t: '#eceff4', t2: '#9aa3b2', t3: '#4c566a',
  },
  // ── Warm ─────────────────────────────────────────────────────────────────
  {
    id: 'volcanic',
    name: 'Volcanic',
    category: 'warm',
    bg: '#100805', bg2: '#18100a', card: '#201510', cardH: '#281b14',
    brd: 'rgba(255,200,150,0.07)', brd2: 'rgba(255,200,150,0.13)',
    t: '#f5ede8', t2: '#b09080', t3: '#6a5048',
  },
  {
    id: 'coffee',
    name: 'Coffee',
    category: 'warm',
    bg: '#140a05', bg2: '#1e1008', card: '#281610', cardH: '#321d14',
    brd: 'rgba(255,190,140,0.07)', brd2: 'rgba(255,190,140,0.13)',
    t: '#f8e8d8', t2: '#c09878', t3: '#7a5840',
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    category: 'warm',
    bg: '#1b1b1b', bg2: '#242424', card: '#2c2c2c', cardH: '#353535',
    brd: 'rgba(235,219,178,0.08)', brd2: 'rgba(235,219,178,0.14)',
    t: '#ebdbb2', t2: '#a89984', t3: '#665c54',
  },
  {
    id: 'solarized',
    name: 'Solarized',
    category: 'warm',
    bg: '#001f27', bg2: '#002b36', card: '#073642', cardH: '#0e4050',
    brd: 'rgba(253,246,227,0.07)', brd2: 'rgba(253,246,227,0.13)',
    t: '#fdf6e3', t2: '#93a1a1', t3: '#586e75',
  },
  // ── Colorful ─────────────────────────────────────────────────────────────
  {
    id: 'dracula',
    name: 'Dracula',
    category: 'colorful',
    bg: '#0d0d15', bg2: '#12121e', card: '#1a1a2e', cardH: '#222240',
    brd: 'rgba(255,255,255,0.07)', brd2: 'rgba(255,255,255,0.13)',
    t: '#f8f8f2', t2: '#8888b0', t3: '#4a4a68',
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    category: 'colorful',
    bg: '#11111b', bg2: '#181825', card: '#1e1e2e', cardH: '#262638',
    brd: 'rgba(205,214,244,0.07)', brd2: 'rgba(205,214,244,0.13)',
    t: '#cdd6f4', t2: '#a6adc8', t3: '#585b70',
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    category: 'colorful',
    bg: '#191724', bg2: '#1f1d2e', card: '#26233a', cardH: '#2d2b45',
    brd: 'rgba(224,222,244,0.07)', brd2: 'rgba(224,222,244,0.13)',
    t: '#e0def4', t2: '#908caa', t3: '#524f67',
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    category: 'colorful',
    bg: '#13131e', bg2: '#1a1b2e', card: '#1e2040', cardH: '#252555',
    brd: 'rgba(192,202,245,0.07)', brd2: 'rgba(192,202,245,0.13)',
    t: '#c0caf5', t2: '#787c99', t3: '#414868',
  },
  {
    id: 'purple-night',
    name: 'Purple Night',
    category: 'colorful',
    bg: '#0e0816', bg2: '#140c20', card: '#1c122a', cardH: '#241834',
    brd: 'rgba(220,190,255,0.07)', brd2: 'rgba(220,190,255,0.13)',
    t: '#e8d8ff', t2: '#9878c8', t3: '#584878',
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'colorful',
    bg: '#060d08', bg2: '#0b160d', card: '#101e12', cardH: '#152517',
    brd: 'rgba(200,240,200,0.07)', brd2: 'rgba(200,240,200,0.13)',
    t: '#e8f5ea', t2: '#7aaa80', t3: '#3d6642',
  },
  {
    id: 'cotton-candy',
    name: 'Cotton Candy',
    category: 'colorful',
    bg: '#130f1a', bg2: '#1a1424', card: '#211a2e', cardH: '#282138',
    brd: 'rgba(240,180,255,0.07)', brd2: 'rgba(240,180,255,0.15)',
    t: '#f8e0ff', t2: '#c090e0', t3: '#785a90',
  },
  {
    id: 'flamingo',
    name: 'Flamingo',
    category: 'colorful',
    bg: '#160810', bg2: '#1e0e18', card: '#281420', cardH: '#321a28',
    brd: 'rgba(255,140,190,0.07)', brd2: 'rgba(255,140,190,0.15)',
    t: '#ffe0ee', t2: '#e060a0', t3: '#904060',
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    category: 'colorful',
    bg: '#160e0c', bg2: '#1e1410', card: '#281a16', cardH: '#32201c',
    brd: 'rgba(255,200,170,0.07)', brd2: 'rgba(255,200,170,0.15)',
    t: '#ffe8dc', t2: '#c8907a', t3: '#885850',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    category: 'colorful',
    bg: '#110e18', bg2: '#171422', card: '#1f1a2c', cardH: '#272036',
    brd: 'rgba(200,170,255,0.07)', brd2: 'rgba(200,170,255,0.15)',
    t: '#e8dcff', t2: '#a888e0', t3: '#605080',
  },
  {
    id: 'strawberry',
    name: 'Strawberry',
    category: 'colorful',
    bg: '#180808', bg2: '#200e0e', card: '#2c1212', cardH: '#381616',
    brd: 'rgba(255,160,160,0.07)', brd2: 'rgba(255,160,160,0.15)',
    t: '#ffe0e0', t2: '#e07878', t3: '#904040',
  },
  {
    id: 'fairy',
    name: 'Fairy',
    category: 'colorful',
    bg: '#0e0e1a', bg2: '#141424', card: '#1c1a30', cardH: '#22203c',
    brd: 'rgba(220,180,255,0.07)', brd2: 'rgba(220,180,255,0.15)',
    t: '#f0e0ff', t2: '#b898e8', t3: '#6a5090',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    category: 'colorful',
    bg: '#140810', bg2: '#1c0e18', card: '#241220', cardH: '#2c1828',
    brd: 'rgba(255,180,210,0.07)', brd2: 'rgba(255,180,210,0.14)',
    t: '#ffe8f4', t2: '#c880a8', t3: '#7a4860',
  },
  {
    id: 'bubblegum',
    name: 'Bubblegum',
    category: 'colorful',
    bg: '#1a0d18', bg2: '#221220', card: '#2c182a', cardH: '#361e34',
    brd: 'rgba(255,160,220,0.07)', brd2: 'rgba(255,160,220,0.14)',
    t: '#ffd6f0', t2: '#d070b0', t3: '#805068',
  },
  {
    id: 'cyber',
    name: 'Cyber',
    category: 'colorful',
    bg: '#020c10', bg2: '#041418', card: '#071c22', cardH: '#0a242c',
    brd: 'rgba(0,240,255,0.07)', brd2: 'rgba(0,240,255,0.13)',
    t: '#e0f8ff', t2: '#6ab8c8', t3: '#326878',
  },
];

export const DEFAULT_THEME_ID = 'obsidian';

export function getTheme(id: string): AppTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyTheme(id: string): void {
  const theme = getTheme(id);
  const root = document.documentElement.style;
  root.setProperty('--bg', theme.bg);
  root.setProperty('--bg2', theme.bg2);
  root.setProperty('--card', theme.card);
  root.setProperty('--card-h', theme.cardH);
  root.setProperty('--brd', theme.brd);
  root.setProperty('--brd2', theme.brd2);
  root.setProperty('--t', theme.t);
  root.setProperty('--t2', theme.t2);
  root.setProperty('--t3', theme.t3);
}
