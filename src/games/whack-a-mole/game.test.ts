import { describe, expect, it } from 'vitest';
import {
  HOLE_RADIUS,
  POINTS_PER_MOLE,
  ROUND_SECONDS,
  createState,
  spawnInterval,
  step,
  timeLeft,
  upTime,
  whack,
} from './game';

/** Where to click to hit the mole in a hole. */
const moleAt = (hole: { x: number; y: number }) => ({ x: hole.x, y: hole.y - HOLE_RADIUS * 0.4 });

describe('whack-a-mole', () => {
  it('starts with no moles up, no score and a full clock', () => {
    const state = createState();
    expect(state.holes).toHaveLength(9);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
    expect(state.score).toBe(0);
    expect(timeLeft(state)).toBe(ROUND_SECONDS);
    expect(state.phase).toBe('playing');
  });

  it('pops a mole up after the first interval', () => {
    const state = createState();
    step(state, 0.5, () => 0);
    expect(state.holes.some((h) => h.up > 0)).toBe(false);
    step(state, 0.6, () => 0);
    expect(state.holes[0].up).toBeGreaterThan(0);
  });

  it('catches up on every pop-up that falls due during a long step', () => {
    const long = createState();
    step(long, 2.5, () => 0);
    const short = createState();
    for (let i = 0; i < 50; i++) step(short, 0.05, () => 0);

    expect(long.nextMole).toBeGreaterThan(0);
    expect(long.nextMole).toBeCloseTo(short.nextMole, 6);
    const ups = (s: typeof long) =>
      s.holes
        .map((h) => h.up)
        .filter((up) => up > 0)
        .sort();
    expect(ups(long)).toHaveLength(ups(short).length);
    ups(long).forEach((up, i) => expect(up).toBeCloseTo(ups(short)[i], 6));

    // No backlog is left for a zero-length step to spawn.
    const before = ups(long).length;
    step(long, 0, () => 0);
    expect(ups(long)).toHaveLength(before);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    state.holes[4].up = 0.5;
    step(state, 0.3);
    expect(state.holes[4].up).toBeGreaterThan(0);
    step(state, 0.3);
    expect(state.holes[4].up).toBe(0);
  });

  it('scores for whacking a mole that is up, and sends it down', () => {
    const state = createState();
    state.holes[2].up = 1;
    const { x, y } = moleAt(state.holes[2]);
    expect(whack(state, x, y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(state.holes[2].up).toBe(0);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_MOLE);
  });

  it('does not score for whacking an empty hole or missing', () => {
    const state = createState();
    state.holes[0].up = 1;
    const empty = moleAt(state.holes[1]);
    expect(whack(state, empty.x, empty.y)).toBe(false);
    expect(whack(state, 5, 5)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('pops moles faster, for less time, as the round goes on', () => {
    expect(spawnInterval(ROUND_SECONDS)).toBeLessThan(spawnInterval(0));
    expect(spawnInterval(ROUND_SECONDS / 2)).toBeLessThan(spawnInterval(0));
    expect(upTime(ROUND_SECONDS)).toBeLessThan(upTime(0));
  });

  it('ends the round when the clock runs out, with every mole down', () => {
    const state = createState();
    for (let t = 0; t < ROUND_SECONDS - 0.05; t += 0.05) step(state, 0.05, () => 0.5);
    expect(state.phase).toBe('playing');
    step(state, 0.1);
    expect(state.phase).toBe('over');
    expect(timeLeft(state)).toBe(0);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('cannot whack once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    state.holes[0].up = 1;
    const { x, y } = moleAt(state.holes[0]);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
