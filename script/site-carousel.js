(function (window, document) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  function isElementVisible(element) {
    return Boolean(element && element.offsetParent !== null);
  }

  function getCarouselNumberOption(carousel, optionName, fallbackValue) {
    if (!carousel) return fallbackValue;

    var rawValue = Site.getData(carousel, optionName);
    if (!rawValue) return fallbackValue;

    var parsedValue = parseInt(rawValue, 10);
    return isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
  }

  function getCarouselBooleanOption(carousel, optionName, fallbackValue) {
    if (!carousel) return fallbackValue;

    var rawValue = Site.getData(carousel, optionName);
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

  function getCarouselEagerImageCount(carousel) {
    if (!carousel || !Site.closest(carousel, '.gallery-tab-panels')) {
      return Infinity;
    }

    return 2;
  }

  function loadCarouselSlideImage(item) {
    if (!item) return;

    var img = item.querySelector('img');
    if (!img) return;

    var src = img.getAttribute('data-carousel-src');
    if (!src || img.getAttribute('data-carousel-loaded') === 'true') return;

    img.src = src;
    img.setAttribute('data-carousel-loaded', 'true');
  }

  function getCarouselLogicalIndex(instance) {
    if (!instance || !instance.state || typeof instance.state.index !== 'number') {
      return 0;
    }

    var length = instance.state.length || 0;
    if (!length) return 0;

    return ((instance.state.index % length) + length) % length;
  }

  function loadVisibleCarouselImages(carousel) {
    var visibleSlides = Site.toArray(
      carousel.querySelectorAll('.slider .is-current, .slider .is-slide-next, .slider .is-slide-previous')
    );

    if (visibleSlides.length) {
      visibleSlides.forEach(function (slide) {
        loadCarouselSlideImage(slide.querySelector('.item'));
      });
      return;
    }

    Site.toArray(carousel.querySelectorAll(':scope > .item')).forEach(function (item, index) {
      if (index < 2) loadCarouselSlideImage(item);
    });
  }

  function loadCarouselImageWindow(carousel, instance) {
    if (!carousel) return;

    loadVisibleCarouselImages(carousel);

    if (!instance || !instance.state) return;

    var items = Site.toArray(carousel.querySelectorAll(':scope > .item'));
    if (!items.length) {
      items = Site.toArray(carousel.querySelectorAll('.item'));
    }
    if (!items.length) return;

    var index = getCarouselLogicalIndex(instance);
    var slidesToShow = getCarouselNumberOption(carousel, 'slidesToShow', 2);
    var preloadBehind = 1;
    var preloadAhead = 1;
    var start = Math.max(0, index - preloadBehind);
    var end = Math.min(items.length - 1, index + slidesToShow - 1 + preloadAhead);

    for (var i = start; i <= end; i += 1) {
      loadCarouselSlideImage(items[i]);
    }
  }

  function prepareCarouselLazyImages(carousel) {
    if (!carousel) return;

    var eagerCount = getCarouselEagerImageCount(carousel);
    if (!isFinite(eagerCount)) return;

    if (Site.getData(carousel, 'lazyImagesPrepared') === 'true') {
      Site.toArray(carousel.querySelectorAll(':scope > .item')).forEach(function (item, index) {
        if (index >= eagerCount) return;
        loadCarouselSlideImage(item);
      });
      return;
    }

    Site.toArray(carousel.querySelectorAll(':scope > .item')).forEach(function (item, index) {
      var img = item.querySelector('img');
      if (!img) return;

      if (index < eagerCount) {
        loadCarouselSlideImage(item);
        return;
      }

      var src = img.getAttribute('src');
      if (!src) return;

      img.removeAttribute('src');
      img.setAttribute('data-carousel-src', src);
    });

    Site.setData(carousel, 'lazyImagesPrepared', 'true');
  }

  function bindCarouselLazyEvents(carousel, instance) {
    if (!carousel || !instance || typeof instance.on !== 'function') return;

    instance.on('after:show', function () {
      loadCarouselImageWindow(carousel, instance);
    });
  }

  function wrapCarouselLazyLoading(carousel, instance) {
    if (!carousel || !instance || Site.getData(carousel, 'lazyImagesHooked') === 'true') {
      return;
    }

    if (!isFinite(getCarouselEagerImageCount(carousel))) {
      return;
    }

    prepareCarouselLazyImages(carousel);
    loadCarouselImageWindow(carousel, instance);
    bindCarouselLazyEvents(carousel, instance);

    Site.requestFrame(function () {
      loadCarouselImageWindow(carousel, instance);
    });

    ['next', 'previous', 'goTo'].forEach(function (methodName) {
      if (typeof instance[methodName] !== 'function') return;

      var original = instance[methodName];
      instance[methodName] = function () {
        var result = original.apply(this, arguments);
        loadCarouselImageWindow(carousel, instance);
        return result;
      };
    });

    var wrapper = instance.wrapper;
    if (wrapper) {
      wrapper.addEventListener('click', function () {
        window.requestAnimationFrame(function () {
          loadCarouselImageWindow(carousel, instance);
        });
      });
    }

    Site.setData(carousel, 'lazyImagesHooked', 'true');
  }

  function initGalleryMouseDrag(carousel) {
    if (
      !carousel ||
      Site.getData(carousel, 'mouseDragInitialized') === 'true' ||
      !Site.closest(carousel, '.gallery-tab-panels') ||
      Site.hasClass(carousel, 'project-showcase-carousel')
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
      Site.removeClass(slider, 'is-dragging');
    }

    function onPointerDown(event) {
      if (!event.isPrimary || event.pointerType === 'touch' || event.button !== 0) {
        return;
      }

      if (Site.closest(event.target, 'a, video, button, input, textarea, select, .slider-page, .slider-navigation-previous, .slider-navigation-next')) {
        return;
      }

      suppressClick = false;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      deltaX = 0;
      deltaY = 0;
      isDragging = false;
      Site.addClass(slider, 'is-dragging');

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

    Site.setData(carousel, 'mouseDragInitialized', 'true');
  }

  function dedupeCarouselUi(carousel) {
    if (!carousel) return;

    normalizeCarouselInstances(carousel._bulmaCarouselInstances).forEach(function (instance) {
      var wrapper = instance && instance.wrapper;
      if (!wrapper) return;

      ['slider-pagination', 'slider-navigation-previous', 'slider-navigation-next'].forEach(function (className) {
        var nodes = Site.toArray(wrapper.querySelectorAll('.' + className)).filter(function (node) {
          return node.parentNode === wrapper;
        });

        nodes.slice(1).forEach(function (node) {
          Site.removeNode(node);
        });
      });
    });
  }

  function ensureBulmaCarousels(root) {
    if (typeof window.bulmaCarousel === 'undefined' || !root) {
      return;
    }

    Site.toArray(root.querySelectorAll('.carousel')).forEach(function (carousel) {
      if (Site.getData(carousel, 'carouselInitialized') === 'true') {
        normalizeCarouselInstances(carousel._bulmaCarouselInstances).forEach(function (instance) {
          wrapCarouselLazyLoading(carousel, instance);
          loadCarouselImageWindow(carousel, instance);
        });
        initGalleryMouseDrag(carousel);
        return;
      }

      if (!isElementVisible(carousel)) {
        return;
      }

      try {
        prepareCarouselLazyImages(carousel);
        carousel._bulmaCarouselInstances = normalizeCarouselInstances(
          window.bulmaCarousel.attach(carousel, getCarouselOptions(carousel))
        );
        Site.setData(carousel, 'carouselInitialized', 'true');
        normalizeCarouselInstances(carousel._bulmaCarouselInstances).forEach(function (instance) {
          wrapCarouselLazyLoading(carousel, instance);
        });
        dedupeCarouselUi(carousel);
        initGalleryMouseDrag(carousel);
      } catch (error) {
        console.warn('Carousel init failed:', error);
      }
    });
  }

  function refreshBulmaCarousels(root) {
    if (!root) return;

    Site.toArray(root.querySelectorAll('.carousel[data-carousel-initialized="true"]')).forEach(function (carousel) {
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

  Site.Carousels = {
    ensure: ensureBulmaCarousels,
    refresh: refreshBulmaCarousels,
    normalize: normalizeCarouselInstances,
    init: initBulmaCarousel
  };
}(window, document));
