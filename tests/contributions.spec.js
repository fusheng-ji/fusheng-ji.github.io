import { expect, test } from "@playwright/test";
import nunjucks from "nunjucks";
import openSource from "../src/_data/openSource.js";
import { contributionView } from "../scripts/lib/contribution-view.mjs";

const content = openSource();
const { selection, categories, repositorySummaries, seedSnapshot } = openSource({ configurationOnly: true });
const merged = content.repositoryGroups.flatMap(group => group.mergedPullRequests);
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader("src/_includes"), { autoescape: true });
const template = '{% import "components/ui.njk" as ui with context %}{% include "components/open-source.njk" %}';
const groupFor = (page, name) => page.locator(`[data-contribution-repository="${name}"]`);

async function serveFixture(page, snapshot, curated = selection) {
  const fixture = contributionView(snapshot, curated, categories, repositorySummaries);
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
    return [...element.querySelectorAll(".contribution-repository-summary, .contribution-repository-heading, .tag, .contribution-toggle, .contribution-entry, .contribution-pr-link")]
      .filter(child => child.getClientRects().length)
      .every(child => {
        const box = child.getBoundingClientRect();
        return box.left >= bounds.left - 1 && box.right <= bounds.right + 1;
      });
  })).toBe(true);
}

test("repository summaries stay visible while only merged evidence is rendered and initially collapsed", async ({ page }) => {
  const apiRequests = [];
  page.on("request", request => { if (new URL(request.url()).hostname === "api.github.com") apiRequests.push(request.url()); });
  await page.goto("/#open-source");
  const section = page.locator("#open-source-section");
  await expect(groupFor(page, "nerfstudio-project/gsplat")).toHaveCount(0);
  await expect(section.locator(".contribution-repository-summary:visible")).toHaveCount(content.repositoryGroups.length);
  await expect(section.locator(".contribution-entry")).toHaveCount(merged.length);
  await expect(section.locator(".contribution-entry:visible, details[open]")).toHaveCount(0);
  await expect(section.locator("img, .contributions-stats, .contributions-sync, .contributions-view-all, .contributions-filters, .contributions-pagination, time")).toHaveCount(0);
  for (const repo of content.repositoryGroups) {
    const group = groupFor(page, repo.name);
    await expect(group.locator("h3 a")).toHaveText(repo.label);
    await expect(group.locator("h3 a")).toHaveAttribute("href", repo.url);
    await expect(group.locator(".contribution-repository-summary")).toHaveText(repo.technicalSummary);
    await expect(group.locator("[data-contribution-category]")).toHaveText(repo.categories.map(category => category.label));
    await expect(group.locator("details")).toHaveCount(Number(repo.mergedPullRequests.length > 0));
    await expect(group.locator(".contribution-entry")).toHaveCount(repo.mergedPullRequests.length);
  }
  const html = await section.innerHTML();
  for (const pr of content.snapshot.pullRequests.filter(pr => pr.status !== "merged")) expect(html).not.toContain(pr.url);
  expect(html).not.toMatch(/data-contribution-state="(?:open|draft|closed)"/);
  expect(html).not.toContain("https://github.com/xdit-project/xDiT/pull/867");
  expect(await section.evaluate(element => element.previousElementSibling.id)).toBe("publications-mount");
  expect(await section.evaluate(element => element.nextElementSibling.id)).toBe("experiences-mount");
  expect(apiRequests).toEqual([]);
});

test("expanded evidence has purple accessible merge icons and full PR link names", async ({ page }) => {
  await page.goto("/#open-source");
  const section = page.locator("#open-source-section");
  await openEvidence(section);
  for (const pr of merged) {
    const entry = groupFor(page, pr.repository).locator(`[data-contribution-number="${pr.number}"]`);
    const icon = entry.getByRole("img", { name: "Merged", exact: true });
    await expect(icon).toHaveAttribute("title", "Merged");
    await expect(icon).toHaveText("");
    await expect(icon.locator("svg")).toHaveAttribute("aria-hidden", "true");
    expect(await icon.evaluate(element => getComputedStyle(element).color)).toBe("rgb(130, 80, 223)");
    await expect(entry.locator(".contribution-pr-link")).toHaveAttribute("href", pr.url);
    await expect(entry.locator("a")).toHaveCount(1);
    const link = entry.locator(".contribution-pr-link");
    await page.mouse.move(0, 0);
    await expect(link).toHaveCSS("text-decoration-line", "none");
    await link.hover();
    await expect(link).toHaveCSS("text-decoration-line", "underline");
    await page.mouse.move(0, 0);
    await expect(link).toHaveCSS("text-decoration-line", "none");
    await expect(entry.locator(".contribution-pr-link")).toHaveText(`#${pr.number} ${pr.description}`);
    await expect(entry.locator(".contribution-pr-link")).toHaveAccessibleName(`${pr.repository.split("/")[1]} PR #${pr.number}: ${pr.description} (Merged)`);
    await expect(entry.locator(".contribution-description")).toContainText(pr.description);
    await expect(entry.locator(".contribution-tags")).toHaveCount(pr.mechanism ? 1 : 0);
  }
});

test("status transitions add independent native disclosures and reload restores collapsed state", async ({ page }) => {
  const snapshot = structuredClone(seedSnapshot);
  for (const pr of snapshot.pullRequests) { pr.status = "open"; pr.mergedAt = null; }
  await serveFixture(page, snapshot);
  await expect(page.locator(".contribution-disclosure")).toHaveCount(0);
  await expect(page.locator(".contribution-repository-summary:visible")).toHaveCount(new Set(selection.map(pr => pr.repository)).size);
  for (const pr of snapshot.pullRequests) {
    if ([42422, 2976].includes(pr.number)) { pr.status = "merged"; pr.mergedAt = "2026-10-26T06:17:00Z"; }
    if (pr.number === 14942 || pr.repository === "RL-Align/RL-Kernel") pr.status = "closed";
    if (pr.number === 467) pr.status = "draft";
  }
  const curated = selection.map(pr => pr.number === 42422 ? { ...pr, mechanism: undefined } : pr);
  await serveFixture(page, snapshot, curated);
  await expect(page.locator(".contribution-disclosure")).toHaveCount(2);
  await expect(groupFor(page, "huggingface/diffusers")).toHaveCount(0);
  await expect(groupFor(page, "RL-Align/RL-Kernel")).toHaveCount(0);
  await expect(groupFor(page, "hao-ai-lab/FastVideo").locator("details")).toHaveCount(0);
  await expect(page.locator('[data-contribution-number="42423"]')).toHaveCount(0);
  await expect(page.locator('[data-contribution-number="42422"] .contribution-tags')).toHaveCount(0);
  const toggles = page.locator(".contribution-toggle");
  await toggles.nth(0).click();
  await expect(page.locator(".contribution-disclosure[open]")).toHaveCount(1);
  await toggles.nth(1).click();
  await expect(page.locator(".contribution-disclosure[open]")).toHaveCount(2);
  await toggles.nth(0).click();
  await expect(page.locator(".contribution-disclosure[open]")).toHaveCount(1);
  await expect(page.locator(".contribution-entry:visible")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".contribution-disclosure[open], .contribution-entry:visible")).toHaveCount(0);
  for (const pr of snapshot.pullRequests) pr.status = "closed";
  await serveFixture(page, snapshot);
  await expect(page.locator(".contribution-repository, .contribution-disclosure")).toHaveCount(0);
  await expect(page.locator(".contributions-empty")).toBeVisible();
});

test("summaries and native merged disclosures work without JavaScript", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  await page.goto(`${baseURL}/#open-source`);
  const section = page.locator("#open-source-section");
  await expect(section.locator(".contribution-repository-summary:visible")).toHaveCount(content.repositoryGroups.length);
  await expect(section.locator(".contribution-entry:visible")).toHaveCount(0);
  expect(await section.locator(".tag").first().evaluate(element => getComputedStyle(element).borderRadius)).toBe("5px");
  await openEvidence(section);
  await expect(section.locator(".contribution-entry:visible")).toHaveCount(merged.length);
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
  const repo = content.repositoryGroups.find(group => group.mergedPullRequests.length);
  test.skip(!repo, "Live snapshot has no merged evidence; fixture test covers disclosures");
  const group = groupFor(page, repo.name);
  await group.locator("h3 a").focus();
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

test("collapsed and expanded contributions fit all seven widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Explicit breakpoint check runs once");
  for (const width of [1440, 1024, 901, 900, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#open-source");
    await page.reload();
    const section = page.locator("#open-source-section");
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
    if (merged.length) expect(await section.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(collapsedHeight);
    if (width <= 900) {
      for (const target of await section.locator("a, summary").all()) {
        expect(await target.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      }
    }
  }
});
