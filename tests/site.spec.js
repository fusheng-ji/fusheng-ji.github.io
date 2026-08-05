import { expect, test } from "@playwright/test";

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
  for (const id of [
    "research",
    "Publications",
    "experiences",
    "thesis",
    "technical-report",
    "education",
    "awards",
    "projects",
    "blog",
    "gallery",
  ]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
});

test("homepage directs visitors to the reusable template", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("posts.json")) {
      consoleErrors.push(message.text());
    }
  });
  await page.goto("/", { waitUntil: "networkidle" });

  const footer = page.locator(".site-footer");
  const templateLink = footer.getByRole("link", {
    name: "Use the open-source template",
  });

  await expect(footer).toContainText(
    "Need your own academic homepage? Use the open-source template",
  );
  await expect(templateLink).toHaveAttribute(
    "href",
    "https://github.com/fusheng-ji/academic-homepage-template",
  );
  await expect(templateLink).toHaveAttribute("target", "_blank");
  await expect(templateLink).toHaveAttribute("rel", "noopener noreferrer");

  await templateLink.focus();
  await expect(templateLink).toBeFocused();
  const focusStyle = await templateLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(focusStyle.outlineWidth).not.toBe("0px");

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

  expect(headings).toHaveLength(11);
  expect(new Set(headings.map((heading) => heading.fontFamily)).size).toBe(1);
  expect(new Set(headings.map((heading) => heading.fontSize)).size).toBe(1);
  expect(new Set(headings.map((heading) => heading.fontWeight))).toEqual(
    new Set(["700"]),
  );
  expect(headings[0].fontSize).toBe(
    testInfo.project.name.startsWith("desktop-") ? "28px" : "23px",
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
      groupLabel: ".type-group-label",
      body: ".type-body:not(.type-body--emphasis)",
      bodyEmphasis: ".type-body--emphasis",
      secondary: ".type-secondary",
      meta: ".type-meta:not(.type-meta--uppercase)",
      metaUppercase: ".type-meta--uppercase",
      caption: ".type-caption",
      tag: ".type-tag",
      badge: ".type-badge",
      control: ".type-control",
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
  const viewportWidth = page.viewportSize().width;
  const expectedPageTitle = isDesktop
    ? 36
    : Math.min(32, Math.max(27, viewportWidth * 0.074));
  const expected = {
    pageTitle: { size: expectedPageTitle, weight: "700", leading: 1.15 },
    sectionTitle: { size: isDesktop ? 28 : 23, weight: "700", leading: 1.18 },
    entryTitle: { size: 20, weight: "700", leading: 1.25 },
    groupLabel: {
      size: isDesktop ? 16 : 14,
      weight: "700",
      leading: 1.35,
      letterSpacing: isDesktop ? "1.6px" : "1.4px",
      textTransform: "uppercase",
    },
    body: { size: 16, weight: "400", leading: 1.65 },
    bodyEmphasis: { size: 16, weight: "700", leading: 1.65 },
    secondary: { size: 14, weight: "400", leading: 1.5 },
    meta: { size: 13, weight: "600", leading: 1.45 },
    metaUppercase: {
      size: 13,
      weight: "600",
      leading: 1.45,
      textTransform: "uppercase",
    },
    caption: { size: 13, weight: "400", leading: 1.5 },
    tag: { size: 14, weight: "700", leading: 1.4 },
    badge: {
      size: 10,
      weight: "700",
      leading: 1.25,
      letterSpacing: "0.8px",
      textTransform: "uppercase",
    },
    control: { size: 15, weight: "600", leading: 1.4 },
  };
  const expectedFontFamily = typography.pageTitle[0].fontFamily;

  expect(expectedFontFamily).toContain("Lato");
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

  expect(expected.pageTitle.size).toBeGreaterThan(expected.sectionTitle.size);
  expect(expected.sectionTitle.size).toBeGreaterThan(expected.entryTitle.size);
  expect(expected.entryTitle.size).toBeGreaterThan(expected.body.size);
  if (isDesktop) {
    expect(expected.body.size).toBe(expected.groupLabel.size);
  } else {
    expect(expected.body.size).toBeGreaterThan(expected.groupLabel.size);
  }
});

test("core content roles use a semantic heading outline", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator("h1.type-page-title")).toHaveCount(1);
  await expect(page.locator("h2.type-section-title")).toHaveCount(11);
  await expect(page.locator("article h3.type-entry-title")).not.toHaveCount(0);
  await expect(page.locator("article h4.type-group-label")).not.toHaveCount(0);
  await expect(page.locator(".research-arc h3.type-group-label")).toHaveCount(
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

test("technical report overview follows the shared body hierarchy", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const report = page.locator(".technical-report-entry");
  const title = report.locator("h3.type-entry-title");
  const overviewLabel = report.getByRole("heading", {
    level: 4,
    name: "Overview",
  });
  const overview = report.getByText(
    "A TUM DI Lab report on object-centric 3D reconstruction and decomposition with 3D Gaussian Splatting.",
    { exact: true },
  );

  await expect(overview).toHaveClass(/type-body/);
  const sizes = await Promise.all(
    [title, overview, overviewLabel].map((locator) =>
      locator.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    ),
  );

  expect(sizes).toEqual([
    20,
    16,
    testInfo.project.name.startsWith("desktop-") ? 16 : 14,
  ]);
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
  await expect(control).toBeFocused();
  const outlineStyle = await control.evaluate(
    (element) => getComputedStyle(element).outlineStyle,
  );
  expect(outlineStyle).not.toBe("none");
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
  await expect(page.locator(".blog-empty.type-body")).toHaveText(
    "No blog posts yet.",
  );

  responseMode = "error";
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".blog-error.type-body")).toHaveText(
    "Unable to load blog posts.",
  );
});

test("entry metadata uses one restrained type scale", async ({ page }) => {
  await page.goto("/");

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
});

test("mentor links inherit the shared mentor typography", async ({ page }) => {
  await page.goto("/");

  const mentorTypography = await page
    .locator(".collab-name")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          text: element.textContent.trim(),
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          links: Array.from(element.querySelectorAll("a")).map((link) => {
            const linkStyle = getComputedStyle(link);
            return {
              fontSize: linkStyle.fontSize,
              fontWeight: linkStyle.fontWeight,
              lineHeight: linkStyle.lineHeight,
            };
          }),
        };
      }),
    );

  expect(
    mentorTypography.some(({ text }) => text.includes("Mahdi Mustapha Hamad")),
  ).toBe(true);
  expect(new Set(mentorTypography.map(({ fontSize }) => fontSize)).size).toBe(
    1,
  );
  for (const mentor of mentorTypography) {
    for (const link of mentor.links) {
      expect(link).toEqual({
        fontSize: mentor.fontSize,
        fontWeight: mentor.fontWeight,
        lineHeight: mentor.lineHeight,
      });
    }
  }
});

test("mentor rows distinguish former and current affiliations", async ({
  page,
}) => {
  await page.goto("/");

  const rows = page.locator(".collab-row");
  await expect(rows).not.toHaveCount(0);
  const formerLabels = rows.locator(".collab-status--ex");
  await expect(rows.locator(".collab-status--now")).toHaveCount(
    await formerLabels.count(),
  );

  const mahdi = rows.filter({ hasText: "Mahdi Mustapha Hamad" });
  await expect(mahdi).toContainText(
    "Tech Lead, Robot Learning Applications · Agile Robots SE",
  );
  await expect(mahdi.locator(".collab-status")).toHaveCount(0);

  const benjamin = rows.filter({ hasText: "Benjamin Busam" });
  await expect(benjamin).toContainText(
    "exComputer Vision Coordinator · TUM CAMP",
  );
  await expect(benjamin).toContainText(
    "nowProfessor & Director · TUM Photogrammetry and Remote Sensing",
  );
  await expect(benjamin.locator("a")).toHaveAttribute(
    "href",
    "https://www.asg.ed.tum.de/pf/team/benjamin-busam/",
  );

  const yan = rows.filter({ hasText: "Yan Xia" });
  await expect(yan).toContainText(
    "exSenior Researcher · TUM Computer Vision Group",
  );
  await expect(yan).toContainText(
    "nowProfessor · USTC Spatial Intelligence Lab",
  );

  const chuanxia = rows.filter({ hasText: "Chuanxia Zheng" });
  await expect(chuanxia).toContainText(
    "exPostdoctoral Researcher · Oxford VGG",
  );
  await expect(chuanxia).toContainText(
    "nowNanyang Assistant Professor · NTU CCDS",
  );
});

test("desktop anchors keep section headings below the sticky navigation", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("desktop-"),
    "Desktop sticky-navigation behavior",
  );

  for (const id of [
    "research",
    "Publications",
    "experiences",
    "education",
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

test("mobile entry labels and metadata remain visually subordinate", async ({
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
      entryLabel: size(".entry-label"),
      experienceType: size(".experience-type"),
      entryBody: size(".entry-summary"),
      publicationNote: size(".publication-note"),
    };
  });

  expect(typography.entryLabel).toBeLessThan(typography.entryBody);
  expect(typography.experienceType).toBeLessThan(typography.entryTitle);
  expect(typography.publicationNote).toBeLessThan(typography.entryBody);
  expect(typography.entryLabel).toBe(14);
  expect(typography.experienceType).toBe(13);
  expect(typography.entryBody).toBe(16);
  expect(typography.publicationNote).toBe(13);
  expect(typography.sectionHeading).toBe(23);
});

test("mobile resource links render as standalone logos", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.startsWith("desktop-"),
    "Mobile resource-link appearance",
  );

  await page.goto("/");
  const styles = await page
    .locator(
      "#publications-mount .entry-links a, .technical-report-entry .entry-links a, #projects-mount .entry-links a",
    )
    .evaluateAll((links) =>
      links.map((link) => {
        const linkStyle = getComputedStyle(link);
        const icon = link.querySelector("img");
        const iconBounds = icon.getBoundingClientRect();
        const linkBounds = link.getBoundingClientRect();
        return {
          backgroundColor: linkStyle.backgroundColor,
          borderStyle: linkStyle.borderStyle,
          borderRadius: linkStyle.borderRadius,
          boxShadow: linkStyle.boxShadow,
          iconWidth: iconBounds.width,
          iconHeight: iconBounds.height,
          hitWidth: linkBounds.width,
          hitHeight: linkBounds.height,
        };
      }),
    );

  expect(styles.length).toBeGreaterThan(0);
  for (const style of styles) {
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style.borderStyle).toBe("none");
    expect(style.borderRadius).toBe("0px");
    expect(style.boxShadow).toBe("none");
    expect(style.iconWidth).toBe(24);
    expect(style.iconHeight).toBe(24);
    expect(style.hitWidth).toBe(44);
    expect(style.hitHeight).toBe(44);
  }
});

test("homepage media layout preserves its desktop and mobile geometry", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });

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
      projectMedia: rect(".project-entry .entry-media-cell"),
      projectImage: rect(".project-entry .teaser-img"),
      awardMeta: rect(".award-entry .award-meta-cell"),
      awardContent: rect(".award-entry .entry-content-cell"),
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
    closeTo(geometry.awardMeta.width / geometry.publication.width, 0.26, 0.001);
    closeTo(
      geometry.awardContent.width / geometry.publication.width,
      0.74,
      0.001,
    );
  } else {
    closeTo(geometry.portrait.width, 220);
    closeTo(geometry.portrait.height, 220);
    closeTo(geometry.publicationMedia.width, geometry.publication.width);
    closeTo(geometry.publicationContent.width, geometry.publication.width);
    closeTo(geometry.publicationVisual.width, 260);
    closeTo(geometry.experienceMedia.width, geometry.publication.width);
    closeTo(geometry.projectMedia.width, geometry.publication.width);
    closeTo(geometry.awardMeta.width, geometry.publication.width);
    closeTo(geometry.awardContent.width, geometry.publication.width);
  }

  expect(geometry.teaserObjectFit).toBe("contain");
  expect(geometry.logoObjectFit).toBe("contain");
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
  const blenderTab = page.getByRole("tab", { name: "Blender Arts" });
  await blenderTab.click();
  await expect(blenderTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#gallery-panel-blender")).toBeVisible();
});
