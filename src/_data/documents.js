export default [
  {
    id: "thesis",
    sectionTitle: "Thesis",
    title: "Endoscopic Scene Reconstruction with 4D Half Gaussian Splatting",
    year: 2025,
    type: "Master's Thesis",
    area: "representation",
    className: "thesis-entry",
    media: [
      {
        src: "/assets/institution_logo/tju.png",
        width: 160,
        height: 100,
        alt: "Tongji University logo",
        className: "is-logo",
      },
      {
        src: "/assets/site-media/tongji-thesis-pipeline_1280.webp",
        srcset:
          "/assets/site-media/tongji-thesis-pipeline_640.webp 640w, /assets/site-media/tongji-thesis-pipeline_1280.webp 1280w",
        width: 1280,
        height: 430,
        alt: "Thesis reconstruction pipeline diagram",
        className: "is-teaser",
      },
    ],
    summary:
      "Developed a 4D Half-Gaussian splatting pipeline for deformable stereo endoscopic reconstruction with depth-prior initialization, HexPlane spatiotemporal deformation, and edge-aware depth regularization. Achieved 38.1 PSNR on EndoNeRF versus prior endoscopic GS/NeRF baselines; also evaluated on SCARED.",
  },
  {
    id: "technical-report",
    sectionTitle: "Technical Report",
    title: "Object-Centric 3D Reconstruction and Decomposition",
    year: 2025,
    type: "TUM DI Lab Report",
    area: "representation",
    className: "publication-entry technical-report-entry",
    media: [
      {
        src: "/assets/site-media/di-lab-technical-report-cover.webp",
        width: 480,
        height: 679,
        alt: "Cover of the Object-Centric 3D Reconstruction and Decomposition technical report",
      },
    ],
    authors: [
      { name: "Wenbo Ji", featured: true },
      { name: "Michael Neumayr" },
      { name: "Nina Kirakosyan" },
      { name: "Filip Skubacz" },
    ],
    summary:
      "A TUM DI Lab report on object-centric 3D reconstruction and decomposition with 3D Gaussian Splatting.",
    links: [
      {
        type: "pdf",
        url: "https://github.com/fusheng-ji/fusheng-ji.github.io/releases/download/site-assets-v1/TUM-DI-Lab-object-centric-3D-reconstruction-report.pdf",
        label: "Open the full TUM DI Lab report (PDF)",
        external: true,
      },
    ],
  },
];
