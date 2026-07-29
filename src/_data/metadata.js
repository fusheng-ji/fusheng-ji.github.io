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
        jobTitle: "M.Sc. student and visual computing researcher",
        description: site.description,
        sameAs: site.social
          .filter((item) => item.external)
          .map((item) => item.url),
      },
    ],
  },
};
