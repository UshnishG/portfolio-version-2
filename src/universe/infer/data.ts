/**
 * INFER content. Every claim here comes from Ushnish's resume / paper draft.
 * Nothing invented: where the scene shows illustrative motion (pulses, the log
 * ticker), the UI labels it as illustrative.
 */

export const INFER = {
  title: "INFER",
  full: "Intelligent Network Fault Evaluation & Resolution",
  paper: "INFER: Agentic LLMs for FCAPS – A Real-Time, Multi-Model Framework for Intelligent Network Observability",
  status: "Under submission · 2025",
  context: "Samsung R&D collaboration · SRM Institute of Science and Technology",
  role: "Prism Research Intern, Samsung R&D Institute Bangalore · Nov 2024 – Jul 2025",
  stack: ["Python", "Go", "Phi-2", "Mistral 7B", "DeepSeek R1 8B", "FAISS", "Redis", "TimescaleDB", "LSTM"],
  metrics: [
    { value: "98.4%", label: "FCAPS classification accuracy" },
    { value: "<300 ms", label: "End-to-end latency · 50,000 synthetic logs" },
    { value: "86.4%", label: "Anomaly prediction F1 (LSTM)" },
  ],
  baseline: "Traditional FCAPS methods: >1000 ms, 78% accuracy",
};

export type StationId = "overview" | "ingress" | "phi2" | "mistral" | "deepseek" | "storage" | "forecast";

export type Station = {
  id: StationId;
  index: string;
  name: string;
  kicker: string;
  body: string[];
  /** world-space point the camera frames */
  target: [number, number, number];
  /** camera position for this station */
  camera: [number, number, number];
};

export const STATIONS: Station[] = [
  {
    id: "overview",
    index: "00",
    name: "Network operations centre",
    kicker: "INFER · overview",
    body: [
      "A deployable multi-model LLM pipeline for real-time FCAPS network observability: Fault, Configuration, Accounting, Performance and Security.",
      "Logs flow down the aisle through three models, then into hybrid storage and an LSTM forecaster.",
    ],
    target: [0, 0.9, -6],
    camera: [-1.4, 1.75, 6.2],
  },
  {
    id: "ingress",
    index: "01",
    name: "Synthetic log engine",
    kicker: "Go · telemetry at scale",
    body: [
      "Built the Go-based synthetic log generation engine producing structured telemetry at scale for model training and validation.",
      "Applied LLMs and GANs for synthetic network data generation to augment anomaly-detection training sets.",
    ],
    target: [0, 0.75, 1],
    camera: [-1.9, 1.45, 3.6],
  },
  {
    id: "phi2",
    index: "02",
    name: "Phi-2 · classification",
    kicker: "FCAPS routing",
    body: [
      "Phi-2 classifies each log into one of the five FCAPS categories — the five lanes fanning out of this unit.",
      "98.4% FCAPS classification accuracy.",
    ],
    target: [0.1, 0.55, -2.9],
    camera: [2.3, 1.75, 0.9],
  },
  {
    id: "mistral",
    index: "03",
    name: "Mistral 7B · summarisation",
    kicker: "Multi-model orchestration",
    body: [
      "Mistral 7B handles summarisation in the pipeline.",
      "Designed and implemented the multi-model orchestration pipeline integrating Phi-2, Mistral 7B and DeepSeek R1 8B.",
    ],
    target: [0, 0.95, -5.4],
    camera: [-2.0, 1.55, -2.7],
  },
  {
    id: "deepseek",
    index: "04",
    name: "DeepSeek R1 8B · deep reasoning",
    kicker: "Fault diagnosis",
    body: [
      "DeepSeek R1 8B performs deep reasoning for real-time LLM-driven fault diagnosis.",
      "End-to-end: sub-300 ms on 50,000 synthetic network logs, versus >1000 ms and 78% accuracy for traditional FCAPS methods.",
    ],
    target: [0, 1.05, -8.8],
    camera: [2.1, 1.7, -5.9],
  },
  {
    id: "storage",
    index: "05",
    name: "Hybrid vector storage",
    kicker: "FAISS · Redis · TimescaleDB",
    body: [
      "Architected a hybrid store: FAISS vector DB for semantic retrieval, Redis cache, and TimescaleDB for time-series forecasting.",
      "Sub-50 ms semantic retrieval across millions of log vectors.",
    ],
    target: [1.25, 1.0, -12.4],
    camera: [-1.6, 2.5, -7.4],
  },
  {
    id: "forecast",
    index: "06",
    name: "LSTM anomaly forecaster",
    kicker: "Predictive analytics",
    body: [
      "An LSTM-based predictive module for anomaly prediction, fed by the time-series store.",
      "86.4% F1 on anomaly prediction, with a 2–6 hour useful forecast horizon.",
    ],
    target: [3.0, 1.75, -11.7],
    camera: [0.5, 1.85, -8.9],
  },
];

/** FCAPS lanes leaving the classifier. */
export const FCAPS = ["Fault", "Configuration", "Accounting", "Performance", "Security"] as const;
