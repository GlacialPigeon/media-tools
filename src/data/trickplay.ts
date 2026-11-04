import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { findAsset } from "../lib/media.mjs";
const names = [
  ["big-buck-bunny", "Big Buck Bunny"],
  ["tears-of-steel", "Tears of Steel"],
];
export const trickplayVideos = names.map(([slug, title]) => {
  const root = `public/media/trickplay/${slug}`;
  const metadata = JSON.parse(readFileSync(`${root}/preview.json`, "utf8"));
  for (const key of [
    "durationSeconds",
    "intervalSeconds",
    "thumbnailCount",
    "columns",
    "rows",
    "thumbnailWidth",
    "thumbnailHeight",
  ]) {
    if (
      !Number.isFinite(metadata[key]) ||
      metadata[key] <= 0 ||
      (key !== "durationSeconds" && !Number.isInteger(metadata[key]))
    )
      throw new Error(`${slug}: invalid ${key}`);
  }
  if (
    metadata.thumbnailCount !==
    Math.ceil(metadata.durationSeconds / metadata.intervalSeconds)
  )
    throw new Error(`${slug}: duration/interval does not match thumbnailCount`);
  const folders = readdirSync(root).filter((name) =>
    name.endsWith(".trickplay"),
  );
  if (folders.length !== 1)
    throw new Error(`${slug}: expected one .trickplay folder`);
  const directory = `${root}/${folders[0]}/${metadata.thumbnailWidth} - ${metadata.columns}x${metadata.rows}`;
  const files = readdirSync(directory)
    .filter((name) => /^\d+\.jpg$/i.test(name))
    .sort((a, b) => parseInt(a) - parseInt(b));
  const count = Math.ceil(
    metadata.thumbnailCount / (metadata.columns * metadata.rows),
  );
  if (
    files.length < count ||
    files.slice(0, count).some((file, i) => parseInt(file) !== i)
  )
    throw new Error(`${slug}: missing numbered sprite sheets`);
  return {
    slug,
    title,
    ...metadata,
    poster: `media/${findAsset(`trickplay-${slug}-preview`).file}`,
    sheets: files
      .slice(0, count)
      .map((file) => path.posix.join(directory.replace(/^public\//, ""), file)),
  };
});
