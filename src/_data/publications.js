export default [
  {
    id: "vids-publication",
    title: "ViDS: Video Diffusion Shader using 3D Face Tracking",
    venue: "Preprint",
    year: 2026,
    area: "generation",
    media: {
      src: "/papers/ViDS/teaser.webp",
      width: 640,
      height: 320,
      alt: "ViDS teaser showing identity-preserving portrait animation driven by 3D face normal maps",
    },
    authors: [
      { name: "Wenbo Ji", featured: true },
      { name: "Davide Davoli" },
      { name: "Zhe Chen" },
      { name: "Liam Schoneveld" },
      { name: "Matthias Nießner" },
      { name: "Jiapeng Tang", corresponding: true },
    ],
    summary:
      "3D face tracking-conditioned video diffusion for expressive, identity-preserving portrait animation from a single image, with autoregressive sampling for longer videos. On VFHQ, ViDS ranked first on 8 of 13 reported metrics.",
    links: [
      {
        type: "arxiv",
        url: "https://arxiv.org/abs/2607.24124",
        label: "Read ViDS on arXiv",
        external: true,
      },
      {
        type: "project",
        url: "https://fusheng-ji.github.io/ViDS/",
        label: "Open the ViDS project website",
        external: true,
      },
    ],
  },
  {
    id: "csg-fusion-publication",
    title:
      "CSG-Fusion: Consistent Sparse-View Gaussian Splatting via Matching-based Fusion",
    venue: "ICCV Workshop E2E3D",
    year: 2025,
    area: "representation",
    media: {
      src: "/assets/site-media/csg-fusion-teaser_640.jpg",
      width: 640,
      height: 361,
      alt: "CSG-Fusion teaser image",
    },
    authors: [
      { name: "Yan Xia", equal: true, corresponding: true },
      { name: "Wenbo Ji", featured: true, equal: true },
      { name: "Weirong Chen" },
      { name: "Daniel Cremers" },
    ],
    summary:
      "Matching-based fusion of sparse-view pointmaps into compact, cross-view-consistent 3D Gaussians. At 90% ScanNet++ overlap, it improved PSNR by 2.8 dB over Splatt3R while using approximately 124K fewer Gaussians.",
    award: {
      label: "Best Paper Award",
      url: "/papers/CSG_Fusion_ICCV2025Workshop_E2E3D/CSG_fusion_certificate.pdf",
    },
    links: [
      {
        type: "poster",
        url: "https://github.com/fusheng-ji/fusheng-ji.github.io/releases/download/site-assets-v1/CSG-Fusion-poster.pdf",
        label: "Download the CSG-Fusion poster",
        external: true,
      },
      {
        type: "paper",
        url: "https://openaccess.thecvf.com/content/ICCV2025W/E2E3D/html/Xia_CSG-Fusion_Consistent_Sparse-View_Gaussian_Splatting_via_Matching-based_Fusion_ICCVW_2025_paper.html",
        label: "Read the CSG-Fusion paper",
        external: true,
      },
    ],
  },
  {
    id: "litetracker-publication",
    title:
      "LiteTracker: Leveraging Temporal Causality for Accurate Low-latency Tissue Tracking",
    venue: "MICCAI",
    year: 2025,
    area: "perception",
    media: {
      src: "/assets/site-media/litetracker-teaser_1280.webp",
      srcset:
        "/assets/site-media/litetracker-teaser_640.webp 640w, /assets/site-media/litetracker-teaser_1280.webp 1280w",
      width: 1280,
      height: 724,
      alt: "LiteTracker teaser image",
    },
    authors: [
      { name: "Mert Asim Karaoglu" },
      { name: "Wenbo Ji", featured: true },
      { name: "Ahmed Abbas" },
      { name: "Nassir Navab" },
      { name: "Benjamin Busam" },
      { name: "Alexander Ladikos", corresponding: true },
    ],
    summary:
      "Causal temporal feature reuse with prior-motion initialization for accurate, low-latency online tissue tracking. It ran approximately 7× faster than its predecessor and 2× faster than prior state of the art, reaching 29.67 ms P95 for 1,024 points.",
    links: [
      {
        type: "arxiv",
        url: "https://arxiv.org/abs/2504.09904",
        label: "Read LiteTracker on arXiv",
        external: true,
      },
      {
        type: "paper",
        url: "https://papers.miccai.org/miccai-2025/paper/2578_paper.pdf",
        label: "Read the MICCAI paper",
        external: true,
      },
      {
        type: "video",
        url: "https://www.youtube.com/watch?v=aDK18yXq0AA",
        label: "Watch the LiteTracker video",
        external: true,
      },
      {
        type: "code",
        url: "https://github.com/ImFusionGmbH/lite-tracker",
        label: "Open the LiteTracker source code",
        external: true,
      },
    ],
  },
  {
    id: "re0-publication",
    title: "RE0: Recognize Everything with 3D Zero-shot Instance Segmentation",
    venue: "ICRA",
    year: 2025,
    area: "perception",
    media: {
      src: "/papers/Re0_ICRA2025/segmentation_result.svg",
      width: 640,
      height: 360,
      alt: "RE0 teaser image",
    },
    authors: [
      { name: "Xiaohan Yan", equal: true },
      { name: "Zijian Jiang", equal: true },
      { name: "Yinghao Shuai", equal: true },
      { name: "Nan Wang" },
      { name: "Xiaowei Song" },
      { name: "Wenbo Ji", featured: true, lineBreakBefore: true },
      { name: "Ge Wu" },
      { name: "Jinyu He" },
      { name: "Gang Wei" },
      { name: "Zhicheng Wang", corresponding: true },
    ],
    summary:
      "Training-free 3D zero-shot instance segmentation from multi-view masks and CLIP semantics.",
    links: [
      {
        type: "ieee",
        url: "https://ieeexplore.ieee.org/document/11127468/",
        label: "Read RE0 on IEEE Xplore",
        external: true,
      },
      {
        type: "project",
        url: "https://recognizeeverything.github.io/",
        label: "Open the RE0 project website",
        external: true,
      },
      {
        type: "code",
        url: "https://github.com/RecognizeEverything/Re0",
        label: "Open the RE0 source code",
        external: true,
      },
    ],
  },
];
