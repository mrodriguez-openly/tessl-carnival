import { describe, expect, it } from 'vitest';
import {
  CUPS,
  GUESSES_PER_ROUND,
  PLACE_TIME,
  POINTS_PER_CORRECT,
  REVEAL_TIME,
  SWAPS_PER_GUESS,
  SWAP_TIME,
  applySwap,
  createState,
  cupAt,
  cupPosition,
  cupInSlot,
  guess,
  planSwaps,
  step,
} from './game';

/** A repeatable stand-in for Math.random. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Runs the placing and the shuffle so the cups are ready for a guess. */
function toChoosing(state: ReturnType<typeof createState>) {
  step(state, PLACE_TIME);
  for (let i = 0; i < SWAPS_PER_GUESS; i++) step(state, SWAP_TIME);
}

describe('cup shuffle', () => {
  it('starts by showing the quarter under one of three cups', () => {
    const state = createState(seeded());
    expect(state.slots).toEqual([0, 1, 2]);
    expect(state.quarterCup).toBeGreaterThanOrEqual(0);
    expect(state.quarterCup).toBeLessThan(CUPS);
    expect(state.score).toBe(0);
    expect(state.guesses).toBe(0);
    expect(state.phase).toBe('placing');
    expect(state.swaps).toHaveLength(SWAPS_PER_GUESS);
  });

  it('plans swaps between two different slots', () => {
    for (const [a, b] of planSwaps(200, seeded(7))) {
      expect(a).not.toBe(b);
      expect([a, b].every((s) => s >= 0 && s < CUPS)).toBe(true);
    }
  });

  it('swaps the cups in two slots and leaves the third', () => {
    const slots = [0, 1, 2];
    applySwap(slots, [0, 2]);
    expect(slots).toEqual([2, 1, 0]);
  });

  it('shuffles after placing, then waits for a guess', () => {
    const state = createState(seeded());
    step(state, PLACE_TIME / 2);
    expect(state.phase).toBe('placing');
    step(state, PLACE_TIME / 2);
    expect(state.phase).toBe('shuffling');
    expect(guess(state, 0)).toBe(false);
    for (let i = 0; i < SWAPS_PER_GUESS; i++) step(state, SWAP_TIME);
    expect(state.phase).toBe('choosing');
  });

  it('keeps the quarter with its cup through the shuffle', () => {
    const state = createState(seeded(3));
    const slots = [0, 1, 2];
    for (const swap of state.swaps) applySwap(slots, swap);
    toChoosing(state);
    expect(state.slots).toEqual(slots);
    expect(cupInSlot(state, state.slots[state.quarterCup])).toBe(state.quarterCup);
  });

  it('scores 2 points for the cup with the quarter', () => {
    const state = createState(seeded());
    toChoosing(state);
    expect(guess(state, state.quarterCup)).toBe(true);
    expect(state.score).toBe(POINTS_PER_CORRECT);
    expect(state.guesses).toBe(1);
    expect(state.phase).toBe('revealing');
  });

  it('scores nothing for a wrong cup', () => {
    const state = createState(seeded());
    toChoosing(state);
    guess(state, (state.quarterCup + 1) % CUPS);
    expect(state.score).toBe(0);
    expect(state.guesses).toBe(1);
  });

  it('takes one guess per shuffle', () => {
    const state = createState(seeded());
    toChoosing(state);
    guess(state, state.quarterCup);
    expect(guess(state, state.quarterCup)).toBe(false);
    expect(state.score).toBe(POINTS_PER_CORRECT);
  });

  it('places the quarter again after the reveal', () => {
    const state = createState(seeded());
    toChoosing(state);
    guess(state, 0);
    step(state, REVEAL_TIME);
    expect(state.phase).toBe('placing');
    expect(state.chosen).toBeNull();
  });

  it('ends the round after 5 guesses', () => {
    const state = createState(seeded());
    for (let i = 0; i < GUESSES_PER_ROUND; i++) {
      toChoosing(state);
      guess(state, state.quarterCup);
      step(state, REVEAL_TIME);
    }
    expect(state.phase).toBe('over');
    expect(state.score).toBe(GUESSES_PER_ROUND * POINTS_PER_CORRECT);
    expect(guess(state, 0)).toBe(false);
  });

  it('finds the cup under the pointer', () => {
    const state = createState(seeded());
    toChoosing(state);
    const pos = cupPosition(state, 1);
    expect(cupAt(state, pos.x, pos.y - 10)).toBe(1);
    expect(cupAt(state, 5, 5)).toBeUndefined();
  });
});
