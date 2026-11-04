import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { imageSize, videoSize } from "../src/lib/media.mjs";

const dir = mkdtempSync(path.join(tmpdir(), "media-"));
const write = (name, data) => {
  const file = path.join(dir, name);
  writeFileSync(file, data);
  return file;
};

test("PNG size comes from the IHDR chunk", () => {
  const data = Buffer.alloc(33);
  data.writeUInt32BE(900, 16);
  data.writeUInt32BE(500, 20);
  assert.deepEqual(imageSize(write("a.png", data)), {
    width: 900,
    height: 500,
  });
});

test("lossy, lossless and extended WebP sizes", () => {
  const lossy = Buffer.alloc(40);
  lossy.write("VP8 ", 12, "ascii");
  lossy.writeUInt16LE(1193, 26);
  lossy.writeUInt16LE(670, 28);
  assert.deepEqual(imageSize(write("lossy.webp", lossy)), {
    width: 1193,
    height: 670,
  });

  const lossless = Buffer.alloc(40);
  lossless.write("VP8L", 12, "ascii");
  lossless.writeUInt32LE((700 - 1) | ((400 - 1) << 14), 21);
  assert.deepEqual(imageSize(write("lossless.webp", lossless)), {
    width: 700,
    height: 400,
  });

  const extended = Buffer.alloc(40);
  extended.write("VP8X", 12, "ascii");
  extended.writeUIntLE(1000 - 1, 24, 3);
  extended.writeUIntLE(600 - 1, 27, 3);
  assert.deepEqual(imageSize(write("ext.webp", extended)), {
    width: 1000,
    height: 600,
  });
});

test("JPEG size comes from the first frame header", () => {
  const data = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b,
    0x08, 0x01, 0x90, 0x03, 0x20,
  ]);
  assert.deepEqual(imageSize(write("a.jpg", data)), {
    width: 800,
    height: 400,
  });
});

test("SVG size comes from the viewBox", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"></svg>';
  assert.deepEqual(imageSize(write("a.svg", svg)), {
    width: 1200,
    height: 630,
  });
});

test("unreadable files fall back to 16:9", () => {
  assert.deepEqual(imageSize(path.join(dir, "missing.png")), {
    width: 1200,
    height: 675,
  });
});

test("MP4 size comes from the track header", () => {
  const box = Buffer.alloc(92);
  box.writeUInt32BE(92, 0);
  box.write("tkhd", 4, "ascii");
  box.writeUInt32BE(1920 << 16, 84);
  box.writeUInt32BE(1080 << 16, 88);
  assert.deepEqual(videoSize(write("a.mp4", box)), {
    width: 1920,
    height: 1080,
  });
});
