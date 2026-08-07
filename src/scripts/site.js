import {
  getElement,
  initHeroBioDisclosure,
  initInitialScrollPosition,
  initLogoFallback,
  initMobileNavbar,
  initNewsArchiveDisclosure,
  initSmoothScroll,
  initToggleLinks,
  ready,
} from "./modules/core.js";
import { initMedia } from "./modules/media.js";

const DESKTOP_QUERY = "(min-width: 901px)";
const GALLERY_HASHES = new Set(["#gallery", "#blender-gallery", "#threejs-arts"]);
const desktopQuery = window.matchMedia ? window.matchMedia(DESKTOP_QUERY) : null;
let glassPromise;
let galleryPromise;
let blogPromise;

function matchesDesktop() {
  return !desktopQuery || desktopQuery.matches;
}

function loadDesktopGlass() {
  if (!matchesDesktop()) return Promise.resolve();
  if (!glassPromise) {
    glassPromise = Promise.all([
      loadStylesheet(document.body.dataset.desktopStylesheet),
      import("./modules/glass-nav.js"),
    ])
      .then(([, { initSiteGlassNav }]) => initSiteGlassNav())
      .catch((error) => {
        glassPromise = null;
        console.warn("Unable to load desktop navigation effects:", error);
      });
  }
  return glassPromise;
}

function loadStylesheet(href) {
  if (!href) return Promise.resolve();

  const existing = Array.from(document.querySelectorAll("link[data-deferred-stylesheet]"))
    .find((link) => link.dataset.deferredStylesheet === href);
  if (existing) {
    if (existing.sheet) return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.deferredStylesheet = href;
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", reject, { once: true });
    document.head.appendChild(link);
  });
}

function loadGallery() {
  const section = document.querySelector(".gallery-section");
  if (!section || !matchesDesktop()) return Promise.resolve();
  if (!galleryPromise) {
    galleryPromise = Promise.all([
      loadStylesheet(section.dataset.galleryStylesheet),
      import("./modules/gallery.js"),
    ])
      .then(([, { initGalleryTabs }]) => {
        section.removeAttribute("data-gallery-pending");
        initGalleryTabs();
        if (GALLERY_HASHES.has(window.location.hash)) {
          window.dispatchEvent(new window.HashChangeEvent("hashchange"));
        }
      })
      .catch((error) => {
        galleryPromise = null;
        console.warn("Unable to load gallery enhancements:", error);
      });
  }
  return galleryPromise;
}

function observeGallery() {
  const section = document.querySelector(".gallery-section");
  if (!section || !matchesDesktop()) return;
  if (GALLERY_HASHES.has(window.location.hash)) {
    loadGallery();
    return;
  }
  if (typeof IntersectionObserver === "undefined") {
    loadGallery();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    loadGallery();
  }, { rootMargin: "1000px 0px", threshold: 0.01 });
  observer.observe(section);
}

function loadBlog() {
  if (!blogPromise) {
    blogPromise = import("./modules/blog.js")
      .then(({ loadBlogCards }) => loadBlogCards())
      .catch((error) => {
        blogPromise = null;
        console.warn("Unable to load blog cards:", error);
      });
  }
  return blogPromise;
}

function observeBlog() {
  const list = getElement("blog-list");
  if (!list) return;
  if (window.location.hash === "#blog") {
    loadBlog();
    return;
  }
  if (typeof IntersectionObserver === "undefined") {
    loadBlog();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    loadBlog();
  }, { rootMargin: "800px 0px", threshold: 0.01 });
  observer.observe(list);
}

function handleDesktopChange(event) {
  if (!event.matches) return;
  loadDesktopGlass();
  observeGallery();
}

initInitialScrollPosition();

ready(function () {
  initMedia();
  initToggleLinks();
  initLogoFallback();
  initMobileNavbar();
  initHeroBioDisclosure();
  initNewsArchiveDisclosure();
  initSmoothScroll();
  loadDesktopGlass();
  observeBlog();
  observeGallery();

  if (desktopQuery) {
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", handleDesktopChange);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(handleDesktopChange);
    }
  }
});
