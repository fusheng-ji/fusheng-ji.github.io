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
];
