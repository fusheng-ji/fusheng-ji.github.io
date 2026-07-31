export default {
  url: "https://fusheng-ji.github.io",
  title: "Wenbo Ji",
  description:
    "Personal research portfolio for Wenbo Ji, working on visual computing, human motion video diffusion, 3D/4D reconstruction, tracking, and robot world models.",
  language: "en",
  updated: "2026-07-31",
  template: {
    name: "Academic Homepage Template",
    repositoryUrl: "https://github.com/fusheng-ji/academic-homepage-template",
  },
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
    { label: "Research", url: "#research" },
    { label: "Publications", url: "#Publications" },
    { label: "Experiences", url: "#experiences" },
    { label: "Education", url: "#education" },
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
    arxiv: { label: "arXiv", icon: "/assets/misc/arxiv_logo.svg" },
    paper: { label: "Paper", icon: "/assets/misc/paper_logo.svg" },
    poster: { label: "Poster", icon: "/assets/misc/poster-logo.svg" },
    project: { label: "Project website", icon: "/assets/misc/website_logo.png" },
    code: { label: "GitHub", icon: "/assets/misc/github-logo.png" },
    video: { label: "Video", icon: "/assets/misc/yotube_logo.png" },
    ieee: { label: "IEEE", icon: "/assets/misc/ieee-logo.svg", className: "ieee-inline-logo" },
    pdf: { label: "PDF", icon: "/assets/misc/paper_logo.svg" },
  },
};
