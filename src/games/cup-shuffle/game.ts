import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CUPS = 3;
export const GUESSES_PER_ROUND = 5;
export const POINTS_PER_CORRECT = 2;
export const SWAPS_PER_GUESS = 6;
/** Seconds the quarter shows before the cups come down and shuffle. */
export const PLACE_TIME = 1.2;
/** Seconds one swap of two cups takes. */
export const SWAP_TIME = 0.45;
/** Seconds the result shows before the next guess. */
export const REVEAL_TIME = 1.5;

const SLOT_SPACING = 200;
const CUP_Y = 300;
const CUP_WIDTH = 120;
const CUP_HEIGHT = 130;
const LIFT = 90;

/** Two slots whose cups trade places. */
export type Swap = [number, number];

export interface CupShuffleState {
  /** `slots[cup]` is the slot, left to right, that the cup stands in. */
  slots: number[];
  /** The cup the quarter is under. */
  quarterCup: number;
  swaps: Swap[];
  /** The swap under way, while shuffling. */
  swapIndex: number;
  /** Seconds into the current phase, or into the current swap while shuffling. */
  timer: number;
  /** The cup the player picked for the current guess. */
  chosen: number | null;
  /** Guesses made this round. */
  guesses: number;
  score: number;
  phase: 'placing' | 'shuffling' | 'choosing' | 'revealing' | 'over';
  random: () => number;
}

/** `count` swaps, each between two different slots. */
export function planSwaps(count: number, random: () => number): Swap[] {
  return Array.from({ length: count }, () => {
    const a = Math.floor(random() * CUPS);
    const b = (a + 1 + Math.floor(random() * (CUPS - 1))) % CUPS;
    return [a, b];
  });
}

/** Places the quarter under a cup and plans the shuffle for the next guess. */
export function startGuess(state: CupShuffleState): void {
  state.quarterCup = Math.floor(state.random() * CUPS);
  state.swaps = planSwaps(SWAPS_PER_GUESS, state.random);
  state.swapIndex = 0;
  state.timer = 0;
  state.chosen = null;
  state.phase = 'placing';
}

export function createState(random: () => number = Math.random): CupShuffleState {
  const state: CupShuffleState = {
    slots: Array.from({ length: CUPS }, (_, i) => i),
    quarterCup: 0,
    swaps: [],
    swapIndex: 0,
    timer: 0,
    chosen: null,
    guesses: 0,
    score: 0,
    phase: 'placing',
    random,
  };
  startGuess(state);
  return state;
}

/** Trades the places of the cups standing in slots `a` and `b`. */
export function applySwap(slots: number[], [a, b]: Swap): void {
  for (let cup = 0; cup < slots.length; cup++) {
    if (slots[cup] === a) slots[cup] = b;
    else if (slots[cup] === b) slots[cup] = a;
  }
}

/** The cup standing in `slot`. */
export function cupInSlot(state: CupShuffleState, slot: number): number {
  return state.slots.indexOf(slot);
}

/** Picks a cup. Returns false if the cups aren't ready for a guess. */
export function guess(state: CupShuffleState, cup: number): boolean {
  if (state.phase !== 'choosing' || cup < 0 || cup >= CUPS) return false;
  state.chosen = cup;
  state.guesses += 1;
  if (cup === state.quarterCup) state.score += POINTS_PER_CORRECT;
  state.phase = 'revealing';
  state.timer = 0;
  return true;
}

/** Whether the player's last pick found the quarter. */
export function guessedRight(state: CupShuffleState): boolean {
  return state.chosen === state.quarterCup;
}

/** Advances the game by `dt` seconds. */
export function step(state: CupShuffleState, dt: number): void {
  state.timer += dt;
  switch (state.phase) {
    case 'placing':
      if (state.timer >= PLACE_TIME) {
        state.phase = 'shuffling';
        state.timer = 0;
      }
      break;
    case 'shuffling':
      while (state.phase === 'shuffling' && state.timer >= SWAP_TIME) {
        applySwap(state.slots, state.swaps[state.swapIndex]);
        state.swapIndex += 1;
        state.timer -= SWAP_TIME;
        if (state.swapIndex >= state.swaps.length) {
          state.phase = 'choosing';
          state.timer = 0;
        }
      }
      break;
    case 'revealing':
      if (state.timer >= REVEAL_TIME) {
        if (state.guesses >= GUESSES_PER_ROUND) state.phase = 'over';
        else startGuess(state);
      }
      break;
    default:
      break;
  }
}

function slotX(slot: number): number {
  return WIDTH / 2 + (slot - (CUPS - 1) / 2) * SLOT_SPACING;
}

/** Where a cup's base centre is drawn now, mid-swap included. */
export function cupPosition(state: CupShuffleState, cup: number): { x: number; y: number } {
  const slot = state.slots[cup];
  let x = slotX(slot);
  let y = CUP_Y;
  if (state.phase === 'shuffling') {
    const [a, b] = state.swaps[state.swapIndex];
    if (slot === a || slot === b) {
      const t = Math.min(state.timer / SWAP_TIME, 1);
      const to = slotX(slot === a ? b : a);
      x += (to - x) * t;
      // One cup passes in front, the other behind.
      y += (slot === a ? 1 : -1) * Math.sin(t * Math.PI) * 40;
    }
  }
  const lifted =
    state.phase === 'placing' ||
    ((state.phase === 'revealing' || state.phase === 'over') &&
      (cup === state.quarterCup || cup === state.chosen));
  if (lifted) y -= LIFT;
  return { x, y };
}

/** The cup at (x, y) on the canvas, if any. */
export function cupAt(state: CupShuffleState, x: number, y: number): number | undefined {
  for (let cup = 0; cup < CUPS; cup++) {
    const pos = cupPosition(state, cup);
    if (Math.abs(x - pos.x) <= CUP_WIDTH / 2 && y <= pos.y && y >= pos.y - CUP_HEIGHT) return cup;
  }
  return undefined;
}

function drawCup(ctx: CanvasRenderingContext2D, x: number, y: number, highlight: boolean) {
  const { colors } = theme;
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x - CUP_WIDTH / 2, y);
  ctx.lineTo(x - CUP_WIDTH / 3, y - CUP_HEIGHT);
  ctx.lineTo(x + CUP_WIDTH / 3, y - CUP_HEIGHT);
  ctx.lineTo(x + CUP_WIDTH / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.stripeB;
  ctx.fillRect(x - CUP_WIDTH / 2 + 6, y - 30, CUP_WIDTH - 12, 10);
  if (highlight) {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function draw(ctx: CanvasRenderingContext2D, state: CupShuffleState, hover: number | undefined) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The table.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(60, CUP_Y, WIDTH - 120, 24);

  // The quarter, on the table under its cup's slot.
  const showQuarter = state.phase !== 'shuffling' && state.phase !== 'choosing';
  if (showQuarter) {
    const qx = slotX(state.slots[state.quarterCup]);
    ctx.fillStyle = colors.muted;
    ctx.beginPath();
    ctx.ellipse(qx, CUP_Y - 8, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let cup = 0; cup < CUPS; cup++) {
    const { x, y } = cupPosition(state, cup);
    const highlight =
      (state.phase === 'choosing' && cup === hover) ||
      ((state.phase === 'revealing' || state.phase === 'over') && cup === state.chosen);
    drawCup(ctx, x, y, highlight);
  }

  ctx.textAlign = 'center';
  ctx.font = canvasFont('title', 'bold');
  let message = '';
  if (state.phase === 'placing') message = 'Watch the quarter...';
  else if (state.phase === 'shuffling') message = 'Shuffling!';
  else if (state.phase === 'choosing') message = 'Which cup has the quarter?';
  else if (state.phase === 'revealing')
    message = guessedRight(state) ? `Found it! +${POINTS_PER_CORRECT}` : 'Not that one!';
  ctx.fillStyle =
    state.phase === 'revealing' && !guessedRight(state) ? colors.danger : colors.accent;
  ctx.fillText(message, WIDTH / 2, 90);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Guesses ${state.guesses}/${GUESSES_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Round over! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const cupShuffle: CarnivalGame = {
  id: 'cup-shuffle',
  name: 'Cup Shuffle',
  description: 'Keep your eye on the quarter as the cups shuffle, then pick the right cup.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    let hover: number | undefined;

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => {
      const { x, y } = toCanvas(event);
      hover = cupAt(state, x, y);
    };
    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const { x, y } = toCanvas(event);
      const cup = cupAt(state, x, y);
      if (cup !== undefined) guess(state, cup);
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the shuffle.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(cupShuffle.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, hover);
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

export default cupShuffle;
