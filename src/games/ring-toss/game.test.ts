import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  SWAY,
  THROWER,
  bottleAt,
  createState,
  step,
  swayAt,
  throwRing,
} from './game';

/** Throws at (x, y) with the hand held still, then lets the ring land. */
function throwAndLand(state: ReturnType<typeof createState>, x: number, y: number) {
  state.time = 0;
  throwRing(state, x, y);
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('starts with every ring and no score', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles.length).toBeGreaterThan(0);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(throwRing(state, 400, 100)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.flying).toHaveLength(1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(throwRing(state, 400, 100)).toBe(false);
    expect(state.flying).toHaveLength(0);
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwAndLand(state, bottle.x, bottle.y);
    expect(state.score).toBe(bottle.points);
    expect(bottle.rings).toBe(1);
  });

  it('scores nothing for a ring that misses every bottle', () => {
    const state = createState();
    throwAndLand(state, 20, 450);
    expect(state.score).toBe(0);
    expect(state.misses).toHaveLength(1);
  });

  it('only scores once the ring has landed', () => {
    const state = createState();
    const bottle = state.bottles[0];
    state.time = 0;
    throwRing(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.flying).toHaveLength(1);
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = state.bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = state.bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('lands the ring off the aim by the sway', () => {
    const state = createState();
    state.time = Math.PI / 5; // the top of the sway
    throwRing(state, 400, 100);
    expect(state.flying[0].toX).toBeCloseTo(400 + SWAY);
    expect(swayAt(0)).toBe(0);
  });

  it('never throws backwards, even when aimed below the thrower', () => {
    const state = createState();
    throwRing(state, 400, THROWER.y + 50);
    expect(state.flying[0].toY).toBeLessThan(THROWER.y);
  });

  it('finds a bottle only within the neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    expect(bottleAt(state.bottles, bottle.x + NECK_RADIUS - 1, bottle.y)).toBe(bottle);
    expect(bottleAt(state.bottles, bottle.x + NECK_RADIUS + 1, bottle.y)).toBeUndefined();
  });

  it('ends the round when the last ring has landed', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) throwRing(state, 20, 450);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
    expect(throwRing(state, 400, 100)).toBe(false);
  });
});
