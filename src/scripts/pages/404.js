import { Site } from "../modules/core.js";
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
        rafId = Site.requestFrame(animateCard);
      }

      function initCardMotion() {
        if (!Site || Site.prefersReducedMotion()) {
          writeCardVars(0, 0);
          return;
        }

        function updateTarget(event) {
          if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
          targetX = (event.clientX / window.innerWidth - 0.5) * 2;
          targetY = (event.clientY / window.innerHeight - 0.5) * 2;
        }

        window.addEventListener("pointermove", updateTarget, { passive: true });
        window.addEventListener("mousemove", updateTarget, { passive: true });

        window.addEventListener("pointerleave", function () {
          targetX = 0;
          targetY = 0;
        });

        window.addEventListener("blur", function () {
          targetX = 0;
          targetY = 0;
        });

        rafId = Site.requestFrame(animateCard);
      }

      function onReducedMotionChange() {
        if (Site.prefersReducedMotion()) {
          if (rafId !== null) Site.cancelFrame(rafId);
          rafId = null;
          targetX = 0;
          targetY = 0;
          currentX = 0;
          currentY = 0;
          writeCardVars(0, 0);
        } else if (rafId === null) {
          rafId = Site.requestFrame(animateCard);
        }
      }
Site.initLogoFallback();
      Site.initMobileNavbar();

      if (window.matchMedia) {
        var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (typeof reducedMotion.addEventListener === "function") {
          reducedMotion.addEventListener("change", onReducedMotionChange);
        } else if (typeof reducedMotion.addListener === "function") {
          reducedMotion.addListener(onReducedMotionChange);
        }
      }

      initCardMotion();
