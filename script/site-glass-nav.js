(function (window, document) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  var REDUCED_TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';
  var REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  var NAV_LINK_RADIUS = 16;

  var NAV_LINK_GLASS_ATTRS = {
    'data-site-glass': 'true',
    'data-radius': String(NAV_LINK_RADIUS),
    'data-r-offset': '0',
    'data-frost': '0.16',
    'data-backdrop-blur': '10',
    'data-saturate': '1.1',
    'data-glass-dark': 'true'
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

  function isEnabledViewport() {
    return !mediaMatches(REDUCED_TRANSPARENCY_QUERY) &&
      !mediaMatches(REDUCED_MOTION_QUERY);
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
    if (!link || !window.SiteGlass || !shouldUseNavLinkGlass()) return;

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
    return isEnabledViewport() && !isMobileViewport();
  }

  function shouldUseNavLinkGlass() {
    return shouldUseNavbarGlass();
  }

  function clearActiveNavLinkGlass() {
    Site.toArray(document.querySelectorAll('.navbar-links a.is-nav-glass-active')).forEach(function (link) {
      unmountNavLinkGlass(link);
    });
  }

  function initNavLinkGlassHover() {
    var navbar = getNavbar();
    if (!navbar || navbar.getAttribute('data-nav-glass-bound') === 'true') {
      return;
    }

    if (!shouldUseNavLinkGlass()) {
      clearActiveNavLinkGlass();
      return;
    }

    prepareNavLinks();

    Site.toArray(navbar.querySelectorAll('.navbar-links a')).forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        mountNavLinkGlass(link);
      });

      link.addEventListener('mouseleave', function () {
        unmountNavLinkGlass(link);
      });

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

    if (!navbar || !window.SiteGlass) return;

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
    initNavLinkGlassHover();
  }

  function syncSiteGlassNav() {
    var navbar = getNavbar();

    if (!shouldUseNavbarGlass()) {
      teardownNavbar();
      clearActiveNavLinkGlass();
      return;
    }

    if (!navbar || !window.SiteGlass) return;

    if (navbar.getAttribute('data-site-glass-ready') === 'true') {
      prepareNavLinks();
      applyResponsiveNavGlassConfig(navbar);
      SiteGlass.render(navbar);
      if (shouldUseNavLinkGlass()) {
        syncActiveNavLinkGlass();
        initNavLinkGlassHover();
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
    window.clearTimeout(Site._siteGlassResizeTimer);
    Site._siteGlassResizeTimer = window.setTimeout(syncSiteGlassNav, 180);
  });

  bindMediaChange(REDUCED_TRANSPARENCY_QUERY);
  bindMediaChange(REDUCED_MOTION_QUERY);
  bindMediaChange('(max-width: 900px)');

  Site.initSiteGlassNav = initSiteGlassNav;
}(window, document));
