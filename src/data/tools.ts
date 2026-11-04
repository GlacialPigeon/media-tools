export const tools = [
  {
    slug: "trickplay-generator",
    repo: "MediaTrickplayGenerator",
    name: "Media Trickplay Generator",
    short: "Trickplay Generator",
    icon: "▤",
    color: "violet",
    tag: "PREPARE",
    headline: "A better preview.\nA lighter server.",
    description:
      "Create Jellyfin seek-bar previews on your PC. Give your media server more room to do what it does best: play your movies.",
    features: [
      [
        "Your PC does the work",
        "Generate sprite sheets beside your videos with FFmpeg and Pillow. Use the CPU or optional GPU acceleration.",
      ],
      [
        "Measured on your hardware",
        "Benchmark your own videos to compare CPU and GPU paths. Apply suggested settings only when you choose.",
      ],
      [
        "Built to resume",
        "Valid output is skipped. New output is staged and validated before replacing existing previews.",
      ],
      [
        "Storage-aware processing",
        "Group work by physical storage, with separate concurrency settings for hard disks and SSDs.",
      ],
    ],
    requirements:
      "Python 3.10+, FFmpeg, FFprobe and Pillow. Jellyfin: enable “Save trickplay images next to media”.",
    steps: [
      "Add the folders that hold your movies and shows under Configuration → Library → Media folders.",
      "Run Benchmark → CPU vs GPU benchmark. It tests a few of your own videos and suggests settings. Accept what it suggests. This takes a while, and you do it once.",
      "Choose Generate / Resume trickplay. It shows what it is going to do and how much disk space it needs, and asks once before it starts.",
      "Use Verify existing trickplay to inspect every output image.",
    ],
    limits:
      "GPU support depends on the video, FFmpeg build and hardware. Intel Quick Sync (QSV) and Linux VAAPI are included but have not been tested on real hardware yet. Run the benchmark and self-test on your system.",
  },
  {
    slug: "cataloger",
    repo: "MediaCataloger",
    name: "Media Cataloger",
    short: "Cataloger",
    icon: "▦",
    color: "teal",
    tag: "UNDERSTAND",
    headline: "Know your library.\nDown to the stream.",
    description:
      "Turn local and network media folders into a detailed inventory of what you own, with Excel, JSON and TXT reports.",
    features: [
      [
        "The whole picture",
        "Inspect codecs, resolution, HDR, audio, subtitles, languages, duration and bitrate through FFprobe.",
      ],
      [
        "Scan what changed",
        "Reuse metadata for unchanged files. Force Reprobe when you need fresh analysis.",
      ],
      [
        "One source, many paths",
        "Recognize equivalent storage paths so mapped drives and their network aliases do not become separate libraries.",
      ],
      [
        "Reports you can use",
        "Export combined, separate or single-source reports. Excel requires XlsxWriter; JSON and TXT do not.",
      ],
    ],
    requirements:
      "Python 3.10+ and FFprobe. XlsxWriter is optional and needed only for Excel reports.",
    steps: [
      "Open Configuration → Paths → Add Source and add the folders that hold your media. You can also import a list from a text file.",
      "Choose Scan Media → Start Scan. The first scan analyzes everything and takes a while; later scans only look at what changed.",
      "Open Generate Reports and select format (Excel, JSON, TXT or all) and scope.",
      "Find the results under reports/, grouped by date.",
    ],
    limits:
      "Missing FFprobe metadata stays unknown. Offline or inaccessible sources are skipped rather than treated as mass deletions. Classification is based on reported metadata; it is not a visual quality assessment.",
  },
  {
    slug: "diversity-sampler",
    repo: "MediaDiversitySampler",
    name: "Media Diversity Sampler",
    short: "Diversity Sampler",
    icon: "◈",
    color: "amber",
    tag: "SELECT",
    headline: "Less copying.\nMore variety.",
    description:
      "Build a small, varied test library from your own videos. Keep the unusual codecs, HDR types and combinations that random picking can miss.",
    features: [
      [
        "Diversity with a reason",
        "Score candidates by new properties and combinations. See why each file was selected.",
      ],
      [
        "Choose your pool",
        "Select all videos, SDR, HDR or uncertain files. Missing metadata is never filled in with guesses.",
      ],
      [
        "Preview before copying",
        "Review the selection and recommended minimum before building an output library.",
      ],
      [
        "Stop. Resume. Continue.",
        "Build manifests track the copy plan. Completed files are checked by length; partial copies are copied again.",
      ],
    ],
    requirements:
      "Python 3.10+ and FFprobe. No additional Python package is required.",
    steps: [
      "Open Configuration → Media Sources → Add Source and add the folders that hold your videos. You can also import a list from a text file.",
      "Open Configuration → Outputs → Add Output and add the folder where the test library should be built.",
      "Run Scan Media. The first scan reads every file; later scans are quick.",
      "Choose Selection — ALL, SDR, HDR or Uncertain. It shows the recommended minimum and asks how many files you want.",
      "Review Preview, then choose Build / Resume.",
    ],
    limits:
      "The recommended minimum is the algorithm’s coverage recommendation, not a proof of the mathematical smallest set. Selection is deterministic for the same library and quantity. Copy validation checks length, not a cryptographic content hash. Linux real-share acceptance remains a check for your own system.",
  },
];
export const github = "https://github.com/GlacialPigeon/";
