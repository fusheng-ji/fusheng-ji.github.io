(function (window, document) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  function findFirst(items, predicate) {
    for (var index = 0; index < items.length; index += 1) {
      if (predicate(items[index])) return items[index];
    }
    return null;
  }

  function initGalleryTabs() {
    var tabList = document.querySelector('[data-gallery-tabs]');
    if (!tabList || !Site.Carousels) return;

    var buttons = Site.toArray(tabList.querySelectorAll('[data-gallery-tab]'));
    var panels = Site.toArray(document.querySelectorAll('[data-gallery-panel]'));
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
    var threeJsCarousel = Site.getElement('threejs-carousel');
    var lastReferenceGalleryHeight = 0;
    var mobileGalleryQuery = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;

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
      var referenceCarousels = [Site.getElement('photograph-carousel'), Site.getElement('results-carousel')];

      for (var index = 0; index < referenceCarousels.length; index += 1) {
        var carousel = referenceCarousels[index];
        if (!carousel || Site.getData(carousel, 'carouselInitialized') !== 'true') continue;

        var instance = Site.Carousels.normalize(carousel._bulmaCarouselInstances)[0] || null;
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

      if (mobileGalleryQuery && mobileGalleryQuery.matches) {
        applyProjectShowcaseHeight(0);
        return;
      }

      var height = measureGalleryWindowHeight(referencePanel);
      if (!height) {
        height = estimateReferenceGalleryHeight();
      }
      if (!height) {
        height = lastReferenceGalleryHeight;
      }

      applyProjectShowcaseHeight(height);
    }

    function updateIndicator(button, immediate) {
      if (!indicator || !button) return;

      Site.toggleClass(indicator, 'is-instant', Boolean(immediate) || Site.prefersReducedMotion());
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
      if (!panelsWrap || typeof height !== 'number' || isNaN(height)) return;

      Site.toggleClass(panelsWrap, 'is-instant', Boolean(immediate) || Site.prefersReducedMotion());
      panelsWrap.style.height = Math.max(0, height) + 'px';
    }

    function syncPanelsHeight(immediate) {
      if (!panelsWrap) return;

      var activePanel = currentTab ? getPanel(currentTab) : findFirst(panels, function (panel) {
        return !panel.hidden;
      });
      if (!activePanel) return;

      setPanelsHeight(activePanel.offsetHeight, immediate);
    }

    function clearPanelAnimation(panel) {
      if (!panel) return;
      Site.removeClass(panel, 'is-animating');
      Site.removeClass(panel, 'is-from-right');
      Site.removeClass(panel, 'is-from-left');
    }

    function animatePanel(panel, direction, immediate) {
      if (!panel) return;

      clearPanelAnimation(panel);

      if (!direction || immediate || Site.prefersReducedMotion()) {
        return;
      }

      // Force a reflow so repeated activations replay the animation reliably.
      panel.offsetWidth;
      Site.addClass(panel, 'is-animating');
      Site.addClass(panel, direction === 'right' ? 'is-from-right' : 'is-from-left');
      panel.addEventListener('animationend', function handleAnimationEnd() {
        clearPanelAnimation(panel);
        panel.removeEventListener('animationend', handleAnimationEnd);
      });
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
        Site.scrollElementIntoView(activeButton, config.instantScroll);
        syncPanelsHeight(config.instantPanel || config.instantScroll);

        if (config.focusTab) activeButton.focus();
        if (config.updateHash) updateHash(tabToHash[name]);
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
        Site.toggleClass(button, 'is-active', isActive);
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
        Site.scrollElementIntoView(activeButton, config.instantScroll);
      }
      Site.requestFrame(function () {
        syncPanelsHeight(config.instantPanel || config.instantScroll);
      });

      Site.Carousels.ensure(activePanel);
      Site.requestFrame(function () {
        Site.Carousels.refresh(activePanel);
        if (name === 'threejs') {
          syncProjectShowcaseHeight(previousPanel && previousPanel !== activePanel ? previousPanel : null);
        } else {
          syncProjectShowcaseHeight(activePanel);
        }
        Site.requestFrame(function () {
          syncPanelsHeight(config.instantPanel || config.instantScroll);
        });
      });

      if (config.focusTab) activeButton.focus();
      if (config.updateHash) updateHash(tabToHash[name]);
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

        if (event.key === 'ArrowRight') nextIndex = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = buttons.length - 1;

        if (nextIndex === null) return;

        event.preventDefault();
        activateTab(buttons[nextIndex].getAttribute('data-gallery-tab'), {
          focusTab: true,
          scrollTabIntoView: true,
          updateHash: true
        });
      });
    });

    syncFromHash({
      instantScroll: true,
      instantIndicator: true,
      instantPanel: true,
      scrollTabIntoView: Boolean(hashToTab[window.location.hash])
    });

    function refreshActiveIndicator() {
      var activeButton = currentTab ? getButton(currentTab) : buttons[0];
      if (!activeButton) return;
      updateIndicator(activeButton, true);
    }

    window.addEventListener('resize', function () {
      Site.requestFrame(function () {
        refreshActiveIndicator();
        if (currentTab === 'threejs') {
          syncProjectShowcaseHeight();
          Site.Carousels.refresh(getPanel('threejs'));
        } else {
          syncProjectShowcaseHeight(getPanel(currentTab));
        }
        syncPanelsHeight(true);
      });
    });

    if (document.fonts && typeof document.fonts.ready === 'object') {
      document.fonts.ready.then(function () {
        Site.requestFrame(function () {
          refreshActiveIndicator();
          if (currentTab === 'threejs') syncProjectShowcaseHeight();
          else syncProjectShowcaseHeight(getPanel(currentTab));
          syncPanelsHeight(true);
        });
      });
    }

    window.addEventListener('hashchange', function () {
      syncFromHash({ scrollTabIntoView: true });
    });
  }

  Site.initGalleryTabs = initGalleryTabs;
}(window, document));
