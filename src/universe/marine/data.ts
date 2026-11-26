/**
 * Marine AI content — every claim is from Ushnish's resume / paper draft
 * ("Smart Marine Trash Detection Leveraging AI and IoT for Sustainable Oceans").
 * Debris placement, foam patches, the AUV track and drift curves on screen are
 * illustrative and labelled as such.
 */

export const MARINE = {
  title: "Marine AI",
  full: "Smart Marine Trash Detection — AI + IoT for sustainable oceans",
  paper: "Smart Marine Trash Detection Leveraging AI and IoT for Sustainable Oceans",
  authors: "Ushnish Ghosal, Keshav Gupta",
  status: "Under submission · 2025",
  context: "Department of Computing Technologies, SRMIST",
  keywords: ["Marine Debris Detection", "YOLOv8", "LSTM", "IoT Sensor Networks", "Edge AI", "AUV", "Geospatial Mapping", "Ocean Conservation"],
  stack: ["Python", "YOLOv8", "LSTM", "PyTorch", "OpenCV", "MQTT", "PostGIS", "NVIDIA Jetson"],
  metrics: [
    { value: "93.3%", label: "mAP · YOLOv8–LSTM" },
    { value: "92.5%", label: "Precision" },
    { value: "90.8%", label: "Recall" },
    { value: "7+ days", label: "Solar buoy, continuous" },
  ],
};

export type MStationId = "overview" | "buoy" | "detection" | "underwater" | "drift" | "system";
export type MStation = { id: MStationId; index: string; name: string; kicker: string; body: string[] };

export const MSTATIONS: MStation[] = [
  {
    id: "overview",
    index: "00",
    name: "Ocean debris, continuously watched",
    kicker: "Marine AI · overview",
    body: [
      "A hybrid AI–IoT framework: smart buoys, UAVs and AUVs fuse RGB, LiDAR and sonar streams for continuous, real-time marine debris detection.",
    ],
  },
  {
    id: "buoy",
    index: "01",
    name: "Smart buoy",
    kicker: "Solar · autonomous · IoT",
    body: ["Solar-powered autonomous buoy operation validated for more than 7 days continuously.", "End-to-end IoT latency of 1.8 s from sensor to cloud."],
  },
  {
    id: "detection",
    index: "02",
    name: "YOLOv8–LSTM detection",
    kicker: "Temporal filtering",
    body: [
      "92.5% precision, 90.8% recall, 93.3% mAP — 5.2 pp mAP above a YOLOv5 baseline.",
      "An LSTM temporal head adds +2.9 pp mAP over vanilla YOLOv8 by suppressing sea-foam false positives (grey boxes here).",
    ],
  },
  {
    id: "underwater",
    index: "03",
    name: "Below the surface",
    kicker: "AUV · sonar · edge AI",
    body: [
      "AUVs carry the same pipeline underwater, with heterogeneous sensor fusion (RGB, LiDAR, sonar) and edge-AI processing on NVIDIA Jetson.",
    ],
  },
  {
    id: "drift",
    index: "04",
    name: "72-hour drift forecasting",
    kicker: "Geospatial analytics",
    body: [
      "Cloud-hosted geospatial analytics with 72-hour drift forecasting (the curves here are illustrative).",
      "In field trials, autonomous surface vehicle response time fell from 4.1 h to 0.8 h.",
    ],
  },
  {
    id: "system",
    index: "05",
    name: "System",
    kicker: "AI + IoT stack",
    body: ["Python, PyTorch, YOLOv8 + LSTM and OpenCV on the edge; MQTT telemetry; PostGIS-backed geospatial mapping in the cloud."],
  },
];
