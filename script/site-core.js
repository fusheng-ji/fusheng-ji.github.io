(function (window, document) {
  'use strict';

  var Site = window.Site || {};

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
      return;
    }

    callback();
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function getData(element, name) {
    if (!element) return '';
    return element.getAttribute('data-' + name.replace(/([A-Z])/g, '-$1').toLowerCase()) || '';
  }

  function setData(element, name, value) {
    if (!element) return;
    element.setAttribute('data-' + name.replace(/([A-Z])/g, '-$1').toLowerCase(), String(value));
  }

  function hasClass(element, className) {
    if (!element) return false;
    if (element.classList) return element.classList.contains(className);
    return (' ' + element.className + ' ').indexOf(' ' + className + ' ') > -1;
  }

  function addClass(element, className) {
    if (!element || hasClass(element, className)) return;
    if (element.classList) {
      element.classList.add(className);
      return;
    }
    element.className = (element.className ? element.className + ' ' : '') + className;
  }

  function removeClass(element, className) {
    if (!element) return;
    if (element.classList) {
      element.classList.remove(className);
      return;
    }
    element.className = (' ' + element.className + ' ').replace(' ' + className + ' ', ' ').replace(/^\s+|\s+$/g, '');
  }

  function toggleClass(element, className, enabled) {
    if (enabled) addClass(element, className);
    else removeClass(element, className);
  }

  function closest(element, selector) {
    while (element && element.nodeType === 1) {
      if (element.matches && element.matches(selector)) return element;
      if (element.webkitMatchesSelector && element.webkitMatchesSelector(selector)) return element;
      if (element.msMatchesSelector && element.msMatchesSelector(selector)) return element;
      element = element.parentElement;
    }
    return null;
  }

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  function requestFrame(callback) {
    return (window.requestAnimationFrame || function (fn) {
      return window.setTimeout(fn, 16);
    })(callback);
  }

  function cancelFrame(id) {
    (window.cancelAnimationFrame || window.clearTimeout)(id);
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function isHidden(element) {
    return !element || window.getComputedStyle(element).display === 'none';
  }

  function setBlockExpanded(link, block) {
    if (!link || !block) return;
    link.setAttribute('aria-expanded', String(!isHidden(block)));
  }

  window.toggleblock = function toggleblock(blockId) {
    var block = getElement(blockId);
    if (!block) return false;

    block.style.display = isHidden(block) ? 'block' : 'none';
    return false;
  };

  function initInitialScrollPosition() {
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch (error) {
      console.warn('Unable to disable scroll restoration:', error);
    }

    function scrollToTopIfNoHash() {
      if (window.location.hash) return;
      window.scrollTo(0, 0);
    }

    scrollToTopIfNoHash();
    window.addEventListener('pageshow', scrollToTopIfNoHash);
    window.addEventListener('load', function () {
      requestFrame(scrollToTopIfNoHash);
    });
  }

  function initToggleLinks() {
    toArray(document.querySelectorAll('[data-toggle-target]')).forEach(function (link) {
      var blockId = link.getAttribute('data-toggle-target');
      var block = getElement(blockId);

      setBlockExpanded(link, block);

      link.addEventListener('click', function (event) {
        event.preventDefault();
        window.toggleblock(blockId);
        setBlockExpanded(link, block);
      });
    });
  }

  function setNavOpen(navbar, toggle, isOpen) {
    if (!navbar || !toggle) return;
    toggleClass(navbar, 'is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  }

  function initMobileNavbar() {
    var navbar = document.querySelector('.navbar');
    var toggle = document.querySelector('.navbar-toggle');
    var navLinks = getElement('site-nav');
    if (!navbar || !toggle || !navLinks) return;

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      setNavOpen(navbar, toggle, !hasClass(navbar, 'is-open'));
    });

    toArray(navLinks.querySelectorAll('a')).forEach(function (link) {
      link.addEventListener('click', function () {
        setNavOpen(navbar, toggle, false);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setNavOpen(navbar, toggle, false);
      }
    });

    document.addEventListener('click', function (event) {
      if (!hasClass(navbar, 'is-open')) return;
      if (navbar.contains(event.target)) return;
      setNavOpen(navbar, toggle, false);
    });

    window.addEventListener('resize', function () {
      if (window.matchMedia && window.matchMedia('(min-width: 901px)').matches) {
        setNavOpen(navbar, toggle, false);
      }
    });
  }

  function initHeroBioDisclosure() {
    var disclosure = document.querySelector('.hero-bio-more');
    if (!disclosure || !window.matchMedia) return;

    var mobileQuery = window.matchMedia('(max-width: 768px)');

    function syncDisclosure(event) {
      disclosure.open = !event.matches;
    }

    syncDisclosure(mobileQuery);

    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', syncDisclosure);
    } else if (mobileQuery.addListener) {
      mobileQuery.addListener(syncDisclosure);
    }
  }

  function initLogoFallback() {
    var logo = document.querySelector('.navbar-brand img[data-fallback-src]');
    if (!logo) return;

    function useFallback() {
      if (getData(logo, 'fallbackApplied') === 'true') return;
      setData(logo, 'fallbackApplied', 'true');
      logo.src = getData(logo, 'fallbackSrc');
    }

    logo.addEventListener('error', useFallback);

    if (logo.complete && logo.naturalWidth === 0) {
      useFallback();
    }
  }

  function scrollElementIntoView(element, immediate) {
    if (!element || typeof element.scrollIntoView !== 'function') return;

    try {
      element.scrollIntoView({
        behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    } catch (error) {
      element.scrollIntoView();
    }
  }

  function initSmoothScroll() {
    function getOffset() {
      var nav = document.querySelector('.navbar');
      return (nav ? nav.offsetHeight : 0) + 8;
    }

    function getTarget(hash) {
      try {
        return hash ? document.querySelector(hash) : null;
      } catch (error) {
        return null;
      }
    }

    function stabilizeGalleryScroll(hash) {
      if (['#gallery', '#blender-gallery', '#threejs-arts'].indexOf(hash) === -1) return;

      var remainingCorrections = 4;

      function correctAfterMediaLayout() {
        var target = getTarget(hash);
        if (!target) return;

        var targetOffset = target.getBoundingClientRect().top - getOffset();
        if (Math.abs(targetOffset) > 2) {
          window.scrollTo(0, window.pageYOffset + targetOffset);
        }

        remainingCorrections -= 1;
        if (remainingCorrections > 0) {
          window.setTimeout(correctAfterMediaLayout, 300);
        }
      }

      window.setTimeout(correctAfterMediaLayout, 700);
    }

    function scrollToHash(hash, replaceState) {
      if (!hash || hash === '#') return;

      var target = getTarget(hash);
      if (!target) return;

      var top = target.getBoundingClientRect().top + window.pageYOffset - getOffset();
      var supportsSmoothScroll = 'scrollBehavior' in document.documentElement.style && !prefersReducedMotion();

      if (supportsSmoothScroll) {
        window.scrollTo({ top: top, behavior: 'smooth' });
      } else {
        window.scrollTo(0, top);
      }

      stabilizeGalleryScroll(hash);

      if (replaceState) {
        try {
          window.history.replaceState(null, '', hash);
        } catch (error) {
          console.warn('Unable to update history state:', error);
        }
      }
    }

    toArray(document.querySelectorAll('.navbar a[href^="#"]')).forEach(function (link) {
      link.addEventListener('click', function (event) {
        var hash = link.getAttribute('href');
        if (!hash || hash.length <= 1) return;

        event.preventDefault();
        scrollToHash(hash, false);
      });
    });

    if (window.location.hash) {
      window.setTimeout(function () {
        scrollToHash(window.location.hash, true);
      }, 0);
    }

    window.addEventListener('hashchange', function () {
      scrollToHash(window.location.hash, false);
    });
  }

  Site.toArray = toArray;
  Site.ready = ready;
  Site.getElement = getElement;
  Site.getData = getData;
  Site.setData = setData;
  Site.hasClass = hasClass;
  Site.addClass = addClass;
  Site.removeClass = removeClass;
  Site.toggleClass = toggleClass;
  Site.closest = closest;
  Site.removeNode = removeNode;
  Site.requestFrame = requestFrame;
  Site.cancelFrame = cancelFrame;
  Site.prefersReducedMotion = prefersReducedMotion;
  Site.scrollElementIntoView = scrollElementIntoView;
  Site.initInitialScrollPosition = initInitialScrollPosition;
  Site.initToggleLinks = initToggleLinks;
  Site.initMobileNavbar = initMobileNavbar;
  Site.initHeroBioDisclosure = initHeroBioDisclosure;
  Site.initLogoFallback = initLogoFallback;
  Site.initSmoothScroll = initSmoothScroll;

  window.Site = Site;
}(window, document));
