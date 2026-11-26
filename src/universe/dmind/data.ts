/**
 * D-MIND content — every claim is from Ushnish's resume / paper draft.
 * The terrain is real elevation (Western Ghats, Kerala) used as a setting only;
 * hazards placed on it and the on-screen detections are illustrative.
 */

export const DMIND = {
  title: "D-MIND",
  full: "Disaster Monitoring Intelligent Detection System",
  paper: "D-MIND: A Unified AI Framework for UAV-Based Landmine Detection and Landslide Segmentation",
  authors: "Keshav Gupta, Ushnish Ghosal, G. Niranjana",
  status: "Under submission · 2026",
  context: "Department of Computing Technologies, SRMIST",
  keywords: ["UAV", "YOLOv12", "SegFormer", "Landmine Detection", "Landslide Segmentation", "Edge AI", "Disaster Management"],
  stack: ["Python", "PyTorch", "YOLOv12", "SegFormer", "Flask", "SQLite", "HuggingFace", "Ultralytics"],
  project: "Project · Jan 2026",
  metrics: [
    { value: "0.979", label: "Landmine mAP@0.5" },
    { value: "≈80.5%", label: "Landslide mIoU" },
    { value: "0.93", label: "Human mAP@0.5 (COCO 2017)" },
    { value: "≈8 ms", label: "YOLOv12 per image" },
  ],
  setting: "Terrain: real elevation, Western Ghats near Wayanad, Kerala (setting only). Hazards and detections shown here are illustrative.",
};

export type DStationId = "overview" | "drone" | "minefield" | "landslide" | "incident" | "system";

export type DStation = { id: DStationId; index: string; name: string; kicker: string; body: string[] };

export const DSTATIONS: DStation[] = [
  {
    id: "overview",
    index: "00",
    name: "Aerial hazard analysis",
    kicker: "D-MIND · overview",
    body: [
      "A unified aerial framework: YOLOv12 for small-object detection and SegFormer for semantic terrain segmentation, in one disaster-response pipeline.",
      "Real-time detection of four target types: humans, fire, landslides and landmines.",
    ],
  },
  {
    id: "drone",
    index: "01",
    name: "UAV platform",
    kicker: "Edge AI",
    body: [
      "Validated on an NVIDIA RTX 4060; the framework is designed for future NVIDIA Jetson edge deployment and full UAV onboard integration.",
    ],
  },
  {
    id: "minefield",
    index: "02",
    name: "Landmine detection",
    kicker: "YOLOv12 · small objects",
    body: ["Landmine detector: mAP@0.5 = 0.979 on 11,564 annotated instances.", "Boxes on screen show the detector's output format; placements here are illustrative."],
  },
  {
    id: "landslide",
    index: "03",
    name: "Landslide segmentation",
    kicker: "SegFormer · semantic terrain",
    body: ["Landslide segmentation reached mIoU ≈ 80.5% across ~8,000 aerial images.", "The violet mask is a segmentation overlay on the slide scar."],
  },
  {
    id: "incident",
    index: "04",
    name: "Fire and human detection",
    kicker: "Auxiliary modules",
    body: [
      "Fire detection: box / mask mAP@0.5 = 0.876 / 0.880. Human detection: P = 0.91, R = 0.88, mAP@0.5 = 0.93 (COCO 2017).",
      "YOLOv12 outperformed YOLOv8 and YOLOv9 on human detection in both accuracy and inference speed (~8.0 ms/image).",
    ],
  },
  {
    id: "system",
    index: "05",
    name: "Deployment",
    kicker: "All hazards · one pipeline",
    body: [
      "All four target types on one map. The drone loops between sites, and each site's detections light up while it is being scanned (illustrative flight).",
      "Conditional inference routing dispatches inputs by colour / grayscale characteristics for latency optimisation; Flask REST API, SQLite event logging and a real-time monitoring dashboard.",
    ],
  },
];
