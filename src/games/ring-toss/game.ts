import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
export const FLIGHT_TIME = 0.6;
/** How close to the centre of a bottle's neck a ring has to land to score. */
export const NECK_RADIUS = 14;
/** The thrower's hand sways side to side, so the ring lands off the aim. */
export const SWAY = 30;
const SWAY_SPEED = 2.5;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
const COLUMNS = 5;
/** Back row first: bottles further back score more. */
const ROWS = [
  { y: 110, points: 30 },
  { y: 175, points: 20 },
  { y: 240, points: 10 },
];

export interface Bottle {
  x: number;
  y: number;
  points: number;
  rings: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface Miss {
  x: number;
  y: number;
}

export interface RingTossState {
  bottles: Bottle[];
  flying: Ring[];
  misses: Miss[];
  rings: number;
  score: number;
  /** Seconds since the round started; drives the sway. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 90;
  const left = WIDTH / 2 - (spacing * (COLUMNS - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: COLUMNS }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      points: row.points,
      rings: 0,
    })),
  );
  return {
    bottles,
    flying: [],
    misses: [],
    rings: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** How far the hand has swayed sideways at `time` seconds. */
export function swayAt(time: number): number {
  return SWAY * Math.sin(time * SWAY_SPEED);
}

/** The bottle whose neck a ring landing at (x, y) goes over, if any. */
export function bottleAt(bottles: Bottle[], x: number, y: number): Bottle | undefined {
  return bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/** Throws one ring towards the aim, pushed off by the sway. Returns false if nothing was thrown. */
export function throwRing(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0) return false;
  state.flying.push({
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + swayAt(state.time),
    toY: Math.min(aimY, THROWER.y - 1),
    age: 0,
  });
  state.rings -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const remaining: Ring[] = [];
  for (const ring of state.flying) {
    ring.age += dt;
    if (ring.age < FLIGHT_TIME) {
      remaining.push(ring);
      continue;
    }
    const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
    if (bottle) {
      bottle.rings += 1;
      state.score += bottle.points;
    } else {
      state.misses.push({ x: ring.toX, y: ring.toY });
    }
  }
  state.flying = remaining;

  if (state.rings === 0 && state.flying.length === 0) state.phase = 'over';
}

/** Where a ring in flight is now: a straight line with a hop upwards. */
function ringPosition(ring: Ring) {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(t * Math.PI) * 80,
  };
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, NECK_RADIUS, NECK_RADIUS * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Shelves under each row of bottles.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(140, row.y + 34, WIDTH - 280, 8);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12, bottle.y + 4, 24, 30);
    ctx.fillRect(bottle.x - 5, bottle.y - 12, 10, 18);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(bottle.x - 6, bottle.y - 16, 12, 5);
  }

  ctx.lineWidth = 4;
  ctx.strokeStyle = colors.accent;
  for (const bottle of state.bottles) {
    for (let i = 0; i < bottle.rings; i++) drawRing(ctx, bottle.x, bottle.y + 6 - i * 4);
  }
  ctx.strokeStyle = colors.muted;
  for (const miss of state.misses) drawRing(ctx, miss.x, miss.y);
  ctx.strokeStyle = colors.accent;
  for (const ring of state.flying) {
    const { x, y } = ringPosition(ring);
    drawRing(ctx, x, y);
  }

  // Where the next ring would land, sway included.
  if (state.phase === 'playing' && state.rings > 0) {
    const x = aim.x + swayAt(state.time);
    const y = Math.min(aim.y, THROWER.y - 1);
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y);
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + 8);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 2 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        throwRing(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
