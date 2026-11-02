/**
 * The carnival's colours, fonts and sizes. Games draw with these rather than
 * their own values, so every booth on the midway looks like it belongs.
 *
 * The colours come from the Catppuccin Frappé palette (v1.8.0):
 * https://github.com/catppuccin/palette/blob/main/palette.json
 */
export const theme = {
  colors: {
    background: '#303446', // base
    surface: '#414559', // surface0
    text: '#c6d0f5', // text
    muted: '#a5adce', // subtext0
    accent: '#e5c890', // yellow
    danger: '#e78284', // red
    stripeA: '#ea999c', // maroon
    stripeB: '#f2d5cf', // rosewater
    water: '#85c1dc', // sapphire
    wood: '#ef9f76', // peach
  },
  font: {
    family: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    small: 14,
    body: 18,
    title: 32,
  },
  radius: 12,
  canvas: {
    width: 800,
    height: 500,
  },
} as const;

/** Canvas font string, e.g. canvasFont('title') → 'bold 32px "Trebuchet MS", …'. */
export function canvasFont(size: 'small' | 'body' | 'title', weight: 'normal' | 'bold' = 'normal') {
  return `${weight} ${theme.font[size]}px ${theme.font.family}`;
}

/** Exposes the theme to CSS as custom properties, e.g. --color-accent. */
export function applyTheme(root: HTMLElement = document.documentElement) {
  for (const [name, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-${name}`, value);
  }
  root.style.setProperty('--font-family', theme.font.family);
  root.style.setProperty('--radius', `${theme.radius}px`);
}
