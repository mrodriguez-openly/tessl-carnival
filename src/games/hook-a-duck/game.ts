import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS_PER_ROUND = 6;
/** Seconds the hook takes to drop from the rod to the water. */
export const DROP_TIME = 0.5;
/** How close to the centre of a duck the hook has to land to catch it. */
export const CATCH_RADIUS = 20;
/** The stream is an oval loop the ducks float round. */
export const STREAM = { x: WIDTH / 2, y: 260, rx: 300, ry: 130 } as const;
/** Radians per second each duck travels round the stream. */
export const DUCK_SPEED = 0.5;
/** The number on each duck's base, in order round the stream. */
export const DUCK_POINTS = [5, 10, 5, 20, 5, 10, 5, 50, 5, 10] as const;
/** Where the rod hangs from: the hook drops from this height. */
const ROD_Y = 50;

export interface Duck {
  points: number;
  /** Where the duck starts round the loop, in radians. */
  offset: number;
}

export interface Hook {
  x: number;
  y: number;
  /** Seconds since the cast. */
  age: number;
}

export interface Catch {
  points: number;
  x: number;
  y: number;
  /** Seconds since the catch; drives the "+points" popup. */
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook | null;
  catches: Catch[];
  casts: number;
  score: number;
  /** Seconds since the round started; moves the ducks. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_POINTS.map((points, i) => ({
    points,
    offset: (i / DUCK_POINTS.length) * Math.PI * 2,
  }));
  return {
    ducks,
    hook: null,
    catches: [],
    casts: CASTS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** Where a duck is on the stream at `time` seconds. */
export function duckPosition(duck: Duck, time: number): { x: number; y: number } {
  const angle = duck.offset + time * DUCK_SPEED;
  return { x: STREAM.x + STREAM.rx * Math.cos(angle), y: STREAM.y + STREAM.ry * Math.sin(angle) };
}

/** The duck a hook landing at (x, y) at `time` seconds catches, if any: the closest one in reach. */
export function duckAt(ducks: Duck[], time: number, x: number, y: number): Duck | undefined {
  let best: Duck | undefined;
  let bestDistance = CATCH_RADIUS;
  for (const duck of ducks) {
    const p = duckPosition(duck, time);
    const distance = Math.hypot(x - p.x, y - p.y);
    if (distance <= bestDistance) {
      best = duck;
      bestDistance = distance;
    }
  }
  return best;
}

/** Lowers the hook towards (x, y). Returns false if nothing was cast. */
export function cast(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.hook) return false;
  state.hook = { x, y: Math.max(y, ROD_Y + 1), age: 0 };
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  state.time += dt;

  for (const c of state.catches) c.age += dt;
  state.catches = state.catches.filter((c) => c.age < 1);

  const hook = state.hook;
  if (hook) {
    hook.age += dt;
    if (hook.age >= DROP_TIME) {
      // Find the ducks where they were when the hook landed, not at the end of this frame.
      const landedAt = state.time - (hook.age - DROP_TIME);
      const duck = duckAt(state.ducks, landedAt, hook.x, hook.y);
      if (duck) {
        state.score += duck.points;
        state.catches.push({ points: duck.points, x: hook.x, y: hook.y, age: 0 });
      }
      state.hook = null;
    }
  }

  if (state.casts === 0 && !state.hook) state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, points: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, 18, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10, y - 12, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.danger;
  ctx.fillRect(x + 16, y - 13, 7, 4);
  ctx.fillStyle = colors.background;
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText(String(points), x - 2, y + 5);
}

function drawHook(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { colors } = theme;
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, ROD_Y);
  ctx.lineTo(x, y - 8);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 8, -Math.PI / 2, Math.PI, false);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The rod runs across the top of the booth.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, ROD_Y - 6, WIDTH, 6);

  // The stream: a wooden trough with water in it.
  ctx.lineWidth = 56;
  ctx.strokeStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 44;
  ctx.strokeStyle = colors.water;
  ctx.stroke();

  for (const duck of state.ducks) {
    const { x, y } = duckPosition(duck, state.time);
    drawDuck(ctx, x, y, duck.points);
  }

  if (state.hook) {
    const t = Math.min(state.hook.age / DROP_TIME, 1);
    drawHook(ctx, state.hook.x, ROD_Y + (state.hook.y - ROD_Y) * t);
  } else if (state.phase === 'playing') {
    // Where the next cast would land.
    const y = Math.max(aim.y, ROD_Y + 1);
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, y, CATCH_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    drawHook(ctx, aim.x, ROD_Y + 30);
  }

  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'center';
  for (const c of state.catches) {
    ctx.globalAlpha = 1 - c.age;
    ctx.fillStyle = colors.accent;
    ctx.fillText(`+${c.points}`, c.x, c.y - 30 - c.age * 30);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Hook the rubber ducks as they float by. The number on each duck is its score.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y + STREAM.ry };

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
        cast(state, aim.x, aim.y);
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
        recordScore(hookADuck.id, state.score);
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

export default hookADuck;
