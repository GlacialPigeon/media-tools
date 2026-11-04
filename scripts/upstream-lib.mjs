// Shared by the upstream sync script and its tests. Pure functions only.
export const upstreamRepos = [
  "MediaCataloger",
  "MediaDiversitySampler",
  "MediaTrickplayGenerator",
];

// Applies the small, documented corrections from vendor/upstream/overrides.json
// to an upstream document. Every correction must match exactly once; if the
// upstream text changed so that it no longer does, the sync stops and says
// which correction can be dropped or must be revised.
export function applyOverrides(text, overrides = []) {
  let result = text.replace(/\r\n?/g, "\n");
  for (const { description, from, to } of overrides) {
    const parts = result.split(from);
    if (parts.length !== 2)
      throw new Error(
        `Override "${description}" matches ${parts.length - 1} times instead of once. ` +
          "Upstream probably changed: drop or revise the override.",
      );
    result = parts.join(to);
  }
  return result;
}
