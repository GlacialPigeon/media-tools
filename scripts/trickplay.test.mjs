import { test } from "node:test";
import assert from "node:assert/strict";
import { spriteAt, valueFromPointer } from "../src/lib/trickplay.mjs";
const base = {
  intervalSeconds: 10,
  thumbnailCount: 64,
  columns: 10,
  rows: 10,
  thumbnailWidth: 640,
  thumbnailHeight: 360,
};
test("sheet and tile boundaries are selected without entering padded cells", () => {
  assert.deepEqual(spriteAt(base, 100), { index: 10, sheet: 0, x: 0, y: 360 });
  assert.deepEqual(spriteAt(base, 635), {
    index: 63,
    sheet: 0,
    x: 1920,
    y: 2160,
  });
  assert.equal(spriteAt(base, 9999).index, 63);
  assert.equal(spriteAt(base, -2).index, 0);
  assert.deepEqual(spriteAt({ ...base, thumbnailCount: 205 }, 1000), {
    index: 100,
    sheet: 1,
    x: 0,
    y: 0,
  });
  assert.deepEqual(spriteAt({ ...base, thumbnailCount: 205 }, 2045), {
    index: 204,
    sheet: 2,
    x: 2560,
    y: 0,
  });
});
test("each film retains its actual thumbnail aspect ratio and final cell", () => {
  const steel = { ...base, thumbnailHeight: 286, thumbnailCount: 74 };
  assert.deepEqual(spriteAt(steel, 734), {
    index: 73,
    sheet: 0,
    x: 1920,
    y: 2002,
  });
});
test("a pointer maps to a range value, with the thumb centre inside the track", () => {
  // track from x=100, 214 px wide, 14 px thumb: the centre travels 107..307
  assert.equal(valueFromPointer(107, 100, 214, 14, 600), 0);
  assert.equal(valueFromPointer(207, 100, 214, 14, 600), 300);
  assert.equal(valueFromPointer(307, 100, 214, 14, 600), 600);
  assert.equal(valueFromPointer(0, 100, 214, 14, 600), 0);
  assert.equal(valueFromPointer(9999, 100, 214, 14, 600), 600);
  assert.equal(valueFromPointer(100, 100, 10, 14, 600), 0); // track narrower than the thumb
});
