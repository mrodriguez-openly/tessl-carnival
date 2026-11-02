import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_MOLE = 10;
export const HOLE_RADIUS = 46;
const COLUMNS = 3;
const ROWS = 3;
/** Seconds between pop-ups, and how long a mole stays up, at the start and end of a round. */
const SPAWN_START = 1.0;
const SPAWN_END = 0.4;
const UP_START = 1.2;
const UP_END = 0.6;

export interface Hole {
  x: number;
  y: number;
  /** Seconds the mole stays up; 0 when the hole is empty. */
  up: number;
}

export interface Bonk {
  x: number;
  y: number;
  age: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  bonks: Bonk[];
  /** Seconds since the round started. */
  elapsed: number;
  /** Seconds until the next mole pops up. */
  nextMole: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes: Hole[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      holes.push({ x: (WIDTH / COLUMNS) * (col + 0.5), y: 140 + row * 120, up: 0 });
    }
  }
  return { holes, bonks: [], elapsed: 0, nextMole: SPAWN_START, score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 to 1. */
function progress(elapsed: number): number {
  return Math.min(Math.max(elapsed / ROUND_SECONDS, 0), 1);
}

/** Seconds between pop-ups: it shrinks as the round goes on. */
export function spawnInterval(elapsed: number): number {
  return SPAWN_START + (SPAWN_END - SPAWN_START) * progress(elapsed);
}

/** Seconds a mole stays up: it shrinks as the round goes on. */
export function upTime(elapsed: number): number {
  return UP_START + (UP_END - UP_START) * progress(elapsed);
}

export function timeLeft(state: WhackAMoleState): number {
  return Math.max(ROUND_SECONDS - state.elapsed, 0);
}

/** Whacks at a point. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find(
    (h) => h.up > 0 && Math.hypot(x - h.x, y - (h.y - HOLE_RADIUS * 0.4)) <= HOLE_RADIUS,
  );
  if (!hole) return false;
  hole.up = 0;
  state.score += POINTS_PER_MOLE;
  state.bonks.push({ x: hole.x, y: hole.y - HOLE_RADIUS * 0.4, age: 0 });
  return true;
}

/** Advances the game by `dt` seconds. `random` picks which hole a mole pops from. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  for (const bonk of state.bonks) bonk.age += dt;
  state.bonks = state.bonks.filter((b) => b.age < 0.3);
  if (state.phase !== 'playing') return;

  state.elapsed += dt;
  for (const hole of state.holes) hole.up = Math.max(hole.up - dt, 0);

  if (state.elapsed >= ROUND_SECONDS) {
    state.elapsed = ROUND_SECONDS;
    for (const hole of state.holes) hole.up = 0;
    state.phase = 'over';
    return;
  }

  state.nextMole -= dt;
  if (state.nextMole <= 0) {
    const empty = state.holes.filter((h) => h.up === 0);
    if (empty.length > 0) {
      const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
      hole.up = upTime(state.elapsed);
    }
    state.nextMole += spawnInterval(state.elapsed);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    ctx.fillStyle = colors.wood;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, HOLE_RADIUS + 8, HOLE_RADIUS * 0.45 + 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, HOLE_RADIUS, HOLE_RADIUS * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0) {
      const top = hole.y - HOLE_RADIUS * 0.4;
      // Clip at the hole's rim so the mole looks like it rises out of it.
      ctx.save();
      ctx.beginPath();
      ctx.rect(hole.x - HOLE_RADIUS, top - HOLE_RADIUS * 1.2, HOLE_RADIUS * 2, HOLE_RADIUS * 1.6);
      ctx.clip();
      ctx.fillStyle = colors.muted;
      ctx.beginPath();
      ctx.arc(hole.x, top, HOLE_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.background;
      ctx.beginPath();
      ctx.arc(hole.x - 12, top - 8, 5, 0, Math.PI * 2);
      ctx.arc(hole.x + 12, top - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.danger;
      ctx.beginPath();
      ctx.arc(hole.x, top + 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 3;
  for (const bonk of state.bonks) {
    ctx.globalAlpha = 1 - bonk.age / 0.3;
    ctx.beginPath();
    ctx.arc(bonk.x, bonk.y, 10 + bonk.age * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(timeLeft(state))}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get quicker as the clock runs.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
