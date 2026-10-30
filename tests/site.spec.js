import { expect, test } from "@playwright/test";
import publications from "../src/_data/publications.js";
import projects from "../src/_data/projects.js";
import site from "../src/_data/site.js";
import experiences from "../src/_data/experiences.js";
import researchArc from "../src/_data/researchArc.js";

function contrastRatio(first, second) {
  const luminance = color => color.slice(0, 3).map(component => {
    const value = component / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const publicPages = [
  "/",
  "/404.html",
  "/render_arts/",
  "/projects/tum_cv_challenge_ss24/",
  "/three_js_arts/jelly_receipt/",
  "/three_js_arts/water_pool/",
];

test("public pages are reachable", async ({ page }) => {
  for (const path of publicPages) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.ok(), path).toBeTruthy();
  }
});

async function readNavigation(page, path) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);

  return page.locator(".navbar").evaluate((navbar) => {
    const readStyle = (element, properties) => {
      const style = getComputedStyle(element);
      return Object.fromEntries(
        properties.map((property) => [property, style[property]]),
      );
    };
    const links = Array.from(navbar.querySelectorAll(".navbar-links > a"));
    const firstChip = links[0].querySelector(".nav-link-chip");
    const firstLabel = links[0].querySelector(".nav-link-label");
    const brandImage = navbar.querySelector(".navbar-brand img");
    const toggle = navbar.querySelector(".navbar-toggle");
    const linkContainer = navbar.querySelector(".navbar-links");
    const bounds = navbar.getBoundingClientRect();

    return {
      attributes: {
        glassNav: navbar.hasAttribute("data-site-glass-nav"),
        glass: navbar.hasAttribute("data-site-glass"),
        glassReady: navbar.getAttribute("data-site-glass-ready"),
      },
      brandHref: navbar.querySelector(".navbar-brand").getAttribute("href"),
      links: links.map((link) => ({
        label: link.textContent.trim(),
        href: link.getAttribute("href"),
        target: link.getAttribute("target"),
        rel: link.getAttribute("rel"),
        chipCount: link.querySelectorAll(":scope > .nav-link-chip").length,
        labelCount: link.querySelectorAll(
          ":scope > .nav-link-chip > .nav-link-label",
        ).length,
      })),
      geometry: {
        width: bounds.width,
        height: bounds.height,
        top: bounds.top,
      },
      navbarStyle: readStyle(navbar, [
        "position",
        "top",
        "minHeight",
        "maxWidth",
        "marginTop",
        "marginBottom",
        "paddingLeft",
        "paddingRight",
        "borderRadius",
        "backgroundImage",
        "boxShadow",
        "backdropFilter",
      ]),
      linkContainerStyle: readStyle(linkContainer, [
        "display",
        "visibility",
        "gap",
        "gridTemplateColumns",
      ]),
      chipStyle: readStyle(firstChip, [
        "display",
        "minHeight",
        "paddingTop",
        "paddingRight",
        "borderRadius",
      ]),
      labelStyle: readStyle(firstLabel, [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "lineHeight",
        "color",
      ]),
      brandImageStyle: readStyle(brandImage, ["width", "height"]),
      toggleStyle: readStyle(toggle, [
        "display",
        "width",
        "height",
        "borderRadius",
      ]),
    };
  });
}

test("404 navigation matches the homepage navigation system", async ({
  page,
}) => {
  const homepage = await readNavigation(page, "/");
  const notFound = await readNavigation(page, "/404.html");

  expect(notFound.attributes).toEqual(homepage.attributes);
  expect(notFound.brandHref).toBe("/");
  expect(homepage.brandHref).toBe("#top");
  expect(notFound.links.map(({ label }) => label)).toEqual(
    homepage.links.map(({ label }) => label),
  );
  expect(notFound.links.map(({ href }) => href)).toEqual(
    homepage.links.map(({ href }) =>
      href.startsWith("#") ? `/${href}` : href,
    ),
  );
  expect(
    notFound.links.map(({ target, rel, chipCount, labelCount }) => ({
      target,
      rel,
      chipCount,
      labelCount,
    })),
  ).toEqual(
    homepage.links.map(({ target, rel, chipCount, labelCount }) => ({
      target,
      rel,
      chipCount,
      labelCount,
    })),
  );
  expect(notFound.navbarStyle).toEqual(homepage.navbarStyle);
  expect(notFound.linkContainerStyle).toEqual(homepage.linkContainerStyle);
  expect(notFound.chipStyle).toEqual(homepage.chipStyle);
  expect(notFound.labelStyle).toEqual(homepage.labelStyle);
  expect(notFound.brandImageStyle).toEqual(homepage.brandImageStyle);
  expect(notFound.toggleStyle).toEqual(homepage.toggleStyle);
  expect(
    Math.abs(notFound.geometry.width - homepage.geometry.width),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(notFound.geometry.height - homepage.geometry.height),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(notFound.geometry.top - homepage.geometry.top),
  ).toBeLessThanOrEqual(1);
});

test("404 mobile navigation is operable and does not overflow", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.startsWith("desktop-"),
    "Mobile navigation behavior",
  );

  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/404.html", { waitUntil: "networkidle" });

  const navbar = page.locator(".navbar");
  const toggle = page.locator(".navbar-toggle");
  const links = page.locator("#site-nav");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await expect(navbar).toHaveClass(/is-open/);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(links).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(navbar).not.toHaveClass(/is-open/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
});

test("homepage hides deferred sections and places Blog before Projects", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("#education-mount, #awards-mount, #education, #awards, #thesis, .thesis-entry, .education-entry, .award-entry")).toHaveCount(0);
  await expect(page.locator("#research-section")).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain('id="education-mount"');
  expect(html).not.toContain('id="awards-mount"');
  expect(await page.locator("#projects-mount").evaluate(element => element.previousElementSibling.classList.contains("blog-section-table"))).toBe(true);
  expect(await page.locator(".blog-section-table").evaluate(element => element.previousElementSibling.id)).toBe("experiences-mount");
  const links = page.locator(".navbar-links a");
  await expect(links).toHaveText(["CV", "Publications", "Open Source", "Experiences", "Blog"]);
  await expect(page.locator('.navbar-links a[href="#research"], .navbar-links a[href="#education"]')).toHaveCount(0);
  if (page.viewportSize().width <= 900) {
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await expect(page.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");
  }
  if ([1440, 390].includes(page.viewportSize().width)) {
    await page.locator(".navbar").screenshot({ path: `output/playwright/compact-navigation-${page.viewportSize().width}.png` });
  }
  await links.first().focus();
  await expect(links.first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(links.nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#Publications")).toBeInViewport();
  if (page.viewportSize().width <= 900) await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeVisible();
});

test("homepage preserves content and has no horizontal overflow", async ({
  page,
}) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("posts.json")) {
      consoleErrors.push(message.text());
    }
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("h1")).toContainText("Wenbo Ji");
  await expect(page.locator("h1")).toHaveText("Wenbo Ji 嵇文博");
  await expect(page.locator("h1 ruby, h1 rt, h1 .name-ruby")).toHaveCount(0);
  for (const id of [
    "research",
    "Publications",
    "experiences",
    "projects",
    "blog",
    "gallery",
  ]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await expect(
    page.locator("#technical-report, .technical-report-entry"),
  ).toHaveCount(0);
  await expect(
    page.getByText("Object-Centric 3D Reconstruction and Decomposition", {
      exact: true,
    }),
  ).toHaveCount(0);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
});

test("homepage footer shows the update date without template promotion", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("posts.json")) {
      consoleErrors.push(message.text());
    }
  });
  await page.goto("/", { waitUntil: "networkidle" });

  const footer = page.locator(".site-footer");
  await expect(footer.locator(".footer-updated")).toHaveText(`Last Updated on ${site.updated.replaceAll("-", "/")}`);
  await expect(footer).not.toContainText("Need your own academic homepage?");
  await expect(footer.getByRole("link", { name: "Use the open-source template" })).toHaveCount(0);
  await expect(footer.locator(".footer-template-prompt, .footer-template-link")).toHaveCount(0);

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
});

test("all homepage section headings share the intended typography", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  const headings = await page
    .locator("h2.section-heading")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
        };
      }),
    );

  expect(headings).toHaveLength(8);
  expect(new Set(headings.map((heading) => heading.fontFamily)).size).toBe(1);
  expect(new Set(headings.map((heading) => heading.fontSize)).size).toBe(1);
  expect(new Set(headings.map((heading) => heading.fontWeight))).toEqual(
    new Set(["600"]),
  );
  expect(headings[0].fontSize).toBe(
    testInfo.project.name.startsWith("desktop-") ? "28px" : "24px",
  );
});

test("core content roles follow the shared typography contract", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const typography = await page.evaluate(() => {
    const selectors = {
      pageTitle: ".type-page-title",
      sectionTitle: ".type-section-title",
      entryTitle: ".type-entry-title",
      subsectionTitle: ".type-subsection-title",
      groupLabel: ".type-group-label",
      body: ".type-body:not(.type-body--emphasis, .type-body--entry-description)",
      entryDescription: ".type-body--entry-description",
      bodyEmphasis: ".type-body--emphasis",
      secondary: ".type-secondary",
      meta: ".type-meta",
      caption: ".type-caption",
      control: ".type-control",
      resourceControl: ".type-resource-control",
      navigation: ".nav-link-label",
    };

    return Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => [
        name,
        Array.from(document.querySelectorAll(selector), (element) => {
          const style = getComputedStyle(element);
          return {
            text: element.textContent.trim().replace(/\s+/g, " ").slice(0, 80),
            fontFamily: style.fontFamily,
            fontSize: Number.parseFloat(style.fontSize),
            fontStyle: style.fontStyle,
            fontWeight: style.fontWeight,
            lineHeight: Number.parseFloat(style.lineHeight),
            letterSpacing: style.letterSpacing,
            textTransform: style.textTransform,
          };
        }),
      ]),
    );
  });

  const isDesktop = testInfo.project.name.startsWith("desktop-");
  const expected = {
    pageTitle: {
      size: isDesktop ? 40 : 32, weight: "700", leading: 1.15,
      letterSpacing: isDesktop ? "-1px" : "-0.8px",
    },
    sectionTitle: {
      size: isDesktop ? 28 : 24, weight: "600", leading: 1.25,
      letterSpacing: isDesktop ? "-0.42px" : "-0.36px",
    },
    entryTitle: {
      size: 18, weight: "600", leading: 1.35, letterSpacing: "-0.18px",
    },
    subsectionTitle: { size: 16, weight: "600", leading: 1.4 },
    groupLabel: { size: 14, weight: "600", leading: 1.4 },
    body: { size: 16, weight: "400", leading: 1.65 },
    entryDescription: { size: 15, weight: "400", leading: 1.6 },
    bodyEmphasis: { size: 16, weight: "600", leading: 1.65 },
    secondary: { size: 14, weight: "400", leading: 1.55 },
    meta: { size: 13, weight: "500", leading: 1.45 },
    caption: { size: 13, weight: "400", leading: 1.5 },
    control: { size: 15, weight: "500", leading: 1.4 },
    resourceControl: { size: 13, weight: "500", leading: 1.5 },
    navigation: { size: isDesktop ? 15 : 16, weight: "500", leading: 1.4 },
  };
  const expectedFontFamily = typography.pageTitle[0].fontFamily;

  expect(expectedFontFamily).toContain("Inter");
  for (const [role, metrics] of Object.entries(typography)) {
    expect(metrics.length, `${role} has no rendered examples`).toBeGreaterThan(
      0,
    );
    for (const metric of metrics) {
      const label = `${role}: ${metric.text}`;
      expect(metric.fontFamily, label).toBe(expectedFontFamily);
      expect(metric.fontStyle, label).toBe("normal");
      expect(metric.fontSize, label).toBeCloseTo(expected[role].size, 2);
      expect(metric.fontWeight, label).toBe(expected[role].weight);
      expect(metric.lineHeight, label).toBeCloseTo(
        expected[role].size * expected[role].leading,
        2,
      );
      expect(metric.letterSpacing, label).toBe(
        expected[role].letterSpacing || "normal",
      );
      expect(metric.textTransform, label).toBe(
        expected[role].textTransform || "none",
      );
    }
  }

  const moduleDescriptions = await page.evaluate(() => {
    const selectors = [
      ".publication-entry .entry-summary", ".career-entry .entry-contrib",
      ".project-entry .entry-summary", ".project-showcase-subtitle",
    ];
    return selectors.map(selector => ({ selector, elements: Array.from(document.querySelectorAll(selector), element => {
      const style = getComputedStyle(element);
      return { role: element.classList.contains("type-body--entry-description"), size: style.fontSize, weight: style.fontWeight, leading: style.lineHeight };
    }) }));
  });
  for (const module of moduleDescriptions) {
    expect(module.elements.length, module.selector).toBeGreaterThan(0);
    for (const element of module.elements) expect(element, module.selector).toEqual({ role: true, size: "15px", weight: "400", leading: "24px" });
  }
  const primaryBodies = await page.locator(".hero-bio-cell .type-body, .news-body, .research-arc-text, .education-degree, .education-mobile-line").evaluateAll(elements => elements.map(element => getComputedStyle(element).fontSize));
  expect(new Set(primaryBodies)).toEqual(new Set(["16px"]));
  const labels = await page.locator(".entry-label, .collab-heading").evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return [style.fontSize, style.fontWeight, style.lineHeight, style.color];
  }));
  for (const label of labels) expect(label).toEqual(["14px", "600", "19.6px", "rgb(68, 87, 107)"]);
  await expect(page.locator(".project-entry .entry-label")).toHaveCount(0);
  for (const project of projects) {
    await expect(page.locator(`#${project.id} .entry-summary`)).toHaveCount(1);
  }

  expect(expected.pageTitle.size).toBeGreaterThan(expected.sectionTitle.size);
  expect(expected.sectionTitle.size).toBeGreaterThan(expected.entryTitle.size);
  expect(expected.entryTitle.size).toBeGreaterThan(expected.body.size);
  expect(expected.body.size).toBeGreaterThan(expected.groupLabel.size);
});

test("core content roles use a semantic heading outline", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator("h1.type-page-title")).toHaveCount(1);
  await expect(page.locator("h2.type-section-title")).toHaveText(["News", "Research Interests", "Selected Publications", "Open Source Contributions", "Experiences", "Blog", "Projects", "Gallery"]);
  await expect(page.locator("article h3.type-entry-title")).not.toHaveCount(0);
  await expect(page.locator("article h4.type-group-label")).not.toHaveCount(0);
  await expect(page.locator(".research-arc h3.type-subsection-title")).toHaveCount(
    3,
  );

  const outline = await page
    .locator("h1, h2, h3, h4, h5, h6")
    .evaluateAll((headings) =>
      headings.map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: heading.textContent.trim(),
      })),
    );

  expect(outline.every(({ text }) => text.length > 0)).toBe(true);
  for (let index = 1; index < outline.length; index += 1) {
    expect(outline[index].level - outline[index - 1].level).toBeLessThanOrEqual(
      1,
    );
  }
});

test("research, project, and PR badges are omitted", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".research-tags, .research-interest-tag, .publication-controls, .publication-control-tag, .entry-control-tag")).toHaveCount(0);
  await expect(page.locator(".publication-entry .tag, .career-entry .tag")).toHaveCount(0);
  await expect(page.locator("#open-source-section [data-contribution-category]")).toHaveCount(0);
  await expect(page.locator("#open-source-section .contribution-repository-intro").first()).toBeVisible();
  await page.locator("#open-source-section summary").first().click();
  await expect(page.locator("#open-source-section .tag, #open-source-section [data-pr-tag]")).toHaveCount(0);
  const starts = await page.locator(".research-arc-text").evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return box.left;
  }));
  expect(starts).toHaveLength(3);
  expect(Math.max(...starts) - Math.min(...starts)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("research interests show three stacked directions without timeline decoration at nine widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Explicit breakpoint check runs once");
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const list = page.getByRole("list", { name: "Research interests", exact: true });
  await expect(list).toHaveJSProperty("tagName", "UL");
  await expect(list.locator(":scope > li")).toHaveCount(3);
  await expect(page.locator("#research")).toHaveText("Research Interests");
  await expect(page.locator(".research-arc-label")).toHaveText([
    "Controllable video generation", "Multimodal AI infrastructure", "Spatial intelligence and embodied AI",
  ]);
  await expect(page.locator(".research-arc-text")).toHaveText(researchArc.map(item => item.text));
  await expect(list.locator(".research-arc-dot, a, img, svg, button")).toHaveCount(0);
  for (const width of [1440, 1366, 1024, 901, 900, 768, 390, 375, 360]) {
    await page.setViewportSize({ width, height: width <= 900 ? 812 : 900 });
    const rows = await page.locator(".research-arc-item").evaluateAll(items => items.map(item => {
      const row = item.getBoundingClientRect();
      const label = item.querySelector(".research-arc-label").getBoundingClientRect();
      const text = item.querySelector(".research-arc-text").getBoundingClientRect();
      const line = getComputedStyle(item, "::before");
      return {
        top: row.top, bottom: row.bottom, left: row.left,
        labelLeft: label.left, textLeft: text.left,
        fits: label.right <= row.right + 1 && text.right <= row.right + 1 && text.bottom <= row.bottom + 1,
        textGap: text.top - label.bottom,
        connector: !["none", "normal"].includes(line.content),
      };
    }));
    for (const [index, row] of rows.entries()) {
      expect(row.labelLeft).toBeCloseTo(rows[0].labelLeft, 1);
      expect(row.textLeft).toBeCloseTo(rows[0].textLeft, 1);
      expect(row.labelLeft).toBeCloseTo(row.textLeft, 1);
      expect(row.textGap).toBeCloseTo(8, 1);
      expect(row.fits).toBe(true);
      expect(row.connector).toBe(false);
      if (index) expect(row.top - rows[index - 1].bottom).toBeCloseTo(24, 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([1440, 1366, 390, 375, 360].includes(width)) {
      await page.locator("#research-section").screenshot({ path: `output/playwright/research-vertical-${width}.png` });
    }
  }
});

test("entry-section headings and media share a left edge at nine widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Explicit breakpoint check runs once");
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  for (const width of [1440, 1366, 1024, 901, 900, 768, 390, 375, 360]) {
    await page.setViewportSize({ width, height: width <= 900 ? 812 : 900 });
    const sections = await page.locator("#publications-mount, #experiences-mount, #projects-mount").evaluateAll(elements => elements.map(section => {
      const left = section.querySelector("h2").getBoundingClientRect().left;
      return {
        id: section.id,
        left,
        entries: Array.from(section.querySelectorAll("article"), article => {
          const stack = article.querySelector(".entry-visual-stack, .experience-logo-stack");
          const imageBox = stack.querySelector("img").getBoundingClientRect();
          const cardBox = stack.querySelector("img").parentElement.getBoundingClientRect();
          return {
            id: article.id,
            left: article.getBoundingClientRect().left,
            stackLeft: stack.getBoundingClientRect().left,
            imageLeft: stack.querySelector("img").getBoundingClientRect().left,
            imageCenterOffset: (imageBox.left + imageBox.right - cardBox.left - cardBox.right) / 2,
            imageHeight: imageBox.height,
            contentLeft: article.querySelector(".entry-content-cell").getBoundingClientRect().left,
            imagesFit: Array.from(stack.querySelectorAll("img")).every(image => {
              const imageBox = image.getBoundingClientRect();
              const cardBox = image.parentElement.getBoundingClientRect();
              const aligned = article.id === "robot-world-model"
                ? imageBox.left >= cardBox.left - 1
                : Math.abs(imageBox.left - cardBox.left) <= 1;
              return aligned && imageBox.right <= cardBox.right + 1;
            }),
          };
        }),
      };
    }));
    expect(sections).toHaveLength(3);
    for (const section of sections) {
      expect(section.entries.length).toBeGreaterThan(0);
      for (const entry of section.entries) {
        const context = `${width}px ${section.id}/${entry.id}`;
        expect(Math.abs(entry.left - section.left), context).toBeLessThanOrEqual(1);
        expect(Math.abs(entry.stackLeft - section.left), context).toBeLessThanOrEqual(1);
        if (entry.id === "robot-world-model") {
          expect(Math.abs(entry.imageCenterOffset), context).toBeLessThanOrEqual(1);
          expect(entry.imageHeight, context).toBe(width <= 900 ? 42 : 36);
        } else {
          expect(Math.abs(entry.imageLeft - section.left), context).toBeLessThanOrEqual(1);
        }
        expect(entry.contentLeft, context).toBeGreaterThanOrEqual(section.left - 1);
        expect(entry.imagesFit, context).toBe(true);
      }
    }
    const contributionEdges = await page.locator("#open-source-section").evaluate(section => [
      section.querySelector("h2"),
      section.querySelector(".contributions-panel"),
      ...section.querySelectorAll(".contribution-repository"),
    ].map(element => element.getBoundingClientRect().left));
    for (const left of contributionEdges) {
      expect(Math.abs(left - sections[0].left), `${width}px open source alignment`).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([1366, 375].includes(width)) {
      await page.locator("#publications-mount").screenshot({ path: `output/playwright/entry-alignment-${width}.png` });
      await page.locator("#robot-world-model").screenshot({ path: `output/playwright/robot-logo-centered-${width}.png`, style: ".navbar, .skip-link { visibility: hidden; }" });
    }
  }
});

test("homepage entry titles wrap without truncation or overflow", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const titles = await page.locator(".type-entry-title").evaluateAll(elements =>
    elements.filter(element => element.getBoundingClientRect().width > 0).map(element => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      return {
        text: element.textContent.trim(),
        size: style.fontSize,
        whiteSpace: style.whiteSpace,
        lineClamp: style.webkitLineClamp,
        textFits: Array.from(range.getClientRects()).every(rect =>
          rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.bottom <= box.bottom + 1,
        ),
      };
    }),
  );
  expect(titles.length).toBeGreaterThan(10);
  for (const title of titles) {
    expect(title.size, title.text).toBe("18px");
    expect(title.whiteSpace, title.text).toBe("normal");
    expect(title.lineClamp, title.text).toBe("none");
    expect(title.textFits, title.text).toBe(true);
  }
});

test("publication titles stay complete and fit one line on a wide desktop", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.locator(".publication-entry .entry-title").evaluateAll((titles) =>
    titles.map((title) => {
      const style = getComputedStyle(title);
      const box = title.getBoundingClientRect();
      const parentStyle = getComputedStyle(title.closest(".entry-content-cell"));
      const parentBox = title.closest(".entry-content-cell").getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(title);
      return {
        id: title.closest("article").id,
        text: title.textContent.trim(),
        size: style.fontSize,
        whiteSpace: style.whiteSpace,
        overflow: style.overflow,
        lineClamp: style.webkitLineClamp,
        width: box.width,
        availableWidth: parentBox.width - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight) - parseFloat(parentStyle.borderLeftWidth) - parseFloat(parentStyle.borderRightWidth),
        lines: Math.round(box.height / parseFloat(style.lineHeight)),
        textFits: Array.from(range.getClientRects()).every((rect) =>
          rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.bottom <= box.bottom + 1,
        ),
      };
    }),
  );
  expect(metrics).toHaveLength(publications.length);
  for (const metric of metrics) {
    const expected = publications.find((publication) => publication.id === metric.id);
    expect(metric.text).toBe(expected.title);
    expect(metric.size).toBe("18px");
    expect(metric.whiteSpace).toBe("normal");
    expect(metric.overflow).toBe("visible");
    expect(metric.lineClamp).toBe("none");
    expect(metric.width).toBeCloseTo(metric.availableWidth, 1);
    expect(metric.textFits, metric.text).toBe(true);
    if (testInfo.project.name === "desktop-1440") {
      expect(metric.lines, metric.text).toBe(1);
    }
  }
});

test("publication content uses spacing instead of repeated labels", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  for (const publication of publications) {
    const metadata = page.locator(`#${publication.id} .publication-meta-row .entry-meta`);
    await expect(metadata).toHaveText(`${publication.venue} ${publication.year}`);
    await expect(metadata).toHaveCSS("text-transform", "none");
  }
  await expect(page.locator(".entry-label", { hasText: /^(Authors|Overview)$/ })).toHaveCount(0);
  await expect(page.locator(".entry-label", { hasText: "Focus" })).toHaveCount(0);
  await expect(page.locator(".collab-heading", { hasText: "Mentors" })).toHaveCount(0);
  const geometry = await page.locator("#publications-mount").evaluate((section) => {
    const article = section.querySelector("article");
    const box = (selector) => article.querySelector(selector).getBoundingClientRect();
    const title = box(".entry-title");
    const meta = box(".publication-meta-row");
    const authors = box(".entry-authors");
    const toggle = box(".publication-tldr-toggle");
    const resources = box(".resource-text-link");
    return {
      sectionGap: article.getBoundingClientRect().top - section.querySelector("header").getBoundingClientRect().bottom,
      titleToMeta: meta.top - title.bottom,
      metaToAuthors: authors.top - meta.bottom,
      authorsToResources: resources.top - authors.bottom,
      toggleHeight: toggle.height,
      featuredAuthorWeight: getComputedStyle(article.querySelector(".entry-byline strong")).fontWeight,
      dateNumerals: getComputedStyle(article.querySelector(".entry-meta")).fontVariantNumeric,
    };
  });
  expect(geometry.sectionGap).toBeCloseTo(testInfo.project.name.startsWith("desktop-") ? 20 : 16, 1);
  expect(geometry.titleToMeta).toBeCloseTo(10, 1);
  expect(geometry.metaToAuthors).toBeCloseTo(10, 1);
  expect(geometry.authorsToResources).toBeCloseTo(10, 1);
  expect(geometry.toggleHeight).toBe(testInfo.project.name.startsWith("desktop-") ? 24 : 44);
  expect(geometry.featuredAuthorWeight).toBe("600");
  expect(geometry.dateNumerals).toBe("tabular-nums");
  const firstPublication = page.locator(".publication-entry").first();
  await firstPublication.locator("summary").click();
  const summaryGap = await firstPublication.evaluate(article =>
    article.querySelector(".entry-summary").getBoundingClientRect().top -
    article.querySelector("summary").getBoundingClientRect().bottom,
  );
  expect(summaryGap).toBeCloseTo(8, 1);
});

test("publication controls align and expanded summaries occupy the full content width", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  const height = page.viewportSize().width > 900 ? 24 : 44;
  for (const publication of publications) {
    const article = page.locator(`#${publication.id}`);
    const toggle = article.locator("summary");
    await expect(toggle).toHaveCSS("color", "rgb(96, 115, 135)");
    await expect(toggle).toHaveCSS("font-size", "13px");
    await expect(toggle).toHaveCSS("font-weight", "500");
    await expect(toggle).toHaveCSS("line-height", "19.5px");
    await expect(toggle).toHaveCSS("text-decoration-line", "none");
    await expect(toggle).toHaveCSS("border-width", "0px");
    await expect(toggle).toHaveCSS("border-radius", "0px");
    await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(article.locator("details[open]")).toHaveCount(0);
    await toggle.click();
    const geometry = await article.evaluate(element => {
      const box = selector => element.querySelector(selector).getBoundingClientRect();
      const toggle = box("summary"), body = box(".entry-summary");
      const row = box(".publication-actions");
      const links = [...element.querySelectorAll(".resource-text-link")].map(link => link.getBoundingClientRect());
      return {
        topDifference: links[0].top - toggle.top, gap: links[0].left - toggle.right,
        toggleHeight: toggle.height,
        resourceHeights: links.map(link => link.height),
        bodyLeft: body.left - row.left, bodyWidth: body.width - row.width,
        bodyGap: body.top - Math.max(toggle.bottom, ...links.map(link => link.bottom)),
        bottomGap: row.bottom - body.bottom,
      };
    });
    expect(geometry.topDifference).toBeCloseTo(0, 1);
    expect(geometry.gap).toBeCloseTo(12, 1);
    expect(geometry.toggleHeight).toBe(height);
    for (const resourceHeight of geometry.resourceHeights) expect(resourceHeight).toBe(height);
    expect(geometry.bodyLeft).toBeCloseTo(0, 1);
    expect(geometry.bodyWidth).toBeCloseTo(0, 1);
    expect(geometry.bodyGap).toBeCloseTo(8, 1);
    expect(geometry.bottomGap).toBeCloseTo(0, 1);
    await toggle.hover();
    await expect(toggle).toHaveCSS("color", "rgb(47, 62, 77)");
    await expect(toggle).toHaveCSS("text-decoration-line", "underline");
    await toggle.focus();
    await page.keyboard.press("Tab");
    await expect(article.locator(".resource-text-link").first()).toBeFocused();
    await page.mouse.move(0, 0);
  }
});

test("publication TLDR layout wraps safely at seven widths without JavaScript", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Explicit breakpoint check runs once");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const width of [1440, 1024, 901, 900, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("http://127.0.0.1:4173/#Publications");
    const article = page.locator("#litetracker-publication");
    await expect(article.locator(".entry-summary")).toBeHidden();
    if ([1440, 390].includes(width)) {
      await article.screenshot({ path: `output/playwright/resource-grid/collapsed-${width}.png` });
      await page.locator(".project-entry").first().screenshot({ path: `output/playwright/resource-grid/project-${width}.png` });
    }
    await article.locator("summary").click();
    await expect(article.locator(".entry-summary")).toBeVisible();
    const grids = await page.locator(".publication-actions, .project-entry .entry-links--text").evaluateAll(elements => elements.map(element => {
      const bounds = element.getBoundingClientRect();
      const controls = [...element.querySelectorAll("summary, .resource-text-link")].map(control => control.getBoundingClientRect());
      const columns = Math.floor((bounds.width + 12) / 76);
      const available = element.closest(".publication-actions") || element.parentElement;
      return Math.abs(bounds.width - available.getBoundingClientRect().width) < 1 &&
        controls.every((box, index) => Math.abs(box.width - 64) < 1 &&
        Math.abs(box.height - (innerWidth > 900 ? 24 : 44)) < 1 &&
        Math.abs(box.left - bounds.left - (index % columns) * 76) < 1 &&
        Math.abs(box.top - bounds.top - Math.floor(index / columns) * (box.height + 4)) < 1);
    }));
    expect(grids.every(Boolean)).toBe(true);
    const fits = await article.evaluate(element => {
      const summary = element.querySelector(".entry-summary").getBoundingClientRect();
      const actions = element.querySelector(".publication-actions").getBoundingClientRect();
      const controls = [...element.querySelectorAll("summary, .resource-text-link")].map(link => link.getBoundingClientRect());
      return summary.top >= Math.max(...controls.map(box => box.bottom)) + 7 &&
        Math.abs(summary.width - actions.width) < 1 && controls.every(box => box.left >= actions.left - 1 && box.right <= actions.right + 1);
    });
    expect(fits).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([1440, 390].includes(width)) {
      await page.mouse.move(0, 0);
      await article.screenshot({ path: `output/playwright/publication-tldr/expanded-${width}.png` });
    }
    // Force wrapping and a long summary without changing editorial content.
    await article.locator(".publication-actions").evaluate(element => { element.style.width = "220px"; });
    await article.locator(".entry-summary").evaluate(element => { element.textContent = element.textContent.repeat(4); });
    expect(await article.evaluate(element => {
      const body = element.querySelector(".entry-summary").getBoundingClientRect();
      const links = [...element.querySelectorAll(".resource-text-link")].map(link => link.getBoundingClientRect());
      return links.at(-1).top > links[0].top && body.top >= Math.max(...links.map(link => link.bottom)) + 7;
    })).toBe(true);
    await page.reload();
    await expect(article.locator(".entry-summary")).toBeHidden();
  }
  await context.close();
});

test("publication TLDRs start collapsed and keep complete content", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".publication-tldr")).toHaveCount(publications.length);
  await expect(page.locator(".publication-tldr[open]")).toHaveCount(0);
  for (const publication of publications) {
    const article = page.locator(`#${publication.id}`);
    await expect(article.locator(".entry-title")).toBeVisible();
    await expect(article.locator(".publication-meta-row")).toBeVisible();
    await expect(article.locator(".entry-authors")).toBeVisible();
    await expect(article.locator(".publication-tldr-toggle")).toHaveAccessibleName(`TL;DR — ${publication.title}`);
    await expect(article.locator(".publication-tldr-toggle")).toHaveText("TL;DR");
    await expect(article.locator(".entry-summary")).toBeHidden();
    await expect(article.locator(".entry-summary")).toHaveText(publication.summary);
  }
  await expect(page.locator(".project-entry .entry-summary").first()).toBeVisible();
  await expect(page.locator(".thesis-entry")).toHaveCount(0);
});

test("publication TLDRs toggle independently and expand without clipping", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const readContent = () => page.locator(".publication-entry").evaluateAll(articles => articles.map(article => ({
    title: article.querySelector("h3").textContent.trim(),
    authors: article.querySelector(".entry-authors").textContent.trim(),
    links: Array.from(article.querySelectorAll("a"), link => ({text: link.textContent.trim(), href: link.getAttribute("href"), label: link.getAttribute("aria-label")})),
  })));
  const baseline = await readContent();
  const first = page.locator("#csg-fusion-publication .publication-tldr");
  const second = page.locator("#litetracker-publication .publication-tldr");
  await first.locator("summary").click();
  await expect(first.locator(".entry-summary")).toBeVisible();
  await expect(page.locator(".publication-tldr[open]")).toHaveCount(1);
  await second.locator("summary").click();
  await expect(page.locator(".publication-tldr[open]")).toHaveCount(2);
  await first.locator("summary").click();
  await expect(first.locator(".entry-summary")).toBeHidden();
  await expect(second.locator(".entry-summary")).toBeVisible();
  for (const publication of publications) {
    const details = page.locator(`#${publication.id} .publication-tldr`);
    if (!(await details.evaluate(element => element.open))) await details.locator("summary").click();
    await expect(details.locator(".entry-summary")).toHaveText(publication.summary);
  }
  const metrics = await page.locator(".publication-tldr .entry-summary").evaluateAll(elements => elements.map(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const bounds = element.getBoundingClientRect();
    const cell = element.closest(".entry-content-cell").getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      fits: Array.from(range.getClientRects()).every(rect => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && rect.bottom <= bounds.bottom + 1),
      withinCell: bounds.left >= cell.left - 1 && bounds.right <= cell.right + 1,
      fontSize: style.fontSize,
      whiteSpace: style.whiteSpace,
      lineClamp: style.webkitLineClamp,
    };
  }));
  for (const metric of metrics) {
    expect(metric.fits).toBe(true);
    expect(metric.withinCell).toBe(true);
    expect(metric.fontSize).toBe("15px");
    expect(metric.whiteSpace).toBe("normal");
    expect(metric.lineClamp).toBe("none");
  }
  expect(await readContent()).toEqual(baseline);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".publication-tldr[open]")).toHaveCount(0);
});

test("publication TLDRs support visible keyboard focus and native activation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  const toggle = page.locator("#csg-fusion-publication .publication-tldr-toggle");
  const body = page.locator("#csg-fusion-publication .publication-tldr .entry-summary");
  await toggle.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  expect(await toggle.evaluate(element => element.matches(":focus-visible"))).toBe(true);
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await expect(toggle).toHaveCSS("outline-width", "2px");
  await expect(toggle).toHaveCSS("font-size", "13px");
  const color = await toggle.evaluate(element => getComputedStyle(element).color);
  await page.keyboard.press("Enter");
  await expect(body).toBeVisible();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("color", color);
  await page.keyboard.press("Space");
  await expect(body).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("experience content and metadata are visible without topic badges", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".career-entry details, .career-entry summary, .career-entry .entry-control-tag")).toHaveCount(0);
  await expect(page.locator(".entry-tldr[open]")).toHaveCount(0);
  for (const experience of experiences) {
    const article = page.locator(`#${experience.id}`);
    await expect(article.locator(".entry-title")).toHaveText(experience.title);
    await expect(article.locator(".entry-title")).toBeVisible();
    await expect(article.locator(".experience-side-meta")).toHaveText(experience.date);
    await expect(article.locator(".experience-type")).toHaveText(experience.type);
    await expect(article.locator(".experience-type")).toBeVisible();
    await expect(article.locator(".experience-type")).toHaveCSS("text-transform", "none");
    await expect(article.locator(".experience-side-meta .entry-meta")).toHaveCount(1);
    const titleBox = await article.locator(".entry-title").boundingBox();
    const dateBox = await article.locator(".experience-side-meta").boundingBox();
    const typeBox = await article.locator(".entry-type-row").boundingBox();
    if (testInfo.project.name.startsWith("desktop-")) {
      expect(dateBox.y).toBeCloseTo(titleBox.y, 1);
      expect(dateBox.x).toBeGreaterThan(titleBox.x);
    } else {
      expect(typeBox.y - titleBox.y - titleBox.height).toBeCloseTo(8, 1);
      expect(dateBox.y - typeBox.y - typeBox.height).toBeCloseTo(8, 1);
      expect(Math.abs(dateBox.x - titleBox.x)).toBeLessThanOrEqual(1);
    }
    await expect(article.locator(".entry-contrib")).toBeVisible();
    await expect(article.locator(".entry-label")).toHaveCount(0);
    await expect(article.locator(".collab-section")).toHaveCount(0);
    const contributions = await article.locator(".entry-contrib li").evaluateAll((items, expected) => items.map((item, index) => {
      const source = document.createElement("div");
      source.innerHTML = expected[index];
      const normalize = value => value.trim().replace(/\s+/g, " ");
      return normalize(item.textContent) === normalize(source.textContent);
    }), experience.contributions);
    expect(contributions).toHaveLength(experience.contributions.length);
    expect(contributions.every(Boolean)).toBe(true);
  }
  const geometry = await page.locator(".career-entry").evaluateAll(articles => articles.map(article => {
    const row = article.querySelector(".experience-content").getBoundingClientRect();
    const title = article.querySelector(".entry-title").getBoundingClientRect();
    const career = article.classList.contains("career-entry");
    const mobile = window.innerWidth <= 900;
    const header = article.querySelector(career ? (mobile ? ".entry-title" : ".career-title-row") : ".document-title-row").getBoundingClientRect();
    const headerGroup = career ? article.querySelector(".career-entry-header").getBoundingClientRect() : null;
    const type = article.querySelector(".entry-type-row").getBoundingClientRect();
    return {
      oldTag: Boolean(article.querySelector(".entry-media-cell .tag")),
      career,
      belowTitle: row.top >= title.bottom + 9,
      typeGap: type.top - header.bottom,
      controlGap: row.top - (headerGroup ? headerGroup.bottom : type.bottom),
      left: row.left - title.left,
    };
  }));
  for (const box of geometry) {
    expect(box.oldTag).toBe(false);
    expect(box.belowTitle).toBe(true);
    expect(box.typeGap).toBeCloseTo(box.career && !testInfo.project.name.startsWith("desktop-") ? 8 : 10, 1);
    expect(box.controlGap).toBeCloseTo(10, 1);
    expect(box.left).toBeCloseTo(0, 1);
  }
});

test("experience content stays full-width and visible after reload", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".publication-tldr[open]")).toHaveCount(0);
  const metrics = await page.locator(".career-entry").evaluateAll(articles => articles.map(article => {
    const content = article.querySelector(".experience-content").getBoundingClientRect();
    const row = article.querySelector(".career-entry-header").getBoundingClientRect();
    const header = article.querySelector(".career-entry-header").getBoundingClientRect();
    const texts = Array.from(article.querySelectorAll(".entry-contrib li, .collab-row, .entry-summary"));
    let contributionSpacing = null;
    if (article.classList.contains("career-entry")) {
      const body = article.querySelector(".entry-contrib");
      const items = Array.from(body.children, item => item.getBoundingClientRect());
      contributionSpacing = {
        bodyTop: body.getBoundingClientRect().top - content.top,
        paragraphGaps: items.slice(1).map((item, index) => item.top - items[index].bottom),
        bodyColor: getComputedStyle(body).color,
      };
    }
    return {
      contributionSpacing,
      width: content.width - row.width, left: content.left - row.left,
      gap: content.top - header.bottom,
      fits: texts.every(element => {
        const range = document.createRange();range.selectNodeContents(element);
        return Array.from(range.getClientRects()).every(rect => rect.left >= content.left - 1 && rect.right <= content.right + 1 && rect.bottom <= content.bottom + 1);
      }),
    };
  }));
  for (const metric of metrics) {
    expect(metric.width).toBeCloseTo(0, 1);
    expect(metric.left).toBeCloseTo(0, 1);
    expect(metric.gap).toBeCloseTo(10, 1);
    expect(metric.fits).toBe(true);
    if (metric.contributionSpacing) {
      const spacing = metric.contributionSpacing;
      expect(spacing.bodyTop).toBeCloseTo(0, 1);
      for (const gap of spacing.paragraphGaps) expect(gap).toBeCloseTo(8, 1);
      expect(spacing.bodyColor).toBe("rgb(82, 100, 118)");
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.reload({ waitUntil: "networkidle" });
  for (const content of await page.locator(".career-entry .experience-content").all()) await expect(content).toBeVisible();
});

test("descriptions never exceed their owning entry or section title", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const comparisons = await page
    .locator("article .type-body, .research-arc-item .type-body")
    .evaluateAll((bodies) =>
      bodies.flatMap((body) => {
        const ownerTitle =
          body.closest("article")?.querySelector(".type-entry-title") ||
          body.closest("section")?.querySelector(".type-section-title");
        if (!ownerTitle) return [];
        return [
          {
            title: ownerTitle.textContent.trim(),
            titleSize: Number.parseFloat(getComputedStyle(ownerTitle).fontSize),
            bodySize: Number.parseFloat(getComputedStyle(body).fontSize),
          },
        ];
      }),
    );

  expect(comparisons.length).toBeGreaterThan(0);
  for (const comparison of comparisons) {
    expect(comparison.bodySize, comparison.title).toBeLessThanOrEqual(
      comparison.titleSize,
    );
  }
});

test("inline links inherit their content role typography", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const comparisons = await page
    .locator(".type-body a, .type-secondary a, .type-meta a, .type-caption a")
    .evaluateAll((links) => {
      const properties = [
        "fontFamily",
        "fontSize",
        "fontStyle",
        "fontWeight",
        "lineHeight",
        "letterSpacing",
        "textTransform",
      ];

      return links.map((link) => {
        const parentRole = link.closest(
          ".type-body, .type-secondary, .type-meta, .type-caption",
        );
        const linkStyle = getComputedStyle(link);
        const parentStyle = getComputedStyle(parentRole);
        return {
          text: link.textContent.trim(),
          link: Object.fromEntries(
            properties.map((property) => [property, linkStyle[property]]),
          ),
          parent: Object.fromEntries(
            properties.map((property) => [property, parentStyle[property]]),
          ),
        };
      });
    });

  expect(comparisons.length).toBeGreaterThan(0);
  for (const comparison of comparisons) {
    expect(comparison.link, comparison.text).toEqual(comparison.parent);
  }

  const control = page.locator("a.type-control").first();
  await control.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(control).toBeFocused();
  const outlineStyle = await control.evaluate(
    (element) => getComputedStyle(element).outlineStyle,
  );
  expect(outlineStyle).not.toBe("none");
});

test("inline text links inherit their parent color without default underlines", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const links = await page.locator(".type-body a, .type-secondary a, .type-meta a, .type-caption a").evaluateAll(elements => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    return elements.map(element => {
      const style = getComputedStyle(element);
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = style.textDecorationColor;
      context.fillRect(0, 0, 1, 1);
      return {
        text: element.textContent.trim(),
        color: style.color,
        parentColor: getComputedStyle(element.parentElement).color,
        decoration: style.textDecorationLine,
        thickness: style.textDecorationThickness,
        offset: Number.parseFloat(style.textUnderlineOffset),
        size: Number.parseFloat(style.fontSize),
        alpha: context.getImageData(0, 0, 1, 1).data[3],
      };
    });
  });
  expect(links.length).toBeGreaterThan(10);
  for (const link of links) {
    expect(link.color, link.text).toBe(link.parentColor);
    expect(link.decoration, link.text).toBe("none");
    expect(link.thickness, link.text).toBe("1px");
    expect(link.offset, link.text).toBeCloseTo(link.size * 0.2, 2);
    expect(Math.abs(link.alpha - 255 * 0.45), link.text).toBeLessThanOrEqual(1);
  }
});

test("text link hover and keyboard focus keep inherited color without underlines", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fusheng-ji.github.io/blog/posts.json", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "[]",
  }));
  await page.goto("/", { waitUntil: "networkidle" });
  for (const selector of [
    '.hero-bio-cell a[href="https://www.cit.tum.de/en/cit/home/"]',
    ".news-body a",
    ".publication-award a",
    "#dense-point-tracking .entry-contrib a",
  ]) {
    const link = page.locator(selector).first();
    await link.scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    await page.mouse.move(0, 0);
    const baseline = await link.evaluate(element => ({
      color: getComputedStyle(element.parentElement).color,
      href: element.getAttribute("href"),
      text: element.textContent.trim(),
    }));
    await link.hover();
    await expect(link, selector).toHaveCSS("color", baseline.color);
    await expect(link, selector).toHaveCSS("text-decoration-line", "none");
    await expect(link, selector).toHaveCSS("text-decoration-color", baseline.color);
    await page.mouse.move(0, 0);
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(link, selector).toBeFocused();
    await expect(link, selector).toHaveCSS("color", baseline.color);
    await expect(link, selector).toHaveCSS("text-decoration-line", "none");
    await expect(link, selector).toHaveCSS("text-decoration-color", baseline.color);
    await expect(link, selector).toHaveCSS("outline-style", "solid");
    await expect(link, selector).toHaveCSS("outline-width", "2px");
    expect(await link.evaluate(element => element.matches(":focus-visible")), selector).toBe(true);
    await expect(link, selector).toHaveAttribute("href", baseline.href);
    await expect(link, selector).toHaveText(baseline.text);
  }
});

test("navigation and card controls retain neutral link text without underlines", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fusheng-ji.github.io/blog/posts.json", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{ title: "A complete linked blog title", description: "A readable research note.", date: "2026-10-01", url: "/link-colors-test/" }]),
  }));
  await page.goto("/", { waitUntil: "networkidle" });
  if (!testInfo.project.name.startsWith("desktop-")) {
    await page.getByRole("button", { name: "Open navigation menu" }).click();
  }
  const navigation = page.locator(".navbar-links a").first();
  const label = navigation.locator(".nav-link-label");
  const color = await label.evaluate(element => getComputedStyle(element).color);
  await navigation.focus();
  await expect(label).toHaveCSS("color", color);
  expect(await navigation.evaluate(element => getComputedStyle(element).color)).not.toBe("rgb(23, 114, 208)");
  if (!testInfo.project.name.startsWith("desktop-")) {
    await page.getByRole("button", { name: "Close navigation menu" }).click();
  }
  const viewAll = page.locator(".blog-view-all");
  await viewAll.scrollIntoViewIfNeeded();
  const controlColor = await viewAll.evaluate(element => getComputedStyle(element).color);
  await viewAll.hover();
  await expect(viewAll).toHaveCSS("color", controlColor);
  await expect(viewAll).toHaveCSS("text-decoration-line", "none");
  await page.locator("#blog-list").scrollIntoViewIfNeeded();
  await expect(page.locator(".blog-card-link")).toHaveCount(1);
  const decorations = await page.locator(".navbar-links a, .blog-card-link, .entry-links a, .avatar-icons a").evaluateAll(elements =>
    elements.map(element => getComputedStyle(element).textDecorationLine),
  );
  expect(new Set(decorations)).toEqual(new Set(["none"]));
});

test("text controls and asynchronous blog states use canonical roles", async ({
  page,
}) => {
  let responseMode = "empty";
  await page.route("https://fusheng-ji.github.io/blog/posts.json", (route) => {
    if (responseMode === "empty") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    }
    return route.fulfill({ status: 503, body: "Unavailable" });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".news-toggle")).toHaveClass(/type-control/);
  await page.locator("#blog-list").scrollIntoViewIfNeeded();
  await expect(page.locator(".blog-empty.type-body")).toHaveText(
    "No blog posts yet.",
  );
  await expect(page.locator(".blog-empty")).toHaveCSS("font-size", "16px");

  responseMode = "error";
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#blog-list").scrollIntoViewIfNeeded();
  await expect(page.locator(".blog-error.type-body")).toHaveText(
    "Unable to load blog posts.",
  );
  await expect(page.locator(".blog-error")).toHaveCSS("font-size", "16px");
});

test("loaded blog cards retain the shared hierarchy and complete link names", async ({
  page,
}, testInfo) => {
  const title = "Understanding spatial representations: from geometric perception to generative models and interactive research systems";
  await page.route("https://fusheng-ji.github.io/blog/posts.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        title,
        description: "A research note on geometry, learning, and the practical choices behind building spatial systems. 中文与英文内容保持同样的正文层级。",
        date: "2026-09-30",
        readingTime: 8,
        url: "/typography-test/",
      }]),
    }),
  );
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("#blog-list").scrollIntoViewIfNeeded();
  const card = page.locator(".blog-card").first();
  await expect(card.locator("h3.type-entry-title")).toHaveText(title);
  await expect(card.getByRole("link")).toHaveAccessibleName(new RegExp(title));
  const metrics = await card.evaluate((element) => {
    const read = (selector) => {
      const style = getComputedStyle(element.querySelector(selector));
      return [style.fontSize, style.fontWeight, style.lineHeight];
    };
    const box = element.getBoundingClientRect();
    return {
      title: read(".blog-card-title"),
      body: read(".blog-card-desc"),
      meta: read(".blog-card-date"),
      left: box.left,
      right: box.right,
      width: document.documentElement.clientWidth,
      titleClamp: getComputedStyle(element.querySelector(".blog-card-title")).webkitLineClamp,
      titleHeight: element.querySelector(".blog-card-title").getBoundingClientRect().height,
      titleTextHeight: (() => {
        const range = document.createRange();
        range.selectNodeContents(element.querySelector(".blog-card-title"));
        return range.getBoundingClientRect().height;
      })(),
    };
  });
  expect(metrics.title).toEqual(["18px", "600", "24.3px"]);
  await expect(card.locator(".blog-card-desc")).toHaveClass(/type-body--entry-description/);
  await expect(card.locator(".blog-card-desc")).toHaveCSS("-webkit-line-clamp", "4");
  expect(metrics.body).toEqual(["15px", "400", "24px"]);
  expect(metrics.meta).toEqual(["13px", "500", "18.85px"]);
  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(metrics.width);
  expect(metrics.titleClamp).toBe("none");
  expect(metrics.titleTextHeight).toBeLessThanOrEqual(metrics.titleHeight + 1);
  await expect(card.locator(".blog-card-date")).toHaveCount(1);
  await expect(card.locator(".blog-card-date")).toBeVisible();
  await expect(card.locator(".blog-card-reading")).toBeVisible();
  const titleBox = await card.locator(".blog-card-title").boundingBox();
  const metaBox = await card.locator(".blog-card-top").boundingBox();
  const dateBox = await card.locator(".blog-card-date").boundingBox();
  const bodyBox = await card.locator(".blog-card-desc").boundingBox();
  expect(Math.abs(dateBox.x - titleBox.x)).toBeLessThanOrEqual(1);
  if (testInfo.project.name.startsWith("desktop-")) {
    expect(titleBox.y - metaBox.y - metaBox.height).toBeCloseTo(18, 1);
  } else {
    expect(metaBox.y - titleBox.y - titleBox.height).toBeCloseTo(8, 1);
    expect(bodyBox.y - metaBox.y - metaBox.height).toBeCloseTo(10, 1);
  }
  const capsulesFit = await card.locator(".blog-card-top-meta").evaluate(element => {
    const row = element.getBoundingClientRect();
    return Array.from(element.children).every(child => {
      const box = child.getBoundingClientRect();
      return box.left >= row.left - 1 && box.right <= row.right + 1;
    });
  });
  expect(capsulesFit).toBe(true);
});

test("entry metadata uses one restrained type scale", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const metadataSizes = await page
    .locator(
      ".publication-meta-row .entry-meta, .experience-side-meta .entry-meta, .project-meta-row .entry-meta, .award-year, .experience-type, .topic-location, .publication-note",
    )
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).fontSize),
    );
  const entryTitleSize = await page
    .locator(".entry-title")
    .first()
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );

  expect(metadataSizes.length).toBeGreaterThan(0);
  expect(new Set(metadataSizes)).toEqual(new Set(["13px"]));
  expect(13).toBeLessThan(entryTitleSize);
  const isDesktop = testInfo.project.name.startsWith("desktop-");
  if (!isDesktop) {
    for (const entry of await page.locator(".project-entry, .award-entry, .publication-entry").all()) {
      const title = await entry.locator(".entry-title").boundingBox();
      const date = await entry.locator(".project-meta-row, .award-year, .publication-meta-row .entry-meta").boundingBox();
      expect(date.y).toBeGreaterThanOrEqual(title.y + title.height);
      expect(Math.abs(date.x - title.x)).toBeLessThanOrEqual(1);
      if (await entry.evaluate(element => element.matches(".project-entry, .award-entry"))) {
        expect(date.y - title.y - title.height).toBeCloseTo(8, 1);
      }
    }
  }
});

test("mentor blocks are omitted while experience data remains available", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".career-entry .collab-section, .career-entry .collab-name")).toHaveCount(0);
  for (const experience of experiences) {
    expect(experience.mentors.length).toBeGreaterThan(0);
    await expect(page.locator(`#${experience.id} .entry-contrib`)).toBeVisible();
  }
});

test("news keeps award and supervision content", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.locator("#old_news").getAttribute("open") === null) {
    await page.locator(".news-toggle").click();
  }
  const award = page.locator(".news-body").filter({ hasText: "Best Paper Award" });
  await expect(award).toHaveText("Our paper CSG-Fusion received the Best Paper Award at the ICCV 2025 Workshop E2E3D.");
  await expect(award.locator("strong")).toHaveText("Best Paper Award");
  await expect(award.locator("em")).toHaveText("ICCV 2025 Workshop E2E3D");
  const supervision = page.locator(".news-body").filter({ hasText: "co-supervision" });
  await expect(supervision).not.toContainText("Prof.");
  await expect(supervision.getByRole("link", { name: "Yan Xia", exact: true })).toHaveAttribute("href", "https://cvg.cit.tum.de/members/xiya");
  await expect(supervision.getByRole("link", { name: "Chuanxia Zheng", exact: true })).toHaveAttribute("href", "https://chuanxiaz.com/");

});

test("desktop anchors keep section headings below the sticky navigation", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("desktop-"),
    "Desktop sticky-navigation behavior",
  );

  for (const id of [
    "Publications",
    "open-source",
    "experiences",
    "blog",
  ]) {
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.scrollBehavior = "auto";
    });
    await page.locator(`.navbar-links a[href="#${id}"]`).click();
    await expect
      .poll(
        () =>
          page.evaluate((targetId) => {
            const navigation = document
              .querySelector(".navbar")
              .getBoundingClientRect();
            const heading = document
              .getElementById(targetId)
              .getBoundingClientRect();
            return heading.top - navigation.bottom;
          }, id),
        { message: `${id} heading offset` },
      )
      .toBeGreaterThanOrEqual(12);
  }
});

test("mobile entry metadata remains visually subordinate", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.startsWith("desktop-"),
    "Mobile typography behavior",
  );

  await page.goto("/");
  const typography = await page.evaluate(() => {
    const size = (selector) =>
      Number.parseFloat(
        getComputedStyle(document.querySelector(selector)).fontSize,
      );

    return {
      sectionHeading: size(".section-heading"),
      entryTitle: size(".entry-title"),
      entryDescription: size(".type-body--entry-description"),
      experienceType: size(".experience-type"),
      entryBody: size(".entry-summary"),
      publicationNote: size(".publication-note"),
    };
  });

  expect(typography.experienceType).toBeLessThan(typography.entryTitle);
  expect(typography.publicationNote).toBeLessThan(typography.entryBody);
  expect(typography.entryDescription).toBe(15);
  expect(typography.experienceType).toBe(13);
  expect(typography.entryBody).toBe(15);
  expect(typography.publicationNote).toBe(13);
  expect(typography.sectionHeading).toBe(24);
});

test("resource text links preserve labels, neutral styling and accessible hit areas", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const labels = { arxiv: "arXiv", paper: "Paper", ieee: "Paper", pdf: "PDF", poster: "Poster", project: "Website", code: "Code", video: "Video" };
  const hitSize = testInfo.project.name.startsWith("desktop-") ? 24 : 44;
  for (const [type, label] of Object.entries(labels)) expect(site.resourceTypes[type].textLabel).toBe(label);
  for (const entry of [...publications, ...projects]) {
    const group = page.locator(`#${entry.id} .entry-links`);
    await expect(group).toHaveAccessibleName(`${entry.title} resources`);
    await expect(group.locator("img")).toHaveCount(0);
    await expect(group.locator("a")).toHaveCount(entry.links.length);
    for (const [index, resourceLink] of entry.links.entries()) {
      const resource = site.resourceTypes[resourceLink.type];
      const link = group.locator("a").nth(index);
      await expect(link).toHaveText(labels[resourceLink.type]);
      await expect(link).toHaveAccessibleName(resourceLink.label || resource.label);
      await expect(link).toHaveAttribute("href", resourceLink.url);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      const metrics = await link.evaluate(element => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        const text = range.getBoundingClientRect();
        const grid = element.closest(".publication-actions") || element.parentElement;
        const parent = grid.getBoundingClientRect();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d");
        const pixel = color => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          return Array.from(context.getImageData(0, 0, 1, 1).data);
        };
        const textColor = pixel(style.color);
        const tintAlpha = pixel(style.backgroundColor)[3] / 255;
        context.fillStyle = getComputedStyle(document.body).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        context.fillStyle = style.backgroundColor;
        context.fillRect(0, 0, 1, 1);
        const backgroundColor = Array.from(context.getImageData(0, 0, 1, 1).data);
        return {
          color: style.color, tintAlpha, textColor, backgroundColor, borderColor: style.borderColor,
          borderWidth: style.borderWidth, radius: style.borderRadius,
          fontSize: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight,
          padding: style.paddingInline, decoration: style.textDecorationLine,
          height: bounds.height, width: bounds.width, gap: getComputedStyle(grid).gap,
          leftInset: text.left - bounds.left,
          centerY: (text.top + text.bottom - bounds.top - bounds.bottom) / 2,
          fits: bounds.left >= parent.left - 1 && bounds.right <= parent.right + 1,
        };
      });
      expect(metrics.color).toBe("rgb(96, 115, 135)");
      expect(metrics.tintAlpha).toBe(0);
      expect(metrics.borderWidth).toBe("0px");
      expect(metrics.radius).toBe("0px");
      expect(contrastRatio(metrics.textColor, metrics.backgroundColor)).toBeGreaterThanOrEqual(4.5);
      expect(metrics.fontSize).toBe("13px");
      expect(metrics.weight).toBe("500");
      expect(metrics.lineHeight).toBe("19.5px");
      expect(metrics.padding).toBe("0px");
      expect(metrics.decoration).toBe("none");
      expect(metrics.height).toBe(hitSize);
      expect(metrics.width).toBe(64);
      expect(metrics.gap).toBe("4px 12px");
      expect(Math.abs(metrics.leftInset)).toBeLessThan(1);
      expect(Math.abs(metrics.centerY)).toBeLessThan(1);
      expect(metrics.fits).toBe(true);
    }
  }
  // The document section does not opt in, and social links keep their icons.
  await expect(page.locator(".document-section .entry-links--text")).toHaveCount(0);
  await expect(page.locator(".avatar-icons img")).toHaveCount(site.social.length);
  const visitedContract = await page.evaluate(() => {
    const rules = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules));
    return rules.some(rule => rule.selectorText?.includes(".resource-text-link:visited") &&
      rule.style.color === "var(--color-muted)");
  });
  expect(visitedContract).toBe(true);
  const narrowGroup = page.locator("#litetracker-publication .publication-actions");
  await narrowGroup.evaluate(element => { element.style.width = "140px"; });
  const wrapped = await narrowGroup.evaluate(element => {
    const group = element.getBoundingClientRect();
    const buttons = Array.from(element.querySelectorAll("a"), link => link.getBoundingClientRect());
    return buttons.at(-1).top > buttons[0].top && buttons.every(button =>
      button.left >= group.left - 1 && button.right <= group.right + 1);
  });
  expect(wrapped).toBe(true);
});

test("resource text links darken without fills on hover and keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  for (const category of ["arxiv", "paper", "poster", "website", "code", "video"]) {
    const link = page.locator(`.resource-text-link--${category}`).first();
    const color = await link.evaluate(element => getComputedStyle(element).color);
    const tint = await link.evaluate(element => getComputedStyle(element).backgroundColor);
    const bounds = await link.boundingBox();
    expect(contrastRatio(color.match(/\d+/g).map(Number), [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
    await link.hover();
    await expect(link).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(link).toHaveCSS("color", "rgb(47, 62, 77)");
    await expect(link).toHaveCSS("text-decoration-line", "underline");
    await expect(link).toHaveCSS("text-decoration-color", "rgb(47, 62, 77)");
    let current = await link.boundingBox();
    expect(current.height).toBe(bounds.height);
    expect(current.width).toBe(bounds.width);
    await page.mouse.move(0, 0);
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    expect(await link.evaluate(element => element.matches(":focus-visible"))).toBe(true);
    await expect(link).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(link).toHaveCSS("color", "rgb(47, 62, 77)");
    await expect(link).toHaveCSS("text-decoration-line", "underline");
    await expect(link).toHaveCSS("text-decoration-color", "rgb(47, 62, 77)");
    await expect(link).toHaveCSS("outline-style", "solid");
    await expect(link).toHaveCSS("outline-width", "2px");
    await expect(link).toHaveCSS("outline-offset", "3px");
    current = await link.boundingBox();
    expect(current.height).toBe(bounds.height);
    expect(current.width).toBe(bounds.width);
    await link.evaluate(element => element.blur());
    await expect(link).toHaveCSS("color", color);
    await expect(link).toHaveCSS("background-color", tint);
  }
});

test("homepage media layout preserves its desktop and mobile geometry", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("#scene-decomposition").scrollIntoViewIfNeeded();
  await page.locator("#scene-decomposition img").evaluateAll(images => Promise.all(images.map(image => image.decode())));

  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      const bounds = element.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
      };
    };

    return {
      hero: rect(".hero-intro-table"),
      heroBio: rect(".hero-bio-cell"),
      heroMedia: rect(".hero-media-cell"),
      portrait: rect(".profile-portrait"),
      publication: rect(".publication-entry"),
      publicationMedia: rect(".publication-entry .entry-media-cell"),
      publicationContent: rect(".publication-entry .entry-content-cell"),
      publicationVisual: rect(".publication-entry .entry-visual"),
      experienceMedia: rect(".career-entry .entry-media-cell"),
      experienceLogo: rect(".career-entry .experience-logo-card"),
      institutionRows: Array.from(document.querySelectorAll(".career-entry .experience-logo-stack"), (stack) => {
        const bounds = stack.getBoundingClientRect();
        const mediaBounds = stack.closest(".entry-media-cell").getBoundingClientRect();
        return {
          id: stack.closest(".career-entry").id,
          width: bounds.width,
          height: bounds.height,
          left: bounds.left,
          right: bounds.right,
          mediaLeft: mediaBounds.left,
          mediaRight: mediaBounds.right,
          cards: Array.from(stack.children, (card) => {
            const cardBounds = card.getBoundingClientRect();
            const image = card.querySelector("img");
            return {
              left: cardBounds.left,
              right: cardBounds.right,
              top: cardBounds.top,
              bottom: cardBounds.bottom,
              width: cardBounds.width,
              height: cardBounds.height,
              imageWidth: image.getBoundingClientRect().width,
              imageHeight: image.getBoundingClientRect().height,
              naturalRatio: image.naturalWidth / image.naturalHeight,
              objectFit: getComputedStyle(image).objectFit,
            };
          }),
        };
      }),
      projectMedia: rect(".project-entry .entry-media-cell"),
      projectImage: rect(".project-entry .teaser-img"),
      teaserObjectFit: getComputedStyle(
        document.querySelector(".publication-entry .teaser-img"),
      ).objectFit,
      logoObjectFit: getComputedStyle(
        document.querySelector(".career-entry .experience-logo-card img"),
      ).objectFit,
    };
  });

  const closeTo = (actual, expected, tolerance = 0.75) => {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
  };

  if (testInfo.project.name.startsWith("desktop-")) {
    closeTo(geometry.heroBio.width / geometry.hero.width, 0.6415, 0.001);
    closeTo(geometry.heroMedia.width / geometry.hero.width, 0.3585, 0.001);
    closeTo(geometry.portrait.width, 260);
    closeTo(geometry.portrait.height, 260);

    closeTo(
      geometry.publicationMedia.width / geometry.publication.width,
      0.26,
      0.001,
    );
    closeTo(
      geometry.publicationContent.width / geometry.publication.width,
      0.74,
      0.001,
    );
    closeTo(
      geometry.publicationVisual.width,
      Math.min(220, geometry.publicationMedia.width - 14),
    );
    closeTo(geometry.publicationVisual.height, 140);
    closeTo(
      geometry.experienceLogo.width,
      Math.min(220, geometry.experienceMedia.width - 14),
    );
    closeTo(
      geometry.projectImage.width,
      Math.min(280, geometry.projectMedia.width - 14),
    );
  } else {
    closeTo(geometry.portrait.width, 220);
    closeTo(geometry.portrait.height, 220);
    closeTo(geometry.publicationMedia.width, geometry.publication.width);
    closeTo(geometry.publicationContent.width, geometry.publication.width);
    closeTo(geometry.publicationVisual.width, 260);
    closeTo(geometry.experienceMedia.width, geometry.publication.width);
    closeTo(geometry.projectMedia.width, geometry.publication.width);
  }

  expect(geometry.teaserObjectFit).toBe("contain");
  expect(geometry.logoObjectFit).toBe("contain");

  const multipleInstitutionRows = geometry.institutionRows.filter(row => row.cards.length > 1);
  expect(multipleInstitutionRows.map(row => row.cards.length)).toEqual([2, 2, 3]);
  for (const row of geometry.institutionRows) {
    expect(row.left).toBeGreaterThanOrEqual(row.mediaLeft - 1);
    expect(row.right).toBeLessThanOrEqual(row.mediaRight + 1);
    row.cards.forEach(card => expect(card.objectFit).toBe("contain"));
    if (row.cards.length === 1) continue;
    if (testInfo.project.name.startsWith("desktop-")) {
      for (let i = 1; i < row.cards.length; i++) {
        closeTo(row.cards[i].top - row.cards[i - 1].bottom, row.id === "robot-world-model" ? 8 : 4);
      }
      if (row.id === "scene-decomposition") {
        const previousCardHeight = Math.max(64, Math.min(page.viewportSize().width * 0.07, 82));
        for (const card of row.cards) {
          const expectedHeight = Math.min(row.width / card.naturalRatio, previousCardHeight);
          closeTo(card.height, expectedHeight);
          closeTo(Math.min(card.imageHeight, card.imageWidth / card.naturalRatio), expectedHeight);
          closeTo(Math.min(card.imageWidth, card.imageHeight * card.naturalRatio),
            Math.min(row.width, previousCardHeight * card.naturalRatio));
        }
      }
    } else {
      closeTo(row.height, 64);
      for (const [index, card] of row.cards.entries()) {
        closeTo(card.top, row.cards[0].top);
        closeTo(card.height, 64);
        closeTo(card.width, (row.width - 12 * (row.cards.length - 1)) / row.cards.length);
        if (index > 0) closeTo(card.left - row.cards[index - 1].right, 12);
      }
    }
  }
});

test("core homepage content is readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("#Publications")).toBeVisible();
  await expect(page.locator("#experiences")).toBeVisible();
  await expect(page.locator("#vids-publication")).toContainText("ViDS");
  await expect(page.locator("#old_news")).toHaveCount(1);
  await expect(page.locator("#old_news summary")).toHaveText("More news");
  await expect(page.locator("#robot-world-model .entry-contrib")).toBeVisible();
  await expect(page.locator("#robot-world-model .collab-section")).toHaveCount(0);
  await expect(page.locator(".thesis-entry")).toHaveCount(0);
  await context.close();
});

test("desktop News keeps all updates in an internally scrollable region", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("desktop-"),
    "Desktop News behavior",
  );

  await page.goto("/");
  const news = page.locator(".news-scroll");
  await expect(page.locator("#old_news")).toHaveAttribute("open", "");

  const dimensions = await news.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);

  await news.focus();
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => news.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
});

test("gallery tabs remain keyboard-operable", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name.startsWith("mobile-") ||
      testInfo.project.name.startsWith("tablet-"),
    "Desktop lightbox behavior",
  );
  await page.goto("/");
  await page.locator(".gallery-section").scrollIntoViewIfNeeded();
  await expect(page.locator(".gallery-section")).not.toHaveAttribute(
    "data-gallery-pending",
    "",
  );
  const blenderTab = page.getByRole("tab", { name: "Blender Arts" });
  await blenderTab.click();
  await expect(blenderTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#gallery-panel-blender")).toBeVisible();
  await page.getByRole("tab", { name: "Three.js Arts", exact: true }).click();
  await expect(page.locator("#gallery-panel-threejs")).toBeVisible();
  const projectTitles = await page.locator(".project-showcase-title").evaluateAll(titles =>
    titles.map(title => getComputedStyle(title).fontSize),
  );
  expect(projectTitles.length).toBeGreaterThan(0);
  expect(new Set(projectTitles)).toEqual(new Set(["18px"]));
  const galleryDescriptions = await page.locator(".project-showcase-subtitle").evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return [element.classList.contains("type-body--entry-description"), style.fontSize, style.fontWeight, style.lineHeight, style.color];
  }));
  for (const description of galleryDescriptions) expect(description).toEqual([true, "15px", "400", "24px", "rgb(203, 211, 222)"]);
  await expect(page.locator("#threejs-carousel")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await page.getByRole("tab", { name: "Through My Lens", exact: true }).click();
  await page.locator('#photograph-carousel [data-gallery-position="0"] [data-gallery-open]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".gallery-lightbox-title")).toHaveCSS("font-size", "18px");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("homepage defers non-critical modules and third-party fonts", async ({
  page,
}, testInfo) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/", { waitUntil: "networkidle" });

  expect(requests.some((url) => url.includes("fonts.googleapis.com"))).toBe(false);
  expect(requests.some((url) => url.includes("fonts.gstatic.com"))).toBe(false);
  expect(requests.some((url) => url.includes("blog/posts.json"))).toBe(false);
  expect(requests.some((url) => /chunks\/gallery\./.test(url))).toBe(false);
  expect(requests.some((url) => /gallery\.[A-Z0-9]+\.css/.test(url))).toBe(false);
  expect(requests.some((url) => url.includes("alien_ball_poster"))).toBe(false);

  if (!testInfo.project.name.startsWith("desktop-")) {
    expect(requests.some((url) => /chunks\/glass-nav\./.test(url))).toBe(false);
    expect(requests.some((url) => /desktop\.[A-Z0-9]+\.css/.test(url))).toBe(false);
  }
});

test("blog data loads only when the section approaches", async ({ page }) => {
  let requests = 0;
  await page.route("https://fusheng-ji.github.io/blog/posts.json", (route) => {
    requests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  expect(requests).toBe(0);
  await page.locator("#blog-list").scrollIntoViewIfNeeded();
  await expect(page.locator(".blog-empty.type-body")).toHaveText(
    "No blog posts yet.",
  );
  await expect(page.locator(".blog-empty")).toHaveCSS("font-size", "16px");
  expect(requests).toBe(1);
});

test("gallery poster waits for the Blender tab", async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("desktop-"),
    "Desktop gallery behavior",
  );
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".gallery-section").scrollIntoViewIfNeeded();
  await expect(page.locator(".gallery-section")).not.toHaveAttribute(
    "data-gallery-pending",
    "",
  );
  expect(requests.some((url) => url.includes("alien_ball_poster"))).toBe(false);

  await page.getByRole("tab", { name: "Blender Arts" }).click();
  await expect
    .poll(() => requests.some((url) => url.includes("alien_ball_poster")))
    .toBe(true);
});

test("404 card animation idles after settling", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1440",
    "Single runtime-performance sample",
  );
  await page.addInitScript(() => {
    window.__cardWrites = 0;
    const original = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function (name, ...args) {
      if (name === "--mx") window.__cardWrites += 1;
      return original.call(this, name, ...args);
    };
  });
  await page.goto("/404.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const settledWrites = await page.evaluate(() => window.__cardWrites);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__cardWrites)).toBe(settledWrites);
});

test("Water Pool skips the heavy simulation without WebGL", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-390",
    "Single capability-fallback sample",
  );
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/three_js_arts/water_pool/", { waitUntil: "networkidle" });
  expect(requests.some((url) => /chunks\/main\./.test(url))).toBe(false);
  await expect(page.locator(".no-webgl-message")).toBeVisible();
});
