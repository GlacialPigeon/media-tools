export function spriteAt(metadata, seconds) {
  const index = Math.max(
    0,
    Math.min(
      metadata.thumbnailCount - 1,
      Math.floor(Math.max(0, seconds) / metadata.intervalSeconds),
    ),
  );
  const capacity = metadata.columns * metadata.rows;
  const cell = index % capacity;
  return {
    index,
    sheet: Math.floor(index / capacity),
    x: (cell % metadata.columns) * metadata.thumbnailWidth,
    y: Math.floor(cell / metadata.columns) * metadata.thumbnailHeight,
  };
}

// The range value under a pointer. The thumb centre travels from half a thumb
// in to half a thumb short of the far end of the track, so the position is
// measured on that shorter span. `left` and `width` are the track's box.
export function valueFromPointer(x, left, width, thumb, max) {
  const span = Math.max(1, width - thumb);
  const fraction = Math.min(1, Math.max(0, (x - left - thumb / 2) / span));
  return Math.round(fraction * max);
}
