(function (window, document) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  var REDUCED_TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';
  var REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
  var FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

  var NAV_LINK_RADIUS = 16;
  var materialFrame = 0;
  var materialRect = null;
  var materialState = {
    x: 28,
    y: 22,
    activity: 0,
    scrolled: false
  };

  var NAV_LINK_GLASS_ATTRS = {
    'data-site-glass': 'true',
    'data-radius': String(NAV_LINK_RADIUS),
    'data-r-offset': '0',
    'data-frost': '0.14',
    'data-backdrop-blur': '12',
    'data-saturate': '1.16',
    'data-glass-dark': 'false'
  };

  var NAV_LINK_GLASS_ATTR_NAMES = [
    'data-site-glass',
    'data-radius',
    'data-r-offset',
    'data-frost',
    'data-backdrop-blur',
    'data-saturate',
    'data-glass-dark',
    'data-scale',
    'data-g-offset',
    'data-b-offset',
    'data-blur',
    'data-border',
    'data-edge'
  ];

  function mediaMatches(query) {
    return Boolean(window.matchMedia && window.matchMedia(query).matches);
  }

  function isGlassEnabled() {
    return !mediaMatches(REDUCED_TRANSPARENCY_QUERY);
  }

  function shouldUseMaterialMotion() {
    return !mediaMatches(REDUCED_TRANSPARENCY_QUERY) &&
      !mediaMatches(REDUCED_MOTION_QUERY) &&
      mediaMatches(FINE_POINTER_QUERY) &&
      !isMobileViewport();
  }

  function isMobileViewport() {
    return mediaMatches('(max-width: 900px)');
  }

  function getResponsiveEdge() {
    return isMobileViewport() ? '0.13' : '0.18';
  }

  function getNavbarRadius() {
    return isMobileViewport() ? '0' : '30';
  }

  function setAttrs(element, attrs) {
    Object.keys(attrs).forEach(function (name) {
      element.setAttribute(name, attrs[name]);
    });
  }

  function getNavbar() {
    return document.querySelector('[data-site-glass-nav]');
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function renderMaterialState(navbar) {
    materialFrame = 0;
    if (!navbar) return;

    navbar.style.setProperty('--material-x', materialState.x.toFixed(2) + '%');
    navbar.style.setProperty('--material-y', materialState.y.toFixed(2) + '%');
    navbar.style.setProperty('--material-activity', materialState.activity.toFixed(2));
    navbar.setAttribute('data-material-active', materialState.activity > 0.05 ? 'true' : 'false');
    navbar.setAttribute('data-material-scrolled', materialState.scrolled ? 'true' : 'false');
  }

  function scheduleMaterialRender(navbar) {
    if (materialFrame) return;
    materialFrame = window.requestAnimationFrame(function () {
      renderMaterialState(navbar);
    });
  }

  function resetMaterialLight(navbar) {
    materialState.x = 28;
    materialState.y = 22;
    materialState.activity = 0;
    scheduleMaterialRender(navbar);
  }

  function updateMaterialFromPointer(navbar, event) {
    if (!shouldUseMaterialMotion()) return;

    materialRect = materialRect || navbar.getBoundingClientRect();
    if (!materialRect.width || !materialRect.height) return;

    materialState.x = clamp((event.clientX - materialRect.left) / materialRect.width * 100, 0, 100);
    materialState.y = clamp((event.clientY - materialRect.top) / materialRect.height * 100, 0, 100);
    materialState.activity = 1;
    scheduleMaterialRender(navbar);
  }

  function updateMaterialFromFocus(navbar, target) {
    var rect;
    var navRect;

    if (!target || !navbar.contains(target)) return;
    if (!shouldUseMaterialMotion()) {
      resetMaterialLight(navbar);
      return;
    }

    rect = target.getBoundingClientRect();
    navRect = navbar.getBoundingClientRect();
    if (!navRect.width || !navRect.height) return;

    materialState.x = clamp((rect.left + rect.width / 2 - navRect.left) / navRect.width * 100, 0, 100);
    materialState.y = clamp((rect.top + rect.height / 2 - navRect.top) / navRect.height * 100, 0, 100);
    materialState.activity = 0.72;
    scheduleMaterialRender(navbar);
  }

  function syncMaterialScroll(navbar) {
    var isScrolled = !isMobileViewport() && window.scrollY > 18;

    if (
      materialState.scrolled === isScrolled &&
      navbar.getAttribute('data-material-scrolled') !== null
    ) {
      return;
    }

    materialState.scrolled = isScrolled;
    scheduleMaterialRender(navbar);
  }

  function syncMaterialMode(navbar) {
    var motionEnabled = shouldUseMaterialMotion();

    navbar.setAttribute('data-material-motion', motionEnabled ? 'true' : 'false');
    materialRect = null;

    if (!motionEnabled) {
      resetMaterialLight(navbar);
    }

    syncMaterialScroll(navbar);
  }

  function bindMaterialController(navbar) {
    if (!navbar || navbar.getAttribute('data-material-bound') === 'true') return;

    navbar.addEventListener('pointerenter', function () {
      materialRect = navbar.getBoundingClientRect();
    });

    navbar.addEventListener('pointermove', function (event) {
      updateMaterialFromPointer(navbar, event);
    });

    navbar.addEventListener('pointerleave', function () {
      materialRect = null;
      resetMaterialLight(navbar);
    });

    navbar.addEventListener('pointercancel', function () {
      materialRect = null;
      resetMaterialLight(navbar);
    });

    navbar.addEventListener('focusin', function (event) {
      updateMaterialFromFocus(navbar, event.target);
    });

    navbar.addEventListener('focusout', function (event) {
      if (!event.relatedTarget || !navbar.contains(event.relatedTarget)) {
        resetMaterialLight(navbar);
      }
    });

    window.addEventListener('scroll', function () {
      syncMaterialScroll(navbar);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) resetMaterialLight(navbar);
    });

    window.addEventListener('blur', function () {
      materialRect = null;
      resetMaterialLight(navbar);
    });

    navbar.setAttribute('data-material-bound', 'true');
    syncMaterialMode(navbar);
  }

  function ensureNavLinkChip(link) {
    var chip = link.querySelector('.nav-link-chip');
    if (chip) return chip;

    chip = document.createElement('span');
    chip.className = 'nav-link-chip';

    while (link.firstChild) {
      chip.appendChild(link.firstChild);
    }

    link.appendChild(chip);
    return chip;
  }

  function prepareNavLinks() {
    var navbar = getNavbar();
    if (!navbar) return;

    Site.toArray(navbar.querySelectorAll('.navbar-links a')).forEach(ensureNavLinkChip);
  }

  function teardownNavbar() {
    var navbar = getNavbar();
    if (navbar && window.SiteGlass) {
      SiteGlass.unmount(navbar);
    }
    if (navbar) {
      navbar.removeAttribute('data-site-glass-ready');
    }
  }

  function readGlassNumber(element, name, fallback) {
    var value = parseFloat(element.getAttribute('data-' + name));
    return isFinite(value) ? value : fallback;
  }

  function getElementMinSize(element, fallback) {
    var rect = element && element.getBoundingClientRect ? element.getBoundingClientRect() : null;
    var width = rect ? rect.width : 0;
    var height = rect ? rect.height : 0;

    if (width < 2 || height < 2) {
      return fallback || 64;
    }

    return Math.max(1, Math.min(width, height));
  }

  function getNavLinkGlassProportion(navbar) {
    var refRadius = readGlassNumber(navbar, 'radius', 30);

    if (refRadius > 0) {
      return Math.max(0.35, Math.min(1, NAV_LINK_RADIUS / refRadius));
    }

    var navThickness = getElementMinSize(navbar);
    var pillHeight = NAV_LINK_RADIUS * 2 + 8;
    return Math.max(0.35, Math.min(1, pillHeight / navThickness));
  }

  function applyProportionalNavLinkGlass(chip) {
    var navbar = getNavbar();

    setAttrs(chip, NAV_LINK_GLASS_ATTRS);
    chip.removeAttribute('data-chromatic');

    if (!navbar) return;

    var proportion = getNavLinkGlassProportion(navbar);
    var refEdge = readGlassNumber(navbar, 'edge', 0.18);
    var refBorder = readGlassNumber(navbar, 'border', 0.11);
    var refScale = readGlassNumber(navbar, 'scale', -115);
    var refG = readGlassNumber(navbar, 'g-offset', 6);
    var refB = readGlassNumber(navbar, 'b-offset', 12);
    var refBlur = readGlassNumber(navbar, 'blur', 18);

    chip.setAttribute('data-edge', String(Math.max(0.08, Math.min(0.28, refEdge * proportion)).toFixed(3)));
    chip.setAttribute('data-border', String(Math.max(0.06, Math.min(0.2, refBorder * proportion)).toFixed(3)));
    chip.setAttribute('data-scale', String(Math.round(refScale * proportion)));
    chip.setAttribute('data-g-offset', String(Math.round(refG * proportion * 10) / 10));
    chip.setAttribute('data-b-offset', String(Math.round(refB * proportion * 10) / 10));
    chip.setAttribute('data-blur', String(Math.round(refBlur * proportion * 10) / 10));
  }

  function clearNavLinkGlassAttrs(chip) {
    NAV_LINK_GLASS_ATTR_NAMES.forEach(function (name) {
      chip.removeAttribute(name);
    });
    chip.removeAttribute('data-site-glass-mounted');
    chip.removeAttribute('data-site-glass-id');
  }

  function mountNavLinkGlass(link) {
    if (!link || !window.SiteGlass || !shouldUseNavbarGlass()) return;

    var chip = ensureNavLinkChip(link);
    if (chip.getAttribute('data-nav-glass-active') === 'true') return;

    applyProportionalNavLinkGlass(chip);
    if (!chip.getAttribute('data-site-glass-id')) {
      chip.setAttribute('data-site-glass-id', 'site-nav-link-' + Math.random().toString(36).slice(2, 8));
    }

    SiteGlass.mount(chip);
    window.requestAnimationFrame(function () {
      if (window.SiteGlass && chip.isConnected) {
        SiteGlass.render(chip);
      }
    });
    Site.addClass(chip, 'is-nav-glass-active');
    Site.addClass(link, 'is-nav-glass-active');
    chip.setAttribute('data-nav-glass-active', 'true');
  }

  function unmountNavLinkGlass(link) {
    var chip = link && link.querySelector('.nav-link-chip');
    if (!chip || chip.getAttribute('data-nav-glass-active') !== 'true') return;

    if (window.SiteGlass) {
      SiteGlass.unmount(chip);
    }

    clearNavLinkGlassAttrs(chip);
    Site.removeClass(chip, 'is-nav-glass-active');
    Site.removeClass(link, 'is-nav-glass-active');
    chip.removeAttribute('data-nav-glass-active');
  }

  function shouldUseNavbarGlass() {
    return isGlassEnabled() && !isMobileViewport();
  }

  function clearActiveNavLinkGlass() {
    Site.toArray(document.querySelectorAll('.navbar-links a.is-nav-glass-active')).forEach(function (link) {
      unmountNavLinkGlass(link);
    });
  }

  function initNavLinkGlassFocus() {
    var navbar = getNavbar();
    if (!navbar || navbar.getAttribute('data-nav-glass-bound') === 'true') {
      return;
    }

    if (!shouldUseNavbarGlass()) {
      clearActiveNavLinkGlass();
      return;
    }

    prepareNavLinks();

    Site.toArray(navbar.querySelectorAll('.navbar-links a')).forEach(function (link) {
      link.addEventListener('focus', function () {
        mountNavLinkGlass(link);
      });

      link.addEventListener('blur', function () {
        unmountNavLinkGlass(link);
      });
    });

    navbar.setAttribute('data-nav-glass-bound', 'true');
  }

  function applyResponsiveNavGlassConfig(navbar) {
    navbar.setAttribute('data-radius', getNavbarRadius());
    navbar.setAttribute('data-border', isMobileViewport() ? '0.08' : '0.11');
    navbar.setAttribute('data-edge', getResponsiveEdge());
  }

  function syncActiveNavLinkGlass() {
    Site.toArray(document.querySelectorAll('.nav-link-chip[data-nav-glass-active="true"]')).forEach(function (chip) {
      applyProportionalNavLinkGlass(chip);
      if (window.SiteGlass) {
        SiteGlass.render(chip);
      }
    });
  }

  function initSiteGlassNav() {
    var navbar = getNavbar();

    if (!navbar) return;

    bindMaterialController(navbar);
    syncMaterialMode(navbar);

    if (!window.SiteGlass) return;

    if (!shouldUseNavbarGlass()) {
      teardownNavbar();
      clearActiveNavLinkGlass();
      return;
    }

    if (navbar.getAttribute('data-site-glass-ready') === 'true') return;

    prepareNavLinks();
    applyResponsiveNavGlassConfig(navbar);
    SiteGlass.mount(navbar);
    navbar.setAttribute('data-site-glass-ready', 'true');
    initNavLinkGlassFocus();
  }

  function syncSiteGlassNav() {
    var navbar = getNavbar();

    if (!navbar) return;

    bindMaterialController(navbar);
    syncMaterialMode(navbar);

    if (!shouldUseNavbarGlass()) {
      teardownNavbar();
      clearActiveNavLinkGlass();
      return;
    }

    if (!window.SiteGlass) return;

    if (navbar.getAttribute('data-site-glass-ready') === 'true') {
      prepareNavLinks();
      applyResponsiveNavGlassConfig(navbar);
      SiteGlass.render(navbar);
      if (shouldUseNavbarGlass()) {
        syncActiveNavLinkGlass();
        initNavLinkGlassFocus();
      } else {
        clearActiveNavLinkGlass();
      }
    } else {
      initSiteGlassNav();
    }
  }

  function bindMediaChange(query) {
    var queryList;
    if (!window.matchMedia) return;

    queryList = window.matchMedia(query);
    if (queryList.addEventListener) {
      queryList.addEventListener('change', syncSiteGlassNav);
    } else if (queryList.addListener) {
      queryList.addListener(syncSiteGlassNav);
    }
  }

  window.addEventListener('resize', function () {
    materialRect = null;
    window.clearTimeout(Site._siteGlassResizeTimer);
    Site._siteGlassResizeTimer = window.setTimeout(syncSiteGlassNav, 180);
  });

  bindMediaChange(REDUCED_TRANSPARENCY_QUERY);
  bindMediaChange(REDUCED_MOTION_QUERY);
  bindMediaChange(FINE_POINTER_QUERY);
  bindMediaChange('(max-width: 900px)');

  Site.initSiteGlassNav = initSiteGlassNav;
}(window, document));
