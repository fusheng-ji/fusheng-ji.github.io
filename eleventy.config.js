import { readFileSync } from "node:fs";
import { decodeHTML } from "entities";

export default function (eleventyConfig) {
  const assetManifest = JSON.parse(
    readFileSync(new URL("./src/_data/asset-manifest.json", import.meta.url)),
  );

  eleventyConfig.addPassthroughCopy({ public: "." });
  eleventyConfig.addWatchTarget("./src/styles/");
  eleventyConfig.addWatchTarget("./src/scripts/");
  eleventyConfig.addFilter("asset", (name) => assetManifest[name] ?? name);
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));
  // Decode only the rendered text export; HTML pages keep normal escaping.
  eleventyConfig.addTransform("llmsText", function (content) {
    if (this.page.url !== "/llms.txt") return content;
    return decodeHTML(content).replaceAll("\u00a0", " ");
  });
  eleventyConfig.addFilter("dateYear", (value) =>
    new Intl.DateTimeFormat("en", { year: "numeric" }).format(new Date(value)),
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
