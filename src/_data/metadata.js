import site from "./site.js";

export default {
  jsonLd: {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: `${site.url}/`,
        name: site.title,
        description: site.description,
        inLanguage: site.language,
      },
      {
        "@type": "ProfilePage",
        "@id": `${site.url}/#profile`,
        url: `${site.url}/`,
        name: `${site.owner.name} - Research Portfolio`,
        isPartOf: { "@id": `${site.url}/#website` },
        mainEntity: { "@id": `${site.url}/#wenbo-ji` },
        inLanguage: site.language,
      },
      {
        "@type": "Person",
        "@id": `${site.url}/#wenbo-ji`,
        name: site.owner.name,
        alternateName: site.owner.alternateNames,
        url: `${site.url}/`,
        image: `${site.url}${site.owner.portrait.src}`,
        email: `mailto:${site.owner.email}`,
        jobTitle: "M.Sc. student at TUM and research intern at Agile Robots SE",
        description: site.description,
        affiliation: [
          {
            "@type": "Organization",
            name: "Technical University of Munich",
            url: "https://www.tum.de/",
          },
          {
            "@type": "Organization",
            name: "Agile Robots SE",
            url: "https://www.agile-robots.com/",
          },
        ],
        alumniOf: [
          {
            "@type": "EducationalOrganization",
            name: "Tongji University",
            url: "https://www.tongji.edu.cn/",
          },
          {
            "@type": "EducationalOrganization",
            name: "Nanjing Tech University",
            url: "http://www.njtech.edu.cn/",
          },
        ],
        knowsAbout: [
          "Video Generation",
          "Video Diffusion Models",
          "Diffusion Transformers",
          "Machine Learning Systems",
          "GPU Kernel Optimization",
          "Distributed Training and Inference",
          "Sequence Parallelism",
          "FlashAttention",
          "SGLang",
          "Triton",
          "CUDA",
          "3D Computer Vision",
          "Spatial Intelligence",
          "Embodied AI",
          "World Models",
          "Gaussian Splatting",
          "Point Tracking",
        ],
        award: "Best Paper Award at ICCV 2025 Workshop E2E3D",
        seeks: [
          {
            "@type": "Demand",
            name: "New Grad Research Engineer in Video Generation, Multimodal AI, Spatial Intelligence, or Embodied AI (2027)",
          },
          {
            "@type": "Demand",
            name: "New Grad Research Scientist / Member of Technical Staff (MTS) (2027)",
          },
        ],
        sameAs: site.social
          .filter((item) => item.external)
          .map((item) => item.url),
      },
    ],
  },
};
