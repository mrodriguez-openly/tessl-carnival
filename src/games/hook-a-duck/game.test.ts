import { describe, expect, it } from 'vitest';
import {
  CASTS_PER_ROUND,
  CATCH_RADIUS,
  DROP_TIME,
  DUCK_POINTS,
  STREAM,
  cast,
  createState,
  duckAt,
  duckPosition,
  step,
} from './game';

/** Casts at the spot where `duck` will be when the hook lands, then lets it land. */
function castAtDuck(state: ReturnType<typeof createState>, index: number, dx = 0) {
  const landing = duckPosition(state.ducks[index], state.time + DROP_TIME);
  cast(state, landing.x + dx, landing.y);
  step(state, DROP_TIME);
}

describe('hook a duck', () => {
  it('starts with every cast and no score', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.points)).toEqual([...DUCK_POINTS]);
  });

  it('floats the ducks round the stream in a loop', () => {
    const [duck] = createState().ducks;
    const start = duckPosition(duck, 0);
    const later = duckPosition(duck, 1);
    expect(later).not.toEqual(start);
    const lap = duckPosition(duck, (Math.PI * 2) / 0.5);
    expect(lap.x).toBeCloseTo(start.x);
    expect(lap.y).toBeCloseTo(start.y);
    expect(Math.abs(start.x - STREAM.x)).toBeLessThanOrEqual(STREAM.rx);
  });

  it('uses one cast per hook, and only one hook at a time', () => {
    const state = createState();
    expect(cast(state, 400, 300)).toBe(true);
    expect(state.casts).toBe(CASTS_PER_ROUND - 1);
    expect(cast(state, 400, 300)).toBe(false);
    expect(state.casts).toBe(CASTS_PER_ROUND - 1);
  });

  it("scores the number on a hooked duck's base", () => {
    const state = createState();
    const index = DUCK_POINTS.indexOf(50);
    castAtDuck(state, index);
    expect(state.score).toBe(50);
    expect(state.hook).toBeNull();
    expect(state.catches).toHaveLength(1);
  });

  it('scores nothing for a hook that misses every duck', () => {
    const state = createState();
    cast(state, STREAM.x, STREAM.y);
    step(state, DROP_TIME);
    expect(state.score).toBe(0);
    expect(state.casts).toBe(CASTS_PER_ROUND - 1);
  });

  it('only catches a duck within reach of the hook', () => {
    const { ducks } = createState();
    const p = duckPosition(ducks[0], 0);
    expect(duckAt(ducks, 0, p.x + CATCH_RADIUS - 1, p.y)).toBe(ducks[0]);
    expect(duckAt(ducks, 0, p.x + CATCH_RADIUS + 1, p.y)).toBeUndefined();
  });

  it('does not score until the hook reaches the water', () => {
    const state = createState();
    const landing = duckPosition(state.ducks[0], DROP_TIME);
    cast(state, landing.x, landing.y);
    step(state, DROP_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.hook).not.toBeNull();
  });

  it('catches the duck where it is when the hook lands, however the frames fall', () => {
    // Just inside reach at landing, but out of reach a few frames later.
    const dx = CATCH_RADIUS - 0.5;
    const landing = duckPosition(createState().ducks[0], DROP_TIME);
    for (const dt of [DROP_TIME, 0.04, 0.05, 0.03]) {
      const state = createState();
      cast(state, landing.x + dx, landing.y);
      while (state.hook) step(state, dt);
      expect(state.score, `steps of ${dt}s`).toBe(DUCK_POINTS[0]);
    }
  });

  it('resolves a catch the same way when the hook lands partway through a frame', () => {
    const scores = [
      [0.1, 0.45],
      [0.2, 0.2, 0.15],
      [0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.07],
    ].map((frames) => {
      const state = createState();
      state.time = 1;
      const landing = duckPosition(state.ducks[3], state.time + DROP_TIME);
      cast(state, landing.x + CATCH_RADIUS - 0.5, landing.y);
      for (const dt of frames) step(state, dt);
      expect(state.hook).toBeNull();
      return state.score;
    });
    expect(scores).toEqual([DUCK_POINTS[3], DUCK_POINTS[3], DUCK_POINTS[3]]);
  });

  it('ends the round once the last cast lands, and stops casting', () => {
    const state = createState();
    for (let i = 0; i < CASTS_PER_ROUND; i++) castAtDuck(state, i);
    expect(state.phase).toBe('over');
    expect(state.score).toBe(DUCK_POINTS.slice(0, CASTS_PER_ROUND).reduce((a, b) => a + b, 0));
    expect(cast(state, 400, 300)).toBe(false);
  });

  it('keeps playing while the last hook is still dropping', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 400, 300);
    step(state, DROP_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, DROP_TIME);
    expect(state.phase).toBe('over');
  });
});
