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

test("homepage preserves content and has no horizontal overflow", async ({ page }) => {
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
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
});

test("all homepage section headings share the intended typography", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  const headings = await page.locator("h2.section-heading").evaluateAll(
    (elements) =>
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
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));

  expect(metadataSizes.length).toBeGreaterThan(0);
  expect(new Set(metadataSizes)).toEqual(new Set(["13px"]));
  expect(13).toBeLessThan(entryTitleSize);
});

test("desktop anchors keep section headings below the sticky navigation", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("desktop-"),
    "Desktop sticky-navigation behavior",
  );

  for (const id of ["research", "Publications", "experiences", "education", "blog"]) {
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
      entryLabel: size(".entry-label"),
      experienceType: size(".experience-type"),
      entryBody: size(".entry-summary"),
      publicationNote: size(".publication-note"),
    };
  });

  expect(typography.entryLabel).toBeLessThan(typography.entryBody);
  expect(typography.experienceType).toBeLessThan(typography.entryTitle);
  expect(typography.publicationNote).toBeLessThan(typography.entryBody);
  expect(typography.entryLabel).toBe(12);
  expect(typography.experienceType).toBe(13);
  expect(typography.entryBody).toBe(17);
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

test("core homepage content is readable without JavaScript", async ({ browser }) => {
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
  test.skip(testInfo.project.name.startsWith("mobile-") || testInfo.project.name.startsWith("tablet-"), "Desktop lightbox behavior");
  await page.goto("/");
  const blenderTab = page.getByRole("tab", { name: "Blender Arts" });
  await blenderTab.click();
  await expect(blenderTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#gallery-panel-blender")).toBeVisible();
});
