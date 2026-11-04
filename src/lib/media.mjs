import { existsSync, readFileSync } from "node:fs";

// Build-time lookup of replaceable media in public/media. The best format
// found wins (WebP, then PNG and JPEG, then the SVG illustration), so a real
// screenshot dropped into the folder is used without any code change. Paths
// are relative to the project root, as in src/data/trickplay.ts.
const defaultExtensions = ["webp", "png", "jpg", "svg"];
const fallbackSize = { width: 1200, height: 675 };

// Pixel size of an image file, read from its header so that the page can
// reserve the right space for screenshots of any shape. Falls back to 16:9.
export function imageSize(path) {
  try {
    const data = readFileSync(path);
    if (path.endsWith(".png"))
      return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    if (path.endsWith(".webp")) {
      const kind = data.toString("ascii", 12, 16);
      if (kind === "VP8 ")
        return {
          width: data.readUInt16LE(26) & 0x3fff,
          height: data.readUInt16LE(28) & 0x3fff,
        };
      if (kind === "VP8L") {
        const bits = data.readUInt32LE(21);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
      if (kind === "VP8X")
        return {
          width: data.readUIntLE(24, 3) + 1,
          height: data.readUIntLE(27, 3) + 1,
        };
    }
    if (path.endsWith(".jpg")) {
      let i = 2;
      while (i + 8 < data.length) {
        if (data[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = data[i + 1];
        if (marker >= 0xc0 && marker <= 0xc2)
          return {
            height: data.readUInt16BE(i + 5),
            width: data.readUInt16BE(i + 7),
          };
        i += 2 + data.readUInt16BE(i + 2);
      }
    }
    if (path.endsWith(".svg")) {
      const box = data
        .toString("utf8", 0, 600)
        .match(/viewBox="[\d.\s-]*?([\d.]+)[\s,]+([\d.]+)"/);
      if (box)
        return { width: Math.round(+box[1]), height: Math.round(+box[2]) };
    }
  } catch {}
  return fallbackSize;
}

export function findAsset(stem, extensions = defaultExtensions) {
  for (const extension of extensions) {
    if (existsSync(`public/media/${stem}.${extension}`))
      return {
        file: `${stem}.${extension}`,
        real: extension !== "svg",
        ...imageSize(`public/media/${stem}.${extension}`),
      };
  }
  throw new Error(
    `Missing media asset: public/media/${stem}.(${extensions.join("|")})`,
  );
}

// Pixel size of an MP4, read from the track header box (tkhd) so the video
// box has the video's own shape whatever the still image looks like.
export function videoSize(path) {
  try {
    const data = readFileSync(path);
    let at = data.indexOf("tkhd", 0, "ascii");
    while (at !== -1) {
      const start = at - 4;
      const end = start + data.readUInt32BE(start);
      const width = data.readUInt32BE(end - 8) >>> 16;
      const height = data.readUInt32BE(end - 4) >>> 16;
      if (width && height) return { width, height };
      at = data.indexOf("tkhd", at + 4, "ascii");
    }
  } catch {}
  return fallbackSize;
}

// Optional walkthrough video: public/media/videos/<slug>.mp4
export function findVideo(slug) {
  const file = `videos/${slug}.mp4`;
  return existsSync(`public/media/${file}`) ? file : undefined;
}
