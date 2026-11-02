import { theme } from '../carnival';

const { colors } = theme;

/**
 * The midway map's Catppuccin Frappé palette (v1.8.0). Tent reds, creams and
 * golds come from the carnival theme; the sky, grass, paths and other scenery
 * shades only the map uses live here, each named after its Frappé colour.
 */
export const palette = {
  sky: '#99d1db', // sky
  skyHigh: '#8caaee', // blue
  cloud: '#c6d0f5', // text
  cloudShade: '#babbf1', // lavender
  haze: '#81c8be', // teal

  grass: '#a6d189', // green
  grassDark: '#81c8be', // teal
  grassEdge: '#81c8be', // teal
  grassLight: '#a6d189', // green
  path: '#e5c890', // yellow
  pathShade: '#ef9f76', // peach
  hedge: '#81c8be', // teal
  hedgeDark: '#85c1dc', // sapphire
  hedgeLight: '#a6d189', // green
  shadow: 'rgba(35, 38, 52, 0.35)', // crust

  red: colors.stripeA,
  redShade: '#e78284', // red
  cream: colors.stripeB,
  creamShade: '#eebebe', // flamingo
  gold: colors.accent,
  goldShade: '#ef9f76', // peach
  blue: '#babbf1', // lavender
  blueShade: '#8caaee', // blue
  sky2: colors.water,
  pink: '#f4b8e4', // pink
  pinkShade: '#ca9ee6', // mauve
  wood: colors.wood,
  woodDark: '#626880', // surface2
  woodLight: '#eebebe', // flamingo
  board: '#eebebe', // flamingo
  metal: '#b5bfe2', // subtext1
  metalShade: '#838ba7', // overlay1
  ink: colors.background,
  opening: '#292c3c', // mantle
  closed: '#949cbb', // overlay2
  closedShade: '#737994', // overlay0
  white: '#c6d0f5', // text

  skins: ['#f1c27d', '#c68642', '#8d5524', '#e0ac69', '#ffdbac'],
  // crust, surface1, peach, yellow, overlay0
  hairs: ['#232634', '#51576d', '#ef9f76', '#e5c890', '#737994'],
  // sapphire, green, mauve, red, lavender, rosewater
  shirts: [colors.water, '#a6d189', '#ca9ee6', colors.danger, '#babbf1', colors.stripeB],
  // surface0, surface1, mantle
  pants: ['#414559', '#51576d', '#292c3c'],
  bunting: [colors.stripeA, colors.accent, '#babbf1', colors.stripeB],
  balloons: [colors.stripeA, colors.accent, '#babbf1', colors.water, '#f4b8e4'],
} as const;
