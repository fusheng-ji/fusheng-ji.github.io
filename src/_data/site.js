export default {
  url: "https://fusheng-ji.github.io",
  title: "Wenbo Ji",
  description:
    "Wenbo Ji (嵇文博) — AI researcher and engineer (TUM, Agile Robots). Specializing in controllable video generation, video world models, and high-performance ML systems (Triton/CUDA, FlashAttention SM100, SGLang, FastVideo). Seeking 2027 new grad full-time roles (worldwide relocation).",
  language: "en",
  updated: "2026-10-31",
  owner: {
    name: "Wenbo Ji",
    alternateNames: ["Ji Wenbo", "嵇文博"],
    email: "wenboji0420@gmail.com",
    portrait: {
      src: "/assets/site-media/wenbo-ji-portrait.jpg",
      width: 1122,
      height: 1122,
      alt: "Wenbo Ji portrait",
    },
  },
  navigation: [
    { label: "CV", url: "/assets/doc/WenboJi_CV_English.pdf", external: true },
    { label: "Publications", url: "#Publications" },
    { label: "Open Source", url: "#open-source" },
    { label: "Experiences", url: "#experiences" },
    { label: "Blog", url: "#blog" },
  ],
  social: [
    {
      label: "Email",
      url: "mailto:wenboji0420@gmail.com",
      icon: "/assets/misc/email-logo.svg",
    },
    {
      label: "CV",
      url: "/assets/doc/WenboJi_CV_English.pdf",
      icon: "/assets/misc/cv-logo.svg",
    },
    {
      label: "Google Scholar",
      url: "https://scholar.google.com/citations?user=ZTUMczEAAAAJ&hl=en",
      icon: "/assets/misc/google-scholar.svg",
      external: true,
    },
    {
      label: "GitHub",
      url: "https://github.com/fusheng-ji/",
      icon: "/assets/misc/github-logo.png",
      external: true,
    },
    {
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/wenbo-ji-6950b9187",
      icon: "/assets/misc/linkedin-logo.svg",
      external: true,
    },
    {
      label: "X",
      url: "https://x.com/wenbo_ji_",
      icon: "/assets/misc/x-logo.svg",
      external: true,
    },
  ],
  resourceTypes: {
    arxiv: { textLabel: "arXiv", colorGroup: "arxiv", label: "arXiv", icon: "/assets/misc/arxiv_logo.svg" },
    paper: { textLabel: "Paper", colorGroup: "paper", label: "Paper", icon: "/assets/misc/paper_logo.svg" },
    poster: { textLabel: "Poster", colorGroup: "poster", label: "Poster", icon: "/assets/misc/poster-logo.svg" },
    project: { textLabel: "Website", colorGroup: "website", label: "Project website", icon: "/assets/misc/website_logo.png" },
    code: { textLabel: "Code", colorGroup: "code", label: "GitHub", icon: "/assets/misc/github-logo.png" },
    video: { textLabel: "Video", colorGroup: "video", label: "Video", icon: "/assets/misc/yotube_logo.png" },
    ieee: { textLabel: "Paper", colorGroup: "paper", label: "IEEE", icon: "/assets/misc/ieee-logo.svg", className: "ieee-inline-logo" },
    pdf: { textLabel: "PDF", colorGroup: "paper", label: "PDF", icon: "/assets/misc/paper_logo.svg" },
  },
};
