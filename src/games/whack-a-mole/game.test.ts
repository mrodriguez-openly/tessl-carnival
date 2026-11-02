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

  it('ends a long step with the same moles up, in the same holes, as short steps', () => {
    // A seeded random, so each run picks holes the same way and the picks matter.
    const seeded = () => {
      let seed = 7;
      return () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
    };
    const run = (steps: number[]) => {
      const state = createState();
      const random = seeded();
      for (const dt of steps) step(state, dt, random);
      return state;
    };
    const active = (s: ReturnType<typeof createState>) =>
      s.holes.flatMap((h, index) => (h.up > 0 ? [{ index, up: h.up }] : []));

    const short = run(Array<number>(200).fill(0.05));
    const partitions = [[2.5, 2.5, 2.5, 2.5], [10], [0.3, 1.7, 0.01, 4.99, 3]];
    expect(active(short).length).toBeGreaterThan(0);
    for (const steps of partitions) {
      const long = run(steps);
      expect(long.elapsed).toBeCloseTo(short.elapsed, 9);
      expect(long.nextMole).toBeGreaterThan(0);
      expect(long.nextMole).toBeCloseTo(short.nextMole, 9);
      expect(active(long).map((h) => h.index)).toEqual(active(short).map((h) => h.index));
      active(long).forEach((h, i) => expect(h.up).toBeCloseTo(active(short)[i].up, 9));
    }

    // The case from review: with random always 0, the second mole goes in
    // hole 1, because hole 0 is still up when it is due.
    const long = createState();
    step(long, 2.5, () => 0);
    const steps = createState();
    for (let i = 0; i < 50; i++) step(steps, 0.05, () => 0);
    expect(active(long).map((h) => h.index)).toEqual([1]);
    expect(active(steps).map((h) => h.index)).toEqual([1]);

    // No backlog is left for a zero-length step to spawn.
    step(long, 0, () => 0);
    expect(active(long).map((h) => h.index)).toEqual([1]);
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
