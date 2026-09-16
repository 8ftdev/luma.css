import { expect, test } from 'bun:test';
import { lighting, normalizeLight } from '../src/light.js';

const rect = { left: 100, top: 200, width: 200, height: 100 };
const source = { x: 200, y: 250, z: 240, intensity: 1 };

test('elevation strengthens otherwise identical material without changing light position', () => {
  const base = lighting(rect, source, 1);
  const raised = lighting(rect, source, 2);
  expect(raised.gain).toBeGreaterThan(base.gain);
  expect(raised.x).toBe(base.x);
  expect(raised.y).toBe(base.y);
});
test('light coordinates are relative to each surface, including an outside light', () => {
  expect(lighting(rect, source, 0).x).toBe(100);
  expect(lighting(rect, source, 0).y).toBe(50);
  expect(lighting(rect, { ...source, x: 50 }, 0).x).toBe(-50);
});
test('higher virtual light is broader and weaker', () => {
  const near = lighting(rect, source, 0);
  const far = lighting(rect, { ...source, z: 480 }, 0);
  expect(far.radius).toBeGreaterThan(near.radius);
  expect(far.gain).toBeLessThan(near.gain);
});
test('zero intensity is off and extreme elevations remain bounded', () => {
  expect(lighting(rect, { ...source, intensity: 0 }, 2).gain).toBe(0);
  expect(lighting(rect, source, 10000).gain).toBeLessThanOrEqual(3);
});
test('partial updates retain coordinates, zero is valid, invalid input is rejected', () => {
  expect(normalizeLight({ x: 0 }, source)).toEqual({ ...source, x: 0 });
  for (const bad of [{ x: NaN }, { y: Infinity }, { z: 0 }, { intensity: -1 }]) {
    expect(() => normalizeLight(bad, source)).toThrow(RangeError);
  }
});
