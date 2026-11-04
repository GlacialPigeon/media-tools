# Media Tools

The website for three independent Python terminal tools: **Media Trickplay Generator**, **Media Cataloger** and **Media Diversity Sampler**. It is a static [Astro](https://astro.build/) site, live at <https://glacialpigeon.github.io/media-tools/>. 

The tools themselves live in their own repositories: [MediaTrickplayGenerator](https://github.com/GlacialPigeon/MediaTrickplayGenerator), [MediaCataloger](https://github.com/GlacialPigeon/MediaCataloger) and [MediaDiversitySampler](https://github.com/GlacialPigeon/MediaDiversitySampler).

## Develop

Needs Node.js 26.13.0 or newer.

```sh
npm ci
npm run dev                  # local server
npm run dev -- --host ip     # local server with ip
npm run build                # static site in dist/
npm test                     # unit tests and checks on the built site
```

## Where things are

- `src/data/tools.ts`: the facts shown for each tool (features, requirements, steps, limits).
- `src/pages/tools/[slug].astro`: the Overview of a tool. Guide and Technical are tabs on the same page (`ProductGuide.astro`, `ProductTechnical.astro`). The old `guides/`, `technical/` and `downloads` URLs only redirect.
- `src/data/library-test.ts`: file count, hardware and timings of the author's own library test.
- `src/components/FAQ.astro`: the FAQ.
- `public/media/`, `public/reports/`: images, walkthrough videos, sprite sheets and example Cataloger reports. The site finds them by file name when it is built, so replacing a file needs no code change. Names: `<slug>-terminal.webp`, `<slug>-walkthrough.webp`, `videos/<slug>.mp4`, `media-tools-social.png` (1200 × 630), the two film posters, and `trickplay/<film>/` (sprite sheets as numbered JPEGs plus `preview.json`).

## Technical reference

The Technical tab of each tool is the tool's own `technical.md`, copied to `vendor/upstream/<Repo>/technical.md` and rendered at build time. `vendor/upstream/revisions.json` records which revision each copy comes from.

- `npm run check:upstream` compares the copies with each repository's `main` (a weekly workflow runs it). If a copy is out of date, run `npm run sync:upstream`, read the diff and commit it.
- `vendor/upstream/overrides.json` holds small corrections applied to the upstream text on every sync. An override that no longer matches is reported and should be deleted.
- The Guide tab is written for the website, so a change to a tool's setup steps has to be mirrored there by hand.

## Credits and third-party material

- **Films.** The preview thumbnails and posters on the Trickplay Generator page are scaled excerpts of two open movies, cropped to a grid and saved as JPEG. Both are licensed under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). The credit is also shown on the page.
  - Big Buck Bunny: © 2008, Blender Foundation / [www.bigbuckbunny.org](https://www.bigbuckbunny.org/)
  - Tears of Steel: (CC) Blender Foundation | [mango.blender.org](https://mango.blender.org/)
- **Software.** [Astro](https://astro.build/) (MIT License) generates the site; Prettier is used for formatting. Their license texts are in `node_modules` after `npm ci`.
- **Independent projects.** Not affiliated with Jellyfin. The tools are separate projects with their own licenses.

## Privacy

No analytics, trackers, remote fonts or embedded third-party media. The only thing the site stores is the installation platform you pick, in your browser's local storage.

## License

The website source is MIT licensed; see [LICENSE](LICENSE). The films and software above keep their own licenses.
