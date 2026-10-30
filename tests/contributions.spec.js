import { expect, test } from "@playwright/test";
import nunjucks from "nunjucks";
import openSource from "../src/_data/openSource.js";
import { contributionView } from "../scripts/lib/contribution-view.mjs";
import { contributionPresentation } from "../scripts/lib/contribution-presentation.mjs";

const content = openSource();
const { selection, repositorySummaries, seedSnapshot } = openSource({ configurationOnly: true });
const selected = content.repositoryGroups.flatMap(group => group.pullRequests);
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader("src/_includes"), { autoescape: true });
const template = '{% import "components/ui.njk" as ui with context %}{% include "components/open-source.njk" %}';
const groupFor = (page, name) => page.locator(`[data-contribution-repository="${name}"]`);

async function serveFixture(page, snapshot, curated = selection, repositoryMedia = content.repositoryMedia) {
  const fixture = { ...contributionPresentation(contributionView(snapshot, curated, repositorySummaries), content.contributionDetails), repositoryMedia, repositoryIntros: content.repositoryIntros };
  const markup = env.renderString(template, { openSource: fixture });
  await page.unroute("http://127.0.0.1:4173/");
  await page.route("http://127.0.0.1:4173/", async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/<section class="home-section" id="open-source-section"[\s\S]*?<\/section>/, () => markup);
    await route.fulfill({ response, body: html });
  });
  await page.goto("/#open-source");
  await page.reload();
  return fixture;
}

async function openEvidence(section) {
  for (const toggle of await section.locator(".contribution-toggle").all()) await toggle.click();
}

async function expectNoOverflow(section, page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await section.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return [...element.querySelectorAll(".contribution-media-stack, .contribution-logo, .contribution-repository-stars, .contribution-repository-intro, .contribution-repository-summary, .contribution-repository-heading, .tag, .contribution-toggle, .contribution-entry, .contribution-pr-link")]
      .filter(child => child.getClientRects().length)
      .every(child => {
        const box = child.getBoundingClientRect();
        return box.left >= bounds.left - 1 && box.right <= bounds.right + 1;
      });
  })).toBe(true);
}

test("repository summaries stay visible while selected open and merged evidence is rendered and initially collapsed", async ({ page }) => {
  const apiRequests = [];
  page.on("request", request => { if (new URL(request.url()).hostname === "api.github.com") apiRequests.push(request.url()); });
  await page.goto("/#open-source");
  const section = page.locator("#open-source-section");
  await expect(groupFor(page, "nerfstudio-project/gsplat")).toHaveCount(0);
  await expect(section.locator(".contribution-repository-summary:visible")).toHaveCount(content.repositoryGroups.length);
  await expect(section.locator(".contribution-repository-intro:visible")).toHaveCount(content.repositoryGroups.length);
  await expect(section.locator(".contribution-categories, [data-contribution-category], .entry-media-cell .tag")).toHaveCount(0);
  await expect(section.locator(".contribution-entry")).toHaveCount(selected.length);
  await expect(section.locator(".contribution-entry:visible, details[open]")).toHaveCount(0);
  await expect(section.locator(".contributions-stats, .contributions-sync, .contributions-view-all, .contributions-filters, .contributions-pagination, time")).toHaveCount(0);
  await expect(section.locator(".contribution-logo img")).toHaveCount(content.repositoryGroups.length);
  await expect(section.locator(".contribution-section, .contribution-section-title")).toHaveCount(0);
  await expect(section.locator(".contributions-list > .contribution-repository")).toHaveCount(content.repositoryGroups.length);
  const rows = await section.locator(".contribution-repository").evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, left: box.left };
  }));
  for (let index = 1; index < rows.length; index++) {
    expect(rows[index].top).toBeGreaterThanOrEqual(rows[index - 1].bottom);
    expect(rows[index].left).toBeCloseTo(rows[0].left, 1);
  }
  for (const repo of content.repositoryGroups) {
    const group = groupFor(page, repo.name);
    const media = content.repositoryMedia[repo.name];
    await expect(group.locator(".entry-media-cell img")).toHaveAttribute("src", media.src);
    await expect(group.locator(".entry-media-cell img")).toHaveAttribute("alt", media.alt);
    await expect(group.locator(".entry-media-cell img")).toHaveAttribute("width", String(media.width));
    await expect(group.locator(".entry-media-cell img")).toHaveAttribute("height", String(media.height));
    await expect(group.locator(".entry-media-cell img")).toHaveAttribute("loading", "lazy");
    await expect(group.locator(".entry-content-cell .contribution-categories")).toHaveCount(0);
    await expect(group.locator(".contribution-repository-title a")).toHaveText(repo.label);
    await expect(group.locator(".contribution-repository-title a")).toHaveAttribute("href", repo.url);
    await expect(group.locator(".contribution-repository-heading .contribution-repository-stars")).toHaveText(repo.starsLabel);
    await expect(group.locator(".contribution-repository-stars")).toHaveAccessibleName(`${repo.stars} GitHub stars`);
    await expect(group.locator(".contribution-repository-intro")).toHaveText(content.repositoryIntros[repo.name].text);
    await expect(group.locator(".contribution-repository-summary")).toHaveText(`Contributions: ${repo.technicalSummary}`);
    expect(await group.locator(".entry-content-cell").evaluate(element => {
      const intro = element.querySelector(".contribution-repository-intro");
      return intro.previousElementSibling.classList.contains("contribution-repository-head")
        && intro.nextElementSibling.classList.contains("contribution-repository-summary");
    })).toBe(true);
    await expect(group.locator("details")).toHaveCount(Number(repo.pullRequests.length > 0));
    await expect(group.locator(".contribution-entry")).toHaveCount(repo.pullRequests.length);
    await expect(group.locator(".contribution-topic-title")).toHaveText(repo.topics.map(topic => topic.title));
    await expect(group.locator(".contribution-pr-link")).toHaveText(repo.pullRequests.map(pr => `#${pr.number} ${pr.linkLabel}`));
  }
  const html = await section.innerHTML();
  for (const pr of content.snapshot.pullRequests.filter(pr => ["closed", "draft"].includes(pr.status))) expect(html).not.toContain(pr.url);
  expect(html).not.toMatch(/data-contribution-state="(?:draft|closed)"/);
  expect(html).not.toContain("https://github.com/xdit-project/xDiT/pull/867");
  expect(await section.evaluate(element => element.previousElementSibling.id)).toBe("publications-mount");
  expect(await section.evaluate(element => element.nextElementSibling.id)).toBe("experiences-mount");
  expect(apiRequests).toEqual([]);
});

test("expanded evidence uses accessible status icons and concise mechanisms without status captions or tags", async ({ page }) => {
  await page.goto("/#open-source");
  const section = page.locator("#open-source-section");
  await openEvidence(section);
  await expect(section.locator(".tag, [data-pr-tag], .contribution-tags")).toHaveCount(0);
  for (const pr of selected) {
    const entry = groupFor(page, pr.repository).locator(`[data-contribution-number="${pr.number}"]`);
    const status = pr.status === "merged" ? "Merged" : "Open";
    const icon = entry.getByRole("img", { name: status, exact: true });
    await expect(icon).toHaveAttribute("title", status);
    await expect(entry.locator(".contribution-state-label")).toHaveCount(0);
    expect(await entry.innerText()).not.toMatch(/\b(?:Open|Merged)\b/);
    await expect(icon).toHaveText("");
    await expect(icon.locator("svg")).toHaveAttribute("aria-hidden", "true");
    expect(await icon.evaluate(element => getComputedStyle(element).color)).toBe(pr.status === "merged" ? "rgb(130, 80, 223)" : "rgb(26, 127, 55)");
    await expect(entry.locator(".contribution-pr-link")).toHaveAttribute("href", pr.url);
    await expect(entry.locator("a")).toHaveCount(1);
    const link = entry.locator(".contribution-pr-link");
    await page.mouse.move(0, 0);
    await expect(link).toHaveCSS("text-decoration-line", "none");
    await link.hover();
    await expect(link).toHaveCSS("text-decoration-line", "none");
    await page.mouse.move(0, 0);
    await expect(link).toHaveCSS("text-decoration-line", "none");
    await expect(entry.locator(".contribution-pr-link")).toHaveText(`#${pr.number} ${pr.linkLabel}`);
    await expect(entry.locator(".contribution-pr-link")).toHaveAccessibleName(`${pr.repository.split("/")[1]} PR #${pr.number}: ${pr.description} (${status})`);
    await expect(entry.locator(".contribution-explanation")).toHaveText(`${pr.mechanism} ${pr.validation}`);
    await expect(entry.locator(".tag, [data-pr-tag]")).toHaveCount(0);
  }
});

test("status transitions add independent native disclosures and reload restores collapsed state", async ({ page }) => {
  const snapshot = structuredClone(seedSnapshot);
  for (const pr of snapshot.pullRequests) { pr.status = "open"; pr.mergedAt = null; }
  await serveFixture(page, snapshot);
  await expect(page.locator(".contribution-disclosure")).toHaveCount(content.repositoryGroups.length);
  await expect(page.locator('[data-contribution-state="open"]')).toHaveCount(selection.length);
  await expect(page.locator(".contribution-repository-summary:visible")).toHaveCount(new Set(selection.map(pr => pr.repository)).size);
  for (const pr of snapshot.pullRequests) {
    if ([42422, 2976].includes(pr.number)) { pr.status = "merged"; pr.mergedAt = "2026-10-26T06:17:00Z"; }
    if (["huggingface/diffusers", "RL-Align/RL-Kernel"].includes(pr.repository)) pr.status = "closed";
    if (pr.number === 43242) pr.status = "draft";
  }
  const fixture = await serveFixture(page, snapshot);
  await expect(page.locator(".contribution-disclosure")).toHaveCount(fixture.repositoryGroups.length);
  await expect(groupFor(page, "huggingface/diffusers")).toHaveCount(0);
  await expect(groupFor(page, "RL-Align/RL-Kernel")).toHaveCount(0);
  await expect(groupFor(page, "hao-ai-lab/FastVideo").locator("details")).toHaveCount(1);
  await expect(page.locator('[data-contribution-number="43242"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sharded attention consistency", exact: true })).toHaveCount(0);
  await expect(page.locator('[data-contribution-number="42422"] .contribution-tags')).toHaveCount(0);
  // Status transitions must not promote a lower-priority merge above open work.
  await expect(groupFor(page, "sgl-project/sglang").locator(".contribution-pr-link")).toHaveText(
    fixture.repositoryGroups.find(repo => repo.name === "sgl-project/sglang").pullRequests.map(pr => `#${pr.number} ${pr.linkLabel}`));
  const toggles = page.locator(".contribution-toggle");
  await toggles.nth(0).click();
  await expect(page.locator(".contribution-disclosure[open]")).toHaveCount(1);
  await toggles.nth(1).click();
  await expect(page.locator(".contribution-disclosure[open]")).toHaveCount(2);
  await toggles.nth(0).click();
  await expect(page.locator(".contribution-disclosure[open]")).toHaveCount(1);
  await expect(page.locator(".contribution-entry:visible")).toHaveCount(fixture.repositoryGroups[1].pullRequests.length);
  await page.reload();
  await expect(page.locator(".contribution-disclosure[open], .contribution-entry:visible")).toHaveCount(0);
  for (const pr of snapshot.pullRequests) pr.status = "closed";
  await serveFixture(page, snapshot);
  await expect(page.locator(".contribution-repository, .contribution-disclosure")).toHaveCount(0);
  await expect(page.locator(".contributions-empty")).toBeVisible();
});

test("summaries and native selected PR disclosures work without JavaScript", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  await page.goto(`${baseURL}/#open-source`);
  const section = page.locator("#open-source-section");
  await expect(section.locator(".contribution-repository-summary:visible")).toHaveCount(content.repositoryGroups.length);
  await expect(section.locator(".contribution-entry:visible")).toHaveCount(0);
  await expect(section.locator(".contribution-repository-intro:visible")).toHaveCount(content.repositoryGroups.length);
  await openEvidence(section);
  await expect(section.locator(".tag, [data-pr-tag]")).toHaveCount(0);
  await expect(section.locator(".contribution-entry:visible")).toHaveCount(selected.length);
  await expectNoOverflow(section, page);
  await page.reload();
  await expect(section.locator("details[open]")).toHaveCount(0);
  await context.close();
});

test("navigation and disclosure keyboard activation preserve visible focus", async ({ page }) => {
  await page.goto("/");
  if (page.viewportSize().width <= 900) await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.locator(".navbar").getByRole("link", { name: "Open Source", exact: true }).click();
  await expect(page.locator("#open-source")).toBeInViewport();
  const repo = content.repositoryGroups.find(group => group.pullRequests.length);
  test.skip(!repo, "Live snapshot has no selected evidence; fixture test covers disclosures");
  const group = groupFor(page, repo.name);
  await group.locator(".contribution-repository-title a").focus();
  await page.keyboard.press("Tab");
  const toggle = group.locator("summary");
  await expect(toggle).toBeFocused();
  expect(await toggle.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Space");
  await expect(group.locator("details")).toHaveAttribute("open", "");
  await page.keyboard.press("Tab");
  await expect(group.locator(".contribution-pr-link").first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(group.locator(".contribution-entry:visible")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(group.locator(".contribution-pr-link").first()).not.toBeFocused();
});

test("logos and project introductions align and collapsed and expanded contributions fit nine widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Explicit breakpoint check runs once");
  // Nine viewport/image/disclosure checks need more than one ordinary test's
  // budget on CI. Reduced motion keeps scrolling stable during measurement.
  test.slow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 1366, 1024, 901, 900, 768, 390, 375, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/?viewport=${width}#open-source`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator("#open-source-section");
    await section.scrollIntoViewIfNeeded();
    for (const image of await section.locator(".contribution-logo img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty("complete", true);
      expect(await image.evaluate(element => element.naturalWidth)).toBeGreaterThan(0);
      if (width === 1440) {
        const transparency = await image.evaluate(element => {
          const canvas = document.createElement("canvas");
          canvas.width = element.naturalWidth;
          canvas.height = element.naturalHeight;
          const context = canvas.getContext("2d");
          context.drawImage(element, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let transparent = 0;
          let foreground = 0;
          for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] === 0) transparent += 1;
            if (pixels[index] > 127) foreground += 1;
          }
          return { transparent, foreground, cornerAlpha: pixels[3] };
        });
        expect(transparency.cornerAlpha).toBe(0);
        expect(transparency.transparent).toBeGreaterThan(0);
        expect(transparency.foreground).toBeGreaterThan(0);
      }
    }
    const geometry = await section.evaluate(section => {
      const headingLeft = section.querySelector("h2").getBoundingClientRect().left;
      return Array.from(section.querySelectorAll(".contribution-repository"), article => {
        const box = article.getBoundingClientRect();
        const media = article.querySelector(".entry-media-cell").getBoundingClientRect();
        const content = article.querySelector(".entry-content-cell").getBoundingClientRect();
        const logo = article.querySelector(".contribution-logo").getBoundingClientRect();
        const intro = article.querySelector(".contribution-repository-intro").getBoundingClientRect();
        const title = article.querySelector(".contribution-repository-title").getBoundingClientRect();
        const summary = article.querySelector(".contribution-repository-summary").getBoundingClientRect();
        const imageStyle = getComputedStyle(article.querySelector("img"));
        const image = article.querySelector("img");
        const imageBox = image.getBoundingClientRect();
        const contentStyle = getComputedStyle(article.querySelector(".entry-content-cell"));
        return {
          left: box.left, headingLeft, mediaLeft: media.left, logoLeft: logo.left,
          width: box.width, mediaWidth: media.width, contentWidth: content.width,
          contentTop: content.top, mediaBottom: media.bottom,
          logoHeight: logo.height, logoWidth: logo.width,
          introLeft: intro.left, titleLeft: title.left, introTop: intro.top, titleBottom: title.bottom,
          summaryLeft: summary.left, summaryTop: summary.top, introBottom: intro.bottom,
          imageWidth: imageBox.width, imageHeight: imageBox.height,
          imageCenter: imageBox.left + imageBox.width / 2, logoCenter: logo.left + logo.width / 2,
          naturalRatio: image.naturalWidth / image.naturalHeight,
          fit: imageStyle.objectFit, position: imageStyle.objectPosition,
          divider: contentStyle.borderLeftWidth,
        };
      });
    });
    for (const row of geometry) {
      for (const left of [row.left, row.mediaLeft, row.logoLeft]) {
        expect(Math.abs(left - row.headingLeft)).toBeLessThanOrEqual(1);
      }
      expect(row.fit).toBe("contain");
      expect(row.position).toBe("50% 50%");
      expect(row.introLeft).toBeCloseTo(row.titleLeft, 1);
      expect(row.summaryLeft).toBeCloseTo(row.introLeft, 1);
      expect(row.introTop).toBeGreaterThanOrEqual(row.titleBottom);
      expect(row.summaryTop - row.introBottom).toBeCloseTo(8, 1);
      expect(row.imageWidth).toBeCloseTo(180, 1);
      expect(row.imageCenter).toBeCloseTo(row.logoCenter, 1);
      expect(row.imageWidth / row.imageHeight).toBeCloseTo(row.naturalRatio, 2);
      expect(row.logoHeight).toBeCloseTo(Math.max(width <= 900 ? 72 : 82, row.imageHeight), 1);
      expect(row.logoWidth).toBeCloseTo(Math.min(width <= 900 ? 260 : 220, row.mediaWidth - (width <= 900 ? 0 : 14)), 1);
      if (width <= 900) {
        expect(row.mediaWidth).toBeCloseTo(row.width, 1);
        expect(row.contentTop).toBeGreaterThanOrEqual(row.mediaBottom);
        expect(row.divider).toBe("0px");
      } else {
        expect(row.mediaWidth / row.width).toBeCloseTo(0.26, 3);
        expect(row.contentWidth / row.width).toBeCloseTo(0.74, 3);
        expect(row.divider).toBe("1px");
      }
    }
    await expectNoOverflow(section, page);
    await expect(section.locator(".contribution-entry:visible")).toHaveCount(0);
    for (const toggle of await section.locator(".contribution-toggle").all()) {
      await expect(toggle).not.toHaveClass(/entry-tldr-toggle/);
      await expect(toggle).toHaveCSS("height", width <= 900 ? "44px" : "24px");
      await expect(toggle).toHaveCSS("border-top-width", "0px");
      await expect(toggle).toHaveCSS("border-radius", "0px");
      await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(toggle.locator("svg")).toHaveAttribute("aria-hidden", "true");
      await expect(toggle.locator("svg")).toHaveCSS("width", "12px");
      await expect(toggle.locator("svg")).toHaveCSS("transform", "none");
    }
    const collapsedHeight = await section.evaluate(element => element.getBoundingClientRect().height);
    await openEvidence(section);
    await expectNoOverflow(section, page);
    for (const toggle of await section.locator(".contribution-toggle").all()) {
      await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(toggle.locator("svg")).toHaveCSS("transform", "matrix(0, 1, -1, 0, 0, 0)");
    }
    if (selected.length) expect(await section.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(collapsedHeight);
    if ([1366, 375].includes(width)) {
      await section.screenshot({ path: `output/playwright/contributions-columns-${width}.png`, style: ".navbar, .skip-link { visibility: hidden; }" });
    }
    if (width <= 900) {
      for (const target of await section.locator("a, summary").all()) {
        expect(await target.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

test("repositories without configured artwork keep a text placeholder and project introduction", async ({ page }) => {
  await serveFixture(page, seedSnapshot, selection, {});
  const section = page.locator("#open-source-section");
  await expect(section.locator(".contribution-logo img")).toHaveCount(0);
  await expect(section.locator(".contribution-logo-fallback")).toHaveText(content.repositoryGroups.map(repository => repository.label));
  await expect(section.locator(".contribution-repository-intro")).toHaveText(content.repositoryGroups.map(repository => content.repositoryIntros[repository.name].text));
  await expectNoOverflow(section, page);
});
