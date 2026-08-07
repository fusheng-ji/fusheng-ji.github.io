import {
  cancelFrame,
  initLogoFallback,
  initMobileNavbar,
  prefersReducedMotion,
  requestFrame,
} from "../modules/core.js";
var root = document.documentElement;
      var targetX = 0;
      var targetY = 0;
      var currentX = 0;
      var currentY = 0;
      var rafId = null;

      function writeCardVars(x, y) {
        var energy = Math.min(1, Math.sqrt(x * x + y * y));
        root.style.setProperty("--mx", x.toFixed(4));
        root.style.setProperty("--my", y.toFixed(4));
        root.style.setProperty("--rx", (-y * 7).toFixed(3) + "deg");
        root.style.setProperty("--ry", (x * 9).toFixed(3) + "deg");
        root.style.setProperty("--glare-x", ((x * 0.42 + 0.5) * 100).toFixed(2) + "%");
        root.style.setProperty("--glare-y", ((y * 0.36 + 0.46) * 100).toFixed(2) + "%");
        root.style.setProperty("--energy", energy.toFixed(4));
      }

      function animateCard() {
        currentX += (targetX - currentX) * 0.075;
        currentY += (targetY - currentY) * 0.075;
        writeCardVars(currentX, currentY);
        if (Math.abs(targetX - currentX) > 0.0005 || Math.abs(targetY - currentY) > 0.0005) {
          rafId = requestFrame(animateCard);
        } else {
          currentX = targetX;
          currentY = targetY;
          writeCardVars(currentX, currentY);
          rafId = null;
        }
      }

      function scheduleCardMotion() {
        if (rafId === null) rafId = requestFrame(animateCard);
      }

      function initCardMotion() {
        if (prefersReducedMotion()) {
          writeCardVars(0, 0);
          return;
        }

        function updateTarget(event) {
          if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
          targetX = (event.clientX / window.innerWidth - 0.5) * 2;
          targetY = (event.clientY / window.innerHeight - 0.5) * 2;
          scheduleCardMotion();
        }

        window.addEventListener("pointermove", updateTarget, { passive: true });
        window.addEventListener("mousemove", updateTarget, { passive: true });

        window.addEventListener("pointerleave", function () {
          targetX = 0;
          targetY = 0;
          scheduleCardMotion();
        });

        window.addEventListener("blur", function () {
          targetX = 0;
          targetY = 0;
          scheduleCardMotion();
        });

        scheduleCardMotion();
      }

      function onReducedMotionChange() {
        if (prefersReducedMotion()) {
          if (rafId !== null) cancelFrame(rafId);
          rafId = null;
          targetX = 0;
          targetY = 0;
          currentX = 0;
          currentY = 0;
          writeCardVars(0, 0);
        } else if (rafId === null) {
          rafId = requestFrame(animateCard);
        }
      }
initLogoFallback();
      initMobileNavbar();

      var desktopGlassQuery = window.matchMedia && window.matchMedia("(min-width: 901px)");
      var glassPromise = null;
      function loadStylesheet(href) {
        if (!href) return Promise.resolve();
        var existing = document.querySelector('link[data-desktop-stylesheet="true"]');
        if (existing && existing.sheet) return Promise.resolve();
        return new Promise(function (resolve, reject) {
          var link = existing || document.createElement("link");
          link.addEventListener("load", resolve, { once: true });
          link.addEventListener("error", reject, { once: true });
          if (!existing) {
            link.rel = "stylesheet";
            link.href = href;
            link.setAttribute("data-desktop-stylesheet", "true");
            document.head.appendChild(link);
          }
        });
      }
      function loadDesktopGlass() {
        if (desktopGlassQuery && !desktopGlassQuery.matches) return;
        if (!glassPromise) {
          glassPromise = Promise.all([
            loadStylesheet(document.body.getAttribute("data-desktop-stylesheet")),
            import("../modules/glass-nav.js")
          ])
            .then(function (results) {
              results[1].initSiteGlassNav();
            })
            .catch(function (error) {
              glassPromise = null;
              console.warn("Unable to load desktop navigation effects:", error);
            });
        }
      }
      loadDesktopGlass();

      if (desktopGlassQuery) {
        if (desktopGlassQuery.addEventListener) {
          desktopGlassQuery.addEventListener("change", loadDesktopGlass);
        } else if (desktopGlassQuery.addListener) {
          desktopGlassQuery.addListener(loadDesktopGlass);
        }
      }

      if (window.matchMedia) {
        var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (typeof reducedMotion.addEventListener === "function") {
          reducedMotion.addEventListener("change", onReducedMotionChange);
        } else if (typeof reducedMotion.addListener === "function") {
          reducedMotion.addListener(onReducedMotionChange);
        }
      }

      initCardMotion();
