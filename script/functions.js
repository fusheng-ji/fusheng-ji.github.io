(function () {
  'use strict';

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
      window.requestAnimationFrame(scrollToTopIfNoHash);
    });
  }

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
      return;
    }

    callback();
  }

  function getElement(id) {
    return document.getElementById(id);
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

  window.hideblock = function hideblock(blockId) {
    var block = getElement(blockId);
    if (!block) return false;

    block.style.display = 'none';
    return false;
  };

  function initToggleLinks() {
    document.querySelectorAll('[data-toggle-target]').forEach(function (link) {
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

  function isElementVisible(element) {
    return Boolean(element && element.offsetParent !== null);
  }

  function getCarouselNumberOption(carousel, optionName, fallbackValue) {
    if (!carousel) return fallbackValue;

    var rawValue = carousel.dataset[optionName];
    if (!rawValue) return fallbackValue;

    var parsedValue = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
  }

  function getCarouselBooleanOption(carousel, optionName, fallbackValue) {
    if (!carousel) return fallbackValue;

    var rawValue = carousel.dataset[optionName];
    if (typeof rawValue !== 'string' || rawValue === '') {
      return fallbackValue;
    }

    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;
    return fallbackValue;
  }

  function getCarouselOptions(carousel) {
    return {
      slidesToScroll: getCarouselNumberOption(carousel, 'slidesToScroll', 1),
      slidesToShow: getCarouselNumberOption(carousel, 'slidesToShow', 2),
      loop: getCarouselBooleanOption(carousel, 'loop', true),
      infinite: getCarouselBooleanOption(carousel, 'infinite', true),
      navigation: getCarouselBooleanOption(carousel, 'navigation', true),
      navigationSwipe: getCarouselBooleanOption(carousel, 'navigationSwipe', true),
      pagination: getCarouselBooleanOption(carousel, 'pagination', true),
      autoplay: getCarouselBooleanOption(carousel, 'autoplay', false),
      autoplaySpeed: getCarouselNumberOption(carousel, 'autoplaySpeed', 3000)
    };
  }

  function normalizeCarouselInstances(instances) {
    if (!instances) return [];
    return Array.isArray(instances) ? instances : [instances];
  }

  function initGalleryMouseDrag(carousel) {
    if (
      !carousel ||
      carousel.dataset.mouseDragInitialized === 'true' ||
      !carousel.closest('.gallery-tab-panels') ||
      carousel.classList.contains('project-showcase-carousel')
    ) {
      return;
    }

    var slider = carousel.querySelector('.slider');
    if (!slider || typeof window.PointerEvent === 'undefined') return;

    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var deltaX = 0;
    var deltaY = 0;
    var isDragging = false;
    var suppressClick = false;

    function getPrimaryInstance() {
      return normalizeCarouselInstances(carousel._bulmaCarouselInstances)[0] || null;
    }

    function stopTracking() {
      if (pointerId !== null && typeof slider.releasePointerCapture === 'function') {
        try {
          slider.releasePointerCapture(pointerId);
        } catch (error) {
          // Ignore release errors when pointer capture is already cleared.
        }
      }

      pointerId = null;
      deltaX = 0;
      deltaY = 0;
      isDragging = false;
      slider.classList.remove('is-dragging');
    }

    function onPointerDown(event) {
      if (!event.isPrimary || event.pointerType === 'touch' || event.button !== 0) {
        return;
      }

      if (event.target.closest('a, video, button, input, textarea, select, .slider-page, .slider-navigation-previous, .slider-navigation-next')) {
        return;
      }

      suppressClick = false;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      deltaX = 0;
      deltaY = 0;
      isDragging = false;
      slider.classList.add('is-dragging');

      if (typeof slider.setPointerCapture === 'function') {
        try {
          slider.setPointerCapture(pointerId);
        } catch (error) {
          // Pointer capture is best-effort here.
        }
      }
    }

    function onPointerMove(event) {
      if (pointerId === null || event.pointerId !== pointerId) return;

      deltaX = event.clientX - startX;
      deltaY = event.clientY - startY;

      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isDragging = true;
        event.preventDefault();
      }
    }

    function onPointerEnd(event) {
      if (pointerId === null || event.pointerId !== pointerId) return;

      var absX = Math.abs(deltaX);
      var absY = Math.abs(deltaY);
      var threshold = Math.max(48, slider.clientWidth * 0.08);

      if (isDragging && absX > absY && absX >= threshold) {
        var instance = getPrimaryInstance();
        if (instance) {
          suppressClick = true;
          if (deltaX < 0 && typeof instance.next === 'function') {
            instance.next();
          } else if (deltaX > 0 && typeof instance.previous === 'function') {
            instance.previous();
          }
        }
      }

      stopTracking();
    }

    slider.addEventListener('pointerdown', onPointerDown);
    slider.addEventListener('pointermove', onPointerMove, { passive: false });
    slider.addEventListener('pointerup', onPointerEnd);
    slider.addEventListener('pointercancel', onPointerEnd);
    slider.addEventListener('lostpointercapture', stopTracking);
    slider.addEventListener('dragstart', function (event) {
      event.preventDefault();
    });
    slider.addEventListener('click', function (event) {
      if (!suppressClick) return;

      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    carousel.dataset.mouseDragInitialized = 'true';
  }

  function ensureBulmaCarousels(root) {
    if (typeof window.bulmaCarousel === 'undefined' || !root) {
      return;
    }

    root.querySelectorAll('.carousel').forEach(function (carousel) {
      if (carousel.dataset.carouselInitialized === 'true') {
        initGalleryMouseDrag(carousel);
        return;
      }

      if (!isElementVisible(carousel)) {
        return;
      }

      try {
        carousel._bulmaCarouselInstances = normalizeCarouselInstances(
          window.bulmaCarousel.attach(carousel, getCarouselOptions(carousel))
        );
        carousel.dataset.carouselInitialized = 'true';
        dedupeCarouselUi(carousel);
        initGalleryMouseDrag(carousel);
      } catch (error) {
        console.warn('Carousel init failed:', error);
      }
    });
  }

  function dedupeCarouselUi(carousel) {
    if (!carousel) return;

    normalizeCarouselInstances(carousel._bulmaCarouselInstances).forEach(function (instance) {
      var wrapper = instance && instance.wrapper;
      if (!wrapper) return;

      ['slider-pagination', 'slider-navigation-previous', 'slider-navigation-next'].forEach(function (className) {
        var nodes = Array.from(wrapper.querySelectorAll('.' + className)).filter(function (node) {
          return node.parentNode === wrapper;
        });

        nodes.slice(1).forEach(function (node) {
          node.remove();
        });
      });
    });
  }

  function refreshBulmaCarousels(root) {
    if (!root) return;

    root.querySelectorAll('.carousel[data-carousel-initialized="true"]').forEach(function (carousel) {
      normalizeCarouselInstances(carousel._bulmaCarouselInstances).forEach(function (instance) {
        if (!instance) return;

        try {
          if (instance._breakpoint && typeof instance._breakpoint.apply === 'function') {
            instance._breakpoint.apply();
          } else if (typeof instance.refresh === 'function') {
            instance.refresh();
          }

          dedupeCarouselUi(carousel);
        } catch (error) {
          console.warn('Carousel refresh failed:', error);
        }
      });
    });
  }

  function initBulmaCarousel() {
    if (typeof window.bulmaCarousel === 'undefined' || !document.querySelector('.carousel')) {
      return;
    }

    ensureBulmaCarousels(document);
  }

  function initGalleryTabs() {
    var tabList = document.querySelector('[data-gallery-tabs]');
    if (!tabList) return;

    var buttons = Array.from(tabList.querySelectorAll('[data-gallery-tab]'));
    var panels = Array.from(document.querySelectorAll('[data-gallery-panel]'));
    var indicator = tabList.querySelector('.gallery-tab-indicator');
    var panelsWrap = document.querySelector('.gallery-tab-panels');
    if (!buttons.length || !panels.length) return;

    var hashToTab = {
      '#gallery': 'lens',
      '#blender-gallery': 'blender',
      '#threejs-arts': 'threejs'
    };
    var tabToHash = {
      lens: 'gallery',
      blender: 'blender-gallery',
      threejs: 'threejs-arts'
    };
    var currentTab = '';
    var tabOrder = buttons.map(function (button) {
      return button.getAttribute('data-gallery-tab');
    });
    var threeJsCarousel = getElement('threejs-carousel');
    var lastReferenceGalleryHeight = 0;

    function getButton(name) {
      return tabList.querySelector('[data-gallery-tab="' + name + '"]');
    }

    function getPanel(name) {
      return document.querySelector('[data-gallery-panel="' + name + '"]');
    }

    function getTabIndex(name) {
      return tabOrder.indexOf(name);
    }

    function getReferenceGalleryInstance() {
      var referenceCarousels = [getElement('photograph-carousel'), getElement('results-carousel')];

      for (var index = 0; index < referenceCarousels.length; index += 1) {
        var carousel = referenceCarousels[index];
        if (!carousel || carousel.dataset.carouselInitialized !== 'true') continue;

        var instance = normalizeCarouselInstances(carousel._bulmaCarouselInstances)[0] || null;
        if (instance) return instance;
      }

      return null;
    }

    function measureGalleryWindowHeight(panel) {
      if (!panel) return 0;

      var slider = panel.querySelector('.slider');
      if (slider && slider.offsetHeight) {
        return slider.offsetHeight;
      }

      var carousel = panel.querySelector('.carousel');
      if (!carousel) return 0;

      var rect = carousel.getBoundingClientRect();
      return rect.height || 0;
    }

    function estimateReferenceGalleryHeight() {
      if (!threeJsCarousel) return 0;

      var slider = threeJsCarousel.querySelector('.slider');
      var width = slider && slider.clientWidth ? slider.clientWidth : threeJsCarousel.clientWidth;
      if (!width) return 0;

      var instance = getReferenceGalleryInstance();
      var slidesToShow = instance && typeof instance.slidesToShow === 'number' ? instance.slidesToShow : 2;
      if (!slidesToShow) return 0;

      return Math.round((width / slidesToShow) * (9 / 16));
    }

    function applyProjectShowcaseHeight(height) {
      if (!threeJsCarousel) return;

      if (height > 0) {
        var roundedHeight = Math.round(height);
        threeJsCarousel.style.setProperty('--project-showcase-window-height', roundedHeight + 'px');
        lastReferenceGalleryHeight = roundedHeight;
        return;
      }

      threeJsCarousel.style.removeProperty('--project-showcase-window-height');
    }

    function syncProjectShowcaseHeight(referencePanel) {
      if (!threeJsCarousel) return;

      var height = measureGalleryWindowHeight(referencePanel);
      if (!height) {
        height = estimateReferenceGalleryHeight();
      }
      if (!height) {
        height = lastReferenceGalleryHeight;
      }

      applyProjectShowcaseHeight(height);
    }

    function prefersReducedMotion() {
      return Boolean(
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }

    function scrollActiveTabIntoView(button, immediate) {
      if (!button || typeof button.scrollIntoView !== 'function') return;

      try {
        button.scrollIntoView({
          behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      } catch (error) {
        button.scrollIntoView();
      }
    }

    function updateIndicator(button, immediate) {
      if (!indicator || !button) return;

      indicator.classList.toggle('is-instant', Boolean(immediate) || prefersReducedMotion());
      indicator.style.width = button.offsetWidth + 'px';
      indicator.style.height = button.offsetHeight + 'px';
      indicator.style.transform = 'translate(' + button.offsetLeft + 'px, ' + button.offsetTop + 'px)';
      indicator.style.opacity = '1';
    }

    function updateHash(anchorId) {
      if (!anchorId || window.location.hash === '#' + anchorId) return;

      try {
        window.history.replaceState(null, '', '#' + anchorId);
      } catch (error) {
        console.warn('Unable to update gallery hash:', error);
      }
    }

    function setPanelsHeight(height, immediate) {
      if (!panelsWrap || typeof height !== 'number' || Number.isNaN(height)) return;

      panelsWrap.classList.toggle('is-instant', Boolean(immediate) || prefersReducedMotion());
      panelsWrap.style.height = Math.max(0, height) + 'px';
    }

    function syncPanelsHeight(immediate) {
      if (!panelsWrap) return;

      var activePanel = currentTab ? getPanel(currentTab) : panels.find(function (panel) {
        return !panel.hidden;
      });
      if (!activePanel) return;

      setPanelsHeight(activePanel.offsetHeight, immediate);
    }

    function clearPanelAnimation(panel) {
      if (!panel) return;
      panel.classList.remove('is-animating', 'is-from-right', 'is-from-left');
    }

    function animatePanel(panel, direction, immediate) {
      if (!panel) return;

      clearPanelAnimation(panel);

      if (!direction || immediate || prefersReducedMotion()) {
        return;
      }

      // Force a reflow so repeated activations replay the animation reliably.
      panel.offsetWidth;
      panel.classList.add('is-animating', direction === 'right' ? 'is-from-right' : 'is-from-left');
      panel.addEventListener('animationend', function handleAnimationEnd() {
        clearPanelAnimation(panel);
      }, { once: true });
    }

    function activateTab(name, options) {
      var config = options || {};
      var activeButton = getButton(name);
      var activePanel = getPanel(name);
      if (!activeButton || !activePanel) return;
      var previousPanel = currentTab ? getPanel(currentTab) : null;
      var previousHeight = previousPanel && !previousPanel.hidden ? previousPanel.offsetHeight : activePanel.offsetHeight;

      if (name === 'threejs') {
        syncProjectShowcaseHeight(previousPanel && previousPanel !== activePanel ? previousPanel : null);
      }

      if (currentTab === name) {
        updateIndicator(activeButton, config.instantIndicator || config.instantScroll);
        scrollActiveTabIntoView(activeButton, config.instantScroll);
        syncPanelsHeight(config.instantPanel || config.instantScroll);

        if (config.focusTab) {
          activeButton.focus();
        }

        if (config.updateHash) {
          updateHash(tabToHash[name]);
        }

        return;
      }

      var previousIndex = getTabIndex(currentTab);
      var nextIndex = getTabIndex(name);
      var direction = '';
      if (previousIndex !== -1 && nextIndex !== -1 && previousIndex !== nextIndex) {
        direction = nextIndex > previousIndex ? 'right' : 'left';
      }

      currentTab = name;

      buttons.forEach(function (button) {
        var isActive = button === activeButton;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
        button.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      panels.forEach(function (panel) {
        var isActive = panel === activePanel;
        clearPanelAnimation(panel);
        panel.hidden = !isActive;
        panel.setAttribute('aria-hidden', String(!isActive));
      });

      setPanelsHeight(previousHeight, true);
      animatePanel(activePanel, direction, config.instantPanel || config.instantScroll);
      updateIndicator(activeButton, config.instantIndicator || config.instantScroll);
      if (config.scrollTabIntoView) {
        scrollActiveTabIntoView(activeButton, config.instantScroll);
      }
      window.requestAnimationFrame(function () {
        syncPanelsHeight(config.instantPanel || config.instantScroll);
      });

      ensureBulmaCarousels(activePanel);
      window.requestAnimationFrame(function () {
        refreshBulmaCarousels(activePanel);
        if (name === 'threejs') {
          syncProjectShowcaseHeight(previousPanel && previousPanel !== activePanel ? previousPanel : null);
        } else {
          syncProjectShowcaseHeight(activePanel);
        }
        window.requestAnimationFrame(function () {
          syncPanelsHeight(config.instantPanel || config.instantScroll);
        });
      });

      if (config.focusTab) {
        activeButton.focus();
      }

      if (config.updateHash) {
        updateHash(tabToHash[name]);
      }
    }

    function syncFromHash(options) {
      activateTab(hashToTab[window.location.hash] || 'lens', options);
    }

    buttons.forEach(function (button, index) {
      button.addEventListener('click', function () {
        activateTab(button.getAttribute('data-gallery-tab'), {
          scrollTabIntoView: true,
          updateHash: true
        });
      });

      button.addEventListener('keydown', function (event) {
        var nextIndex = null;

        if (event.key === 'ArrowRight') {
          nextIndex = (index + 1) % buttons.length;
        } else if (event.key === 'ArrowLeft') {
          nextIndex = (index - 1 + buttons.length) % buttons.length;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = buttons.length - 1;
        }

        if (nextIndex === null) return;

        event.preventDefault();
        activateTab(buttons[nextIndex].getAttribute('data-gallery-tab'), {
          focusTab: true,
          scrollTabIntoView: true,
          updateHash: true
        });
      });
    });

    syncFromHash({ instantScroll: true, instantIndicator: true, instantPanel: true });

    function refreshActiveIndicator() {
      var activeButton = currentTab ? getButton(currentTab) : buttons[0];
      if (!activeButton) return;
      updateIndicator(activeButton, true);
    }

    window.addEventListener('resize', function () {
      window.requestAnimationFrame(function () {
        refreshActiveIndicator();
        if (currentTab === 'threejs') {
          syncProjectShowcaseHeight();
          refreshBulmaCarousels(getPanel('threejs'));
        } else {
          syncProjectShowcaseHeight(getPanel(currentTab));
        }
        syncPanelsHeight(true);
      });
    });

    if (document.fonts && typeof document.fonts.ready === 'object') {
      document.fonts.ready.then(function () {
        window.requestAnimationFrame(function () {
          refreshActiveIndicator();
          if (currentTab === 'threejs') {
            syncProjectShowcaseHeight();
          } else {
            syncProjectShowcaseHeight(getPanel(currentTab));
          }
          syncPanelsHeight(true);
        });
      });
    }

    window.addEventListener('hashchange', syncFromHash);
  }

  function initAvatarCarousel() {
    var wrap = getElement('avatarCarousel');
    if (!wrap) return;

    var slidesEl = wrap.querySelector('.avatar-slides');
    var dotsEl = wrap.querySelector('.avatar-dots');
    if (!slidesEl || !dotsEl) return;

    var imageSources = ['assets/images/wenboji_rider.jpg'];
    for (var i = 0; i <= 6; i += 1) {
      imageSources.push('assets/misc/avatar_' + i + '.png');
    }

    var slideFragment = document.createDocumentFragment();
    var dotFragment = document.createDocumentFragment();
    var slides = [];
    var dots = [];
    var current = 0;
    var intervalMs = 3500;
    var timerId = null;

    function goTo(index) {
      if (!slides.length) return;

      var nextIndex = (index + slides.length) % slides.length;
      if (nextIndex === current) return;

      slides[current].classList.remove('active');
      dots[current].classList.remove('active');

      current = nextIndex;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    function next() {
      goTo(current + 1);
    }

    function stopTimer() {
      if (timerId === null) return;
      window.clearInterval(timerId);
      timerId = null;
    }

    function startTimer() {
      stopTimer();
      if (slides.length < 2) return;
      timerId = window.setInterval(next, intervalMs);
    }

    imageSources.forEach(function (src, index) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = index === 0 ? 'Wenbo Ji portrait' : 'Avatar illustration ' + index;
      img.decoding = 'async';
      img.loading = index === 0 ? 'eager' : 'lazy';
      if (index === 0) img.classList.add('active');
      slideFragment.appendChild(img);
      slides.push(img);

      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'avatar-dot' + (index === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Show avatar ' + (index + 1));
      dot.addEventListener('click', function () {
        goTo(index);
        startTimer();
      });
      dotFragment.appendChild(dot);
      dots.push(dot);
    });

    slidesEl.appendChild(slideFragment);
    dotsEl.appendChild(dotFragment);

    startTimer();
    wrap.addEventListener('mouseenter', stopTimer);
    wrap.addEventListener('mouseleave', startTimer);
  }

  function initSmoothScroll() {
    function getOffset() {
      var nav = document.querySelector('.navbar');
      return (nav ? nav.offsetHeight : 0) + 8;
    }

    function scrollToHash(hash, replaceState) {
      if (!hash || hash === '#') return;

      var target = document.querySelector(hash);
      if (!target) return;

      var top = target.getBoundingClientRect().top + window.pageYOffset - getOffset();
      window.scrollTo({ top: top, behavior: 'smooth' });

      if (replaceState) {
        try {
          window.history.replaceState(null, '', hash);
        } catch (error) {
          console.warn('Unable to update history state:', error);
        }
      }
    }

    document.querySelectorAll('.navbar a[href^="#"]').forEach(function (link) {
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

  function initTimeline() {
    var ranges = Array.from(document.querySelectorAll('.timeline-range'));
    if (!ranges.length) return;

    var timelineStart = new Date('2021-01-01');
    var timelineEnd = new Date();
    var total = timelineEnd - timelineStart;
    if (total <= 0) return;

    function parseDateString(value) {
      if (!value) return null;
      if (value.toLowerCase() === 'now') return timelineEnd;
      return new Date(value);
    }

    function mapPctLinearToNonLinear(pct) {
      var clamped = Math.max(0, Math.min(1, pct / 100));
      return Math.pow(clamped, 1.6) * 100;
    }

    ranges.forEach(function (element) {
      var startValue = element.getAttribute('data-start');
      var endValue = element.getAttribute('data-end');
      if (!startValue) return;

      var startDate = parseDateString(startValue);
      var endDate = parseDateString(endValue) || timelineEnd;
      if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) return;
      if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) endDate = timelineEnd;
      if (endDate < startDate) endDate = startDate;

      var left = mapPctLinearToNonLinear(((startDate - timelineStart) / total) * 100);
      var right = mapPctLinearToNonLinear(((endDate - timelineStart) / total) * 100);
      var width = Math.max(0.5, right - left);

      if (typeof endValue === 'string' && endValue.toLowerCase() === 'now') {
        width = Math.max(12, width);
        element.style.zIndex = 2;
      }

      if (left + width > 100) {
        left = Math.max(0, 100 - width);
      }

      element.style.left = Math.max(0, left) + '%';
      element.style.width = width + '%';
    });

    var axis = document.querySelector('.timeline-axis');
    if (axis) {
      var labels = axis.querySelectorAll('span');
      if (labels.length === 2) {
        labels[0].style.left = '0%';
        labels[0].style.transform = 'translateX(0)';
        labels[1].style.left = 'auto';
        labels[1].style.right = '0';
        labels[1].style.transform = 'translateX(0)';
      } else if (labels.length >= 3) {
        var midDate = new Date('2024-01-01');
        var midPct = mapPctLinearToNonLinear(((midDate - timelineStart) / total) * 100);
        labels[0].style.left = '0%';
        labels[0].style.transform = 'translateX(0)';
        labels[1].style.left = Math.max(0, Math.min(100, midPct)) + '%';
        labels[1].style.transform = 'translateX(-50%)';
        labels[2].style.left = '100%';
        labels[2].style.transform = 'translateX(-100%)';
      }
    }

    var tooltip = document.createElement('div');
    tooltip.className = 'timeline-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '9999';
    tooltip.style.padding = '8px 10px';
    tooltip.style.background = 'rgba(0, 0, 0, 0.85)';
    tooltip.style.color = '#fff';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '12px';
    tooltip.style.maxWidth = '320px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.boxSizing = 'border-box';
    document.body.appendChild(tooltip);

    function positionTooltip(event) {
      var pad = 12;
      var x = event.clientX + pad;
      var y = event.clientY + pad;
      var rect = tooltip.getBoundingClientRect();
      var viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      var viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

      if (x + rect.width + 8 > viewportWidth) {
        x = Math.max(pad, event.clientX - rect.width - pad);
      }

      if (y + rect.height + 8 > viewportHeight) {
        y = Math.max(pad, event.clientY - rect.height - pad);
      }

      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    }

    function showTooltip(text, event) {
      if (!text) return;
      tooltip.textContent = text;
      tooltip.style.display = 'block';
      positionTooltip(event);
    }

    ranges.forEach(function (element) {
      element.addEventListener('mouseenter', function (event) {
        var text = element.getAttribute('data-desc') || element.getAttribute('title') || '';
        showTooltip(text, event);
      });
      element.addEventListener('mousemove', function (event) {
        if (tooltip.style.display !== 'none') positionTooltip(event);
      });
      element.addEventListener('mouseleave', function () {
        tooltip.style.display = 'none';
      });
    });
  }

  function formatDate(dateString) {
    var date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString || '';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  async function loadBlogCards() {
    var list = getElement('blog-list');
    if (!list) return;

    list.setAttribute('aria-busy', 'true');

    try {
      var response = await window.fetch('https://fusheng-ji.github.io/blog/posts.json', {
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts.json: ' + response.status);
      }

      var posts = await response.json();
      var latestPosts = Array.isArray(posts) ? posts.slice(0, 2) : [];

      if (!latestPosts.length) {
        list.innerHTML = '<div class="blog-empty">No blog posts yet.</div>';
        return;
      }

      var blogBase = 'https://fusheng-ji.github.io/blog';
      list.innerHTML = latestPosts.map(function (post) {
        var path = typeof post.url === 'string' && post.url.startsWith('/') ? post.url : '/' + (post.url || '');
        var fullUrl = blogBase + path;
        var title = escapeHtml(post.title || 'Untitled');
        var description = escapeHtml(post.description || '');
        var date = formatDate(post.date);
        var reading = post.readingTime ? escapeHtml(String(post.readingTime)) + ' min read' : '';
        var metaBits = [];

        if (date) {
          metaBits.push('<span class="blog-card-date">' + date + '</span>');
        }

        if (reading) {
          metaBits.push('<span class="blog-card-reading">' + reading + '</span>');
        }

        return [
          '<article class="blog-card">',
          '  <a class="blog-card-link" href="' + fullUrl + '">',
          '    <div class="blog-card-top">',
          '      <div class="blog-card-top-meta">' + metaBits.join('') + '</div>',
          '      <span class="blog-card-arrow" aria-hidden="true">&#8599;</span>',
          '    </div>',
          '    <span class="blog-card-title">' + title + '</span>',
          description ? '    <p class="blog-card-desc">' + description + '</p>' : '',
          '    <div class="blog-card-bottom">',
          '      <span class="blog-card-cta">Read article</span>',
          '      <span class="blog-card-accent">On the blog</span>',
          '    </div>',
          '  </a>',
          '</article>'
        ].join('\n');
      }).join('\n');
    } catch (error) {
      console.error(error);
      list.innerHTML = '<div class="blog-error">Unable to load blog posts.</div>';
    } finally {
      list.setAttribute('aria-busy', 'false');
    }
  }

  initInitialScrollPosition();

  onReady(function () {
    initGalleryTabs();
    initBulmaCarousel();
    initAvatarCarousel();
    initToggleLinks();
    initSmoothScroll();
    initTimeline();
    loadBlogCards();
  });
})();
