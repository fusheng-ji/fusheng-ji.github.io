export default [
  {
    id: "robot-world-model",
    title: "Video World Model for Robot Dexterous Manipulation",
    date: "Apr 2026 - Now",
    type: "Research Internship",
    area: "embodied",
    logos: [
      {
        src: "/assets/institution_logo/Agile_Robots_logo.svg",
        width: 200,
        height: 90,
        alt: "Agile Robots SE logo",
      },
      {
        src: "/assets/institution_logo/Agile-wrd-logo.png",
        width: 200,
        height: 72,
        alt: "Agile WRD logo",
        className: "experience-logo-wrd",
      },
    ],
    contributions: [
      "Developing a cross-embodiment video generation method that translates egocentric human demonstrations into robot-domain videos for downstream policy learning.",
    ],
    mentors: [
      {
        people: [
          {
            name: "Mahdi Mustapha Hamad",
            url: "https://scholar.google.com/citations?user=snIHZzcAAAAJ&hl=en",
            now: "Tech Lead, Robot Learning Applications · Agile Robots SE",
          },
        ],
      },
    ],
  },
  {
    id: "human-motion-video-diffusion",
    title: "Human Motion Video Diffusion",
    date: "March 2026 - Now",
    type: "Master's Thesis",
    area: "generation",
    logos: [
      {
        src: "/assets/institution_logo/visual_computing_lab.svg",
        width: 200,
        height: 90,
        alt: "TUM Visual Computing Lab logo",
      },
    ],
    contributions: [
      "Developing a camera-controlled video diffusion model for controllable synthesis of human motion and scene interactions across changing viewpoints.",
    ],
    mentors: [
      {
        people: [
          {
            name: "Yu Chi",
            url: "https://ychgoaround.github.io/",
            now: "PhD Student · TUM Visual Computing & AI Lab",
          },
          {
            name: "Jiapeng Tang",
            url: "https://tangjiapeng.github.io/",
            now: "PhD Student · TUM Visual Computing & AI Lab",
          },
          {
            name: "Matthias Nießner",
            url: "https://niessnerlab.org/members/matthias_niessner/profile.html",
            now: "Professor · TUM Visual Computing & AI",
          },
        ],
      },
    ],
  },
  {
    id: "human-head-avatar-animation",
    title: "Human Head Avatar Animation",
    date: "April 2025 - March 2026",
    type: "Research Internship",
    area: "generation",
    logos: [
      {
        src: "/assets/institution_logo/visual_computing_lab.svg",
        width: 200,
        height: 90,
        alt: "TUM Visual Computing Lab logo",
      },
    ],
    contributions: [
      'Led the development of <a href="#vids-publication">ViDS</a>, an identity-preserving video diffusion method for long-form portrait animation.',
      "ViDS ranked first on 8 of 13 VFHQ metrics, improving reenactment quality and identity preservation.",
    ],
    mentors: [
      {
        people: [
          {
            name: "Jiapeng Tang",
            url: "https://tangjiapeng.github.io/",
            now: "PhD Student · TUM Visual Computing & AI Lab",
          },
          {
            name: "Matthias Nießner",
            url: "https://niessnerlab.org/members/matthias_niessner/profile.html",
            now: "Professor · TUM Visual Computing & AI",
          },
        ],
      },
    ],
  },
  {
    id: "dense-point-tracking",
    title: "Dense Point Tracking",
    date: "Aug 2024 - April 2025",
    type: "Research Internship",
    area: "perception",
    logos: [
      {
        src: "/assets/institution_logo/imfusion.png",
        width: 200,
        height: 90,
        alt: "ImFusion logo",
      },
      {
        src: "/assets/institution_logo/tum_camp.png",
        width: 150,
        height: 90,
        alt: "TUM CAMP logo",
      },
    ],
    contributions: [
      'Implemented <a href="https://arxiv.org/abs/2504.09904">LiteTracker</a>’s online inference and EMA-flow initialization, and conducted low-latency tracking experiments.',
      "LiteTracker remained competitive on STIR and SuPer while running ~7× faster than its predecessor and 2× faster than prior state of the art.",
    ],
    mentors: [
      {
        people: [
          {
            name: "Mert Asim Karaoglu",
            url: "https://scholar.google.de/citations?hl=en&user=j2REtlAAAAAJ",
            now: "Senior Research Engineer · ImFusion; PhD Candidate · TUM CAMP",
          },
        ],
      },
      {
        people: [
          {
            name: "Benjamin Busam",
            url: "https://www.asg.ed.tum.de/pf/team/benjamin-busam/",
            ex: "Computer Vision Coordinator · TUM CAMP",
            now: "Professor & Director · TUM Photogrammetry and Remote Sensing",
          },
          {
            name: "Nassir Navab",
            url: "https://www.professoren.tum.de/en/navab-nassir",
            now: "Professor & Chair · TUM CAMP; Adjunct Professor · Johns Hopkins",
          },
        ],
      },
      {
        people: [
          {
            name: "Alexander Ladikos",
            url: "https://scholar.google.de/citations?user=0fUQE3EAAAAJ&hl=en",
            now: "Head of Computer Vision & Quality Management · ImFusion",
          },
        ],
      },
    ],
  },
  {
    id: "scene-decomposition",
    title: "3D Scene Decomposition",
    date: "Feb 2024 - Aug 2025",
    type: "Guided Research",
    area: "representation",
    logos: [
      {
        src: "/assets/institution_logo/oxford.png",
        width: 200,
        height: 90,
        alt: "University of Oxford logo",
      },
      {
        src: "/assets/institution_logo/tum.png",
        width: 200,
        height: 90,
        alt: "Technical University of Munich logo",
      },
      {
        src: "/assets/institution_logo/tum-di-lab.webp",
        width: 400,
        height: 225,
        alt: "TUM DI Lab logo",
      },
    ],
    contributions: [
      'Designed and evaluated <a href="https://openaccess.thecvf.com/content/ICCV2025W/E2E3D/html/Xia_CSG-Fusion_Consistent_Sparse-View_Gaussian_Splatting_via_Matching-based_Fusion_ICCVW_2025_paper.html">CSG-Fusion</a>; received Best Paper at ICCV Workshop E2E3D.',
      "Improved ScanNet++ PSNR by 2.8&nbsp;dB over Splatt3R at 90% overlap with ~124K fewer Gaussians, and demonstrated zero-shot generalization on DTU.",
    ],
    mentors: [
      {
        people: [
          {
            name: "Daniel Cremers",
            url: "https://cvg.cit.tum.de/members/cremers",
            now: "Professor & Chair · TUM Computer Vision & AI",
          },
          {
            name: "Yan Xia",
            url: "https://yan-xia.github.io/",
            ex: "Senior Researcher · TUM Computer Vision Group",
            now: "Professor · USTC Spatial Intelligence Lab",
          },
        ],
      },
      {
        people: [
          {
            name: "Chuanxia Zheng",
            url: "https://chuanxiaz.com/",
            ex: "Postdoctoral Researcher · Oxford VGG",
            now: "Nanyang Assistant Professor · NTU CCDS",
          },
        ],
      },
    ],
  },
  {
    id: "large-scale-reconstruction",
    title: "Large Scale 3D Scene Reconstruction",
    date: "July 2023 - Sep 2023",
    type: "Research Assistant",
    area: "representation",
    logos: [
      {
        src: "/assets/institution_logo/zju.png",
        width: 200,
        height: 90,
        alt: "Zhejiang University logo",
      },
    ],
    contributions: [
      "Contributed to the development and experimental evaluation of a large-scale 3D scene reconstruction pipeline.",
    ],
    mentors: [
      {
        people: [
          {
            name: "Yiyi Liao",
            url: "https://yiyiliao.github.io/",
            now: "Distinguished Researcher & Doctoral Supervisor · Zhejiang University",
          },
        ],
      },
    ],
  },
];
