/**
 * Portfolio content, taken from Ushnish's two resumes (one-page + detailed).
 * Wording is kept close to the source; nothing here is invented.
 */

export const ABOUT = {
  summary:
    "Computer Science Engineer focused on AI and computer vision, with work on LLM pipelines and deep learning systems. Multiple hackathon winner and IEEE Computer Society leader at SRMIST.",
  role: "Computer Science Engineer · AI & Computer Vision Researcher",
  location: "Chennai, Tamil Nadu, India",
  facts: [
    { value: "9.6", label: "CGPA / 10 · SRMIST" },
    { value: "3", label: "Papers under submission" },
    { value: "2", label: "Industry internships · Samsung R&D, Synapse" },
    { value: "3×", label: "Hackathon winner" },
  ],
  interests: [
    "Computer vision and multi-modal perception",
    "Agentic and large language model systems",
    "Edge AI and embedded deployment",
    "Intelligent network management and observability",
    "Autonomous systems for disaster response and environmental monitoring",
    "Algorithmic trading and financial ML",
  ],
};

export type Job = { org: string; role: string; team?: string; period: string; place?: string; points: string[]; link?: { label: string; href: string } };

export const EXPERIENCE: Job[] = [
  {
    org: "Samsung R&D Institute Bangalore (SRIB)",
    role: "Prism Research Intern",
    team: "Telecom AI & Network Intelligence",
    period: "Nov 2024 – Jul 2025",
    points: [
      "Contributed to INFER, an agentic LLM-based framework for intelligent FCAPS network observability.",
      "Designed and implemented the multi-model LLM orchestration pipeline integrating Phi-2, Mistral 7B and DeepSeek R1 8B.",
      "Built the Go-based synthetic log generation engine producing structured telemetry at scale for model training and validation.",
      "Architected the hybrid vector storage system (FAISS + Redis + TimescaleDB) enabling sub-50 ms semantic retrieval across millions of log vectors.",
      "Applied LLMs and GANs for synthetic network data generation to augment training datasets for anomaly detection.",
      "Mentored by Mohan Reddy Vemullapalli (Group Engineering Manager) and Akash D (SW Engineer).",
    ],
    link: { label: "Explore INFER", href: "/explore/infer" },
  },
  {
    org: "Synapse",
    role: "AI Intern",
    team: "Recruitment Intelligence",
    period: "Jul 2025 – Aug 2025",
    points: [
      "Designed and deployed AI-powered recruitment screening systems, improving the successful hire rate from 54% to 81%.",
      "Built automated candidate evaluation pipelines using NLP and classification models for talent matching.",
    ],
  },
  {
    org: "SRM Institute of Science and Technology",
    role: "Computer Vision Research",
    team: "Under Dr. Krishnaveni S., Dept. of Computing Technologies",
    period: "Jun 2024 – Sep 2024",
    points: [
      "Developed a computer vision quality assurance system detecting 7 types of defective coffee beans in industrial batches of 1,000 units.",
      "Built an OpenCV-based size classification pipeline across six categories, with structured JSON output for industry integration.",
      "Improved batch inspection efficiency and accuracy for a real industry client under direct faculty mentorship.",
    ],
  },
];

export type Project = {
  name: string;
  tagline: string;
  period: string;
  stack: string[];
  points: string[];
  world?: string;
  repo?: string;
  live?: string;
};

export const PROJECTS: Project[] = [
  {
    name: "D-MIND",
    tagline: "Disaster Monitoring Intelligent Detection System",
    period: "Jan 2026",
    stack: ["Python", "PyTorch", "YOLOv12", "SegFormer", "Flask", "SQLite", "HuggingFace", "Ultralytics"],
    points: [
      "Multi-model AI system for real-time detection of humans, fire, landslides and landmines from aerial imagery.",
      "Conditional inference routing by colour / grayscale characteristics for latency optimisation.",
      "Flask REST API, SQLite event logging and a real-time monitoring dashboard; validated on an NVIDIA RTX 4060.",
    ],
    world: "/explore/d-mind",
    repo: "https://github.com/UshnishG/HAZARD-DMIND",
    live: "https://hazard-dmind.vercel.app",
  },
  {
    name: "INFER",
    tagline: "Intelligent Network Fault Evaluation & Resolution",
    period: "Nov 2024 – Jul 2025",
    stack: ["Python", "Go", "Phi-2", "Mistral 7B", "DeepSeek R1", "FAISS", "Redis", "TimescaleDB", "LSTM"],
    points: [
      "End-to-end implementation of the INFER research system during the Samsung R&D internship.",
      "98.4% FCAPS classification accuracy and sub-300 ms latency on 50,000 synthetic logs; 86.4% F1 LSTM anomaly prediction.",
    ],
    world: "/explore/infer",
  },
  {
    name: "Cosmic Acceleration",
    tagline: "CUDA N-body simulation",
    period: "2025",
    stack: ["CUDA", "CuPy", "Python"],
    points: ["Up to 96× speedup over CPU at N = 4096; 49× at N = 500.", "Barnes–Hut octree approximation kept force error under 0.5%."],
    world: "/explore/cuda-n-body",
    repo: "https://github.com/UshnishG/Cosmic-Acceleration",
  },
  {
    name: "Smart Marine Trash Detection",
    tagline: "AI + IoT framework",
    period: "2025",
    stack: ["Python", "YOLOv8", "LSTM", "PyTorch", "OpenCV", "MQTT", "PostGIS"],
    points: [
      "Implementation environment for the marine debris detection research.",
      "Heterogeneous sensor fusion (RGB, LiDAR, sonar), edge-AI processing on NVIDIA Jetson and cloud-hosted geospatial analytics.",
    ],
    world: "/explore/marine-ai",
  },
  {
    name: "AI-Powered Algorithmic Trading Bot",
    tagline: "NSE: IRCON",
    period: "Dec 2025",
    stack: ["Python", "scikit-learn", "Random Forest", "Pandas", "NumPy"],
    points: [
      "Modular ML trading system: data ingestion, feature engineering (SMA 10/20, RSI 14), model training and automated execution.",
      "Random Forest (100 estimators) with a probability-threshold strategy engine and full backtesting (ROI, Sharpe ratio).",
      "66.7% directional accuracy with positive ROI on out-of-sample historical NSE data.",
    ],
    repo: "https://github.com/UshnishG/FinStreet_SRM",
  },
  {
    name: "NeuroSVM",
    tagline: "Hybrid deep learning classifier",
    period: "Oct 2025",
    stack: ["Python", "PyTorch", "scikit-learn", "t-SNE", "PCA"],
    points: [
      "Hybrid CNN + SVM pipeline achieving 99.25% accuracy and F1 = 0.9924 on MNIST.",
      "2.85× error reduction over a PCA-SVM baseline; improved feature separability validated with t-SNE and PCA variance analysis.",
    ],
  },
  {
    name: "Coffee Bean Quality Assurance",
    tagline: "Computer vision system",
    period: "Jun 2024 – Sep 2024",
    stack: ["Python", "OpenCV", "YOLOv8"],
    points: ["Industry-deployed CV system detecting 7 defect types in coffee bean batches of 1,000; size classification across 6 categories with JSON output."],
    repo: "https://github.com/UshnishG/Coffee-Beans-Sizing",
  },
  {
    name: "Fit Fusion",
    tagline: "Real-time exercise tracking",
    period: "May 2025",
    stack: ["TensorFlow.js", "MediaPipe"],
    points: ["Real-time pose estimation with joint-angle rep counting and posture correction.", "4th Prize at an intercollegiate hackathon."],
  },
];

export type Paper = { title: string; authors: string; venue: string; year: string; keywords: string[]; points: string[]; world?: string };

export const RESEARCH: Paper[] = [
  {
    title: "INFER: Agentic LLMs for FCAPS – A Real-Time, Multi-Model Framework for Intelligent Network Observability",
    authors: "Ushnish Ghosal, Aayush Mishra, Syeda Umaiza Unsa, Dineshwar Nagabothu, Mohan Reddy Vemullapalli, Akash D, Dr. Kishore Anthuvan Sahayaraj K, Dr. M. Vaidhehi",
    venue: "Samsung R&D Collaboration · SRM Institute of Science and Technology",
    year: "2025",
    keywords: ["FCAPS Management", "Network Log Analysis", "Anomaly Detection", "LLMs", "Agentic Orchestration", "Vector Databases", "Predictive Analytics"],
    points: [
      "Deployable multi-model LLM pipeline orchestrating Phi-2, Mistral 7B and DeepSeek R1 8B for classification, summarisation and deep reasoning.",
      "98.4% FCAPS classification accuracy and sub-300 ms end-to-end latency on 50,000 synthetic network logs.",
      "LSTM predictive module: 86.4% F1 on anomaly prediction with a 2–6 hour forecast horizon; outperformed traditional FCAPS methods (>1000 ms, 78% accuracy).",
    ],
    world: "/explore/infer",
  },
  {
    title: "D-MIND: A Unified AI Framework for UAV-Based Landmine Detection and Landslide Segmentation",
    authors: "Keshav Gupta, Ushnish Ghosal, G. Niranjana",
    venue: "Department of Computing Technologies, SRMIST",
    year: "2026",
    keywords: ["UAV", "YOLOv12", "SegFormer", "Landmine Detection", "Landslide Segmentation", "Edge AI", "Disaster Management"],
    points: [
      "Unified aerial hazard-analysis framework combining YOLOv12 small-object detection with SegFormer semantic terrain segmentation.",
      "Landmine detector mAP@0.5 = 0.979 (11,564 instances); landslide segmentation mIoU ≈ 80.5% (~8,000 aerial images).",
      "Fire box / mask mAP@0.5 = 0.876 / 0.880; human detection P = 0.91, R = 0.88, mAP@0.5 = 0.93 (COCO 2017); ~8.0 ms/image.",
    ],
    world: "/explore/d-mind",
  },
  {
    title: "Smart Marine Trash Detection Leveraging AI and IoT for Sustainable Oceans",
    authors: "Ushnish Ghosal, Keshav Gupta",
    venue: "Department of Computing Technologies, SRMIST",
    year: "2025",
    keywords: ["Marine Debris Detection", "YOLOv8", "LSTM", "IoT Sensor Networks", "Edge AI", "AUV", "Geospatial Mapping", "Ocean Conservation"],
    points: [
      "Hybrid AI–IoT framework with smart buoys, UAVs and AUVs fusing RGB, LiDAR and sonar streams.",
      "YOLOv8–LSTM detector: 92.5% precision, 90.8% recall, 93.3% mAP — +5.2 pp over a YOLOv5 baseline; the LSTM head adds +2.9 pp by suppressing sea-foam false positives.",
      "1.8 s end-to-end IoT latency; solar buoy validated for >7 days; 72-hour drift forecasting cut response time from 4.1 h to 0.8 h in field trials.",
    ],
    world: "/explore/marine-ai",
  },
];

export const SKILLS: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["Python", "C++", "Java", "C", "Go"] },
  { group: "ML frameworks", items: ["PyTorch", "TensorFlow", "Keras", "scikit-learn", "HuggingFace Transformers", "Ultralytics"] },
  { group: "Computer vision", items: ["OpenCV", "MediaPipe", "YOLOv8 / v12", "SegFormer", "CNNs", "Object detection", "Semantic segmentation"] },
  { group: "LLMs & NLP", items: ["Phi-2", "Mistral 7B", "DeepSeek R1", "RAG pipelines", "Prompt engineering", "Agentic orchestration"] },
  { group: "Data & storage", items: ["FAISS", "Redis", "TimescaleDB", "SQLite", "MongoDB", "PostgreSQL / PostGIS"] },
  { group: "Systems & tools", items: ["Git", "Docker", "Linux", "Flask", "REST APIs", "MQTT", "Go (goroutines)", "NVIDIA CUDA"] },
  { group: "Hardware", items: ["NVIDIA RTX 4060 (local)", "A100 80GB (cloud)", "NVIDIA Jetson (target edge)"] },
  { group: "Domains", items: ["Computer vision", "Generative AI", "Autonomous systems", "Network intelligence", "Algorithmic trading"] },
];

export const EDUCATION = {
  school: "SRM Institute of Science and Technology (SRMIST)",
  degree: "B.Tech in Computer Science and Engineering",
  period: "2023 – 2027",
  place: "Chennai, Tamil Nadu, India",
  cgpa: "9.6 / 10.0",
  coursework: [
    "Data Structures & Algorithms",
    "Operating Systems",
    "DBMS",
    "Computer Networks",
    "Computer Organisation & Architecture",
    "Machine Learning",
    "Artificial Intelligence",
    "GPU Computing",
    "Image Processing",
  ],
};

export const LEADERSHIP: { org: string; role: string; period: string; points: string[] }[] = [
  {
    org: "IEEE Computer Society — SRMIST Student Branch",
    role: "Member → Technical Lead → Vice-Chairperson",
    period: "2023 – present",
    points: [
      "Oversaw strategic direction, technical workshops and inter-branch collaborations.",
      "Organised hands-on AI/ML workshops, coding competitions and technical seminars for 200+ student members.",
    ],
  },
  {
    org: "AI & Finance Winter School, IIIT Hyderabad",
    role: "Selected participant",
    period: "2025",
    points: ["Competitively selected for an intensive programme at the intersection of artificial intelligence and quantitative finance."],
  },
  {
    org: "Google Developer Groups (GDG) Chennai",
    role: "Active member",
    period: "Aug 2023 – Nov 2024",
    points: ["Attended developer summits, Cloud Study Jams and AI/ML workshops; attended DevFest 2023 and took part in Google Cloud Jam."],
  },
];

export const AWARDS: { title: string; detail?: string; kind: "win" | "place" | "honour" | "oss" }[] = [
  { title: "Winner — ICE 2026", detail: "Innovation & Computing Excellence", kind: "win" },
  { title: "Winner — Synapse AI Hackathon", kind: "win" },
  { title: "Winner — HackVita 2025", kind: "win" },
  { title: "4th Prize — Fit Fusion", detail: "Intercollegiate hackathon · real-time exercise AI", kind: "place" },
  { title: "Top Achiever Award — 2nd Year", detail: "Recognised by SRMIST for outstanding academic and technical achievement", kind: "honour" },
  { title: "Open source contributor", detail: "Hacktoberfest · GSSoC (GirlScript Summer of Code) · SSoC (Social Summer of Code)", kind: "oss" },
];

export const CERTIFICATIONS: { title: string; issuer: string; year?: string; image?: string }[] = [
  { title: "SAP Certified — Generative AI Developer", issuer: "SAP", year: "2026", image: "/certs/SAP Certified - SAP Generative AI Developer.png" },
  { title: "Oracle Cloud Infrastructure AI Foundations Associate", issuer: "Oracle University", image: "/certs/Oracle Certified AI Foundations Associate.png" },
  { title: "Oracle Fusion Cloud ERP Certified", issuer: "Oracle University", image: "/certs/Oracle ERP Process Essentials.png" },
  { title: "AWS Machine Learning Foundation", issuer: "Amazon Web Services" },
  { title: "CS50's Introduction to Programming with Python", issuer: "Harvard University / edX" },
  { title: "IBM Relational Databases (SQL & NoSQL)", issuer: "IBM / Coursera" },
];
