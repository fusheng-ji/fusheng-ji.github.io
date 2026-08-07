import { addClass, closest, removeClass, requestFrame, scrollElementIntoView, toArray, toggleClass } from "./core.js";

  var DESKTOP_GALLERY_QUERY = '(min-width: 901px)';
  var REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
  var VIDEO_PREVIEW_QUERY = '(hover: hover) and (pointer: fine)';
  var INTERACTIVE_SELECTOR = 'a, button, video[controls], input, textarea, select';

  function mediaMatches(query) {
    return Boolean(window.matchMedia && window.matchMedia(query).matches);
  }

  function shouldAutoPreviewVideo() {
    var connection = window.navigator && (
      window.navigator.connection ||
      window.navigator.mozConnection ||
      window.navigator.webkitConnection
    );

    return mediaMatches(DESKTOP_GALLERY_QUERY) &&
      mediaMatches(VIDEO_PREVIEW_QUERY) &&
      !mediaMatches(REDUCED_MOTION_QUERY) &&
      !(connection && connection.saveData);
  }

  function normalizeIndex(index, length) {
    if (!length) return 0;
    return ((index % length) + length) % length;
  }

  function padNumber(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function getClosest(element, selector) {
    if (!element || element === document) return null;
    if (typeof element.closest === 'function') return element.closest(selector);
    return closest(element, selector);
  }

  function isInteractiveTarget(element) {
    return Boolean(getClosest(element, INTERACTIVE_SELECTOR));
  }

  function getCardDescription(card) {
    var media = card && card.querySelector('img, video');
    if (!media) return 'Gallery item';
    return media.getAttribute('alt') || media.getAttribute('aria-label') || 'Gallery item';
  }

  function getCardSource(card) {
    var image = card && card.querySelector('img');
    var video = card && card.querySelector('video');
    var source;

    if (image) {
      return {
        type: 'image',
        source: image.getAttribute('data-gallery-src') || image.getAttribute('src') || '',
        description: image.getAttribute('alt') || 'Gallery image'
      };
    }

    if (video) {
      source = video.querySelector('source');
      return {
        type: 'video',
        source: video.getAttribute('src') || (source && source.getAttribute('src')) || '',
        description: video.getAttribute('data-gallery-description') || 'Gallery video',
        poster: video.getAttribute('poster') || ''
      };
    }

    return null;
  }

  function loadCardMedia(card) {
    if (!card) return;

    toArray(card.querySelectorAll('img[data-gallery-src]')).forEach(function (image) {
      if (image.getAttribute('data-gallery-loaded') === 'true') return;
      image.setAttribute('src', image.getAttribute('data-gallery-src'));
      image.setAttribute('data-gallery-loaded', 'true');
    });
  }

  function loadVideoPosters(root) {
    if (!root) return;
    toArray(root.querySelectorAll('video[data-poster]')).forEach(function (video) {
      if (video.getAttribute('poster')) return;
      video.setAttribute('poster', video.getAttribute('data-poster'));
    });
  }

  function stopCardVideoPreview(card) {
    var video = card && card.querySelector('video[data-gallery-video-preview]');
    if (!video) return;

    video.setAttribute('data-gallery-preview-requested', 'false');
    try {
      video.pause();
    } catch (error) {
      // Preview pause is best-effort during card transitions.
    }
    removeClass(card, 'is-video-previewing');
  }

  function startCardVideoPreview(card) {
    var panel = getClosest(card, '[data-gallery-panel]');
    var video = card && card.querySelector('video[data-gallery-video-preview]');
    var playPromise;

    if (
      !video ||
      !shouldAutoPreviewVideo() ||
      card.getAttribute('data-gallery-position') !== '0' ||
      (panel && panel.hidden)
    ) {
      return;
    }

    video.setAttribute('data-gallery-preview-requested', 'true');
    video.muted = true;
    if (video.readyState > 0 && video.currentTime > 0.12) {
      try {
        video.currentTime = 0;
      } catch (error) {
        // Seeking is optional while media metadata is still loading.
      }
    }

    try {
      playPromise = video.play();
    } catch (error) {
      video.setAttribute('data-gallery-preview-requested', 'false');
      return;
    }

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(function () {
        if (video.getAttribute('data-gallery-preview-requested') !== 'true') {
          video.pause();
          return;
        }
        addClass(card, 'is-video-previewing');
      }).catch(function () {
        video.setAttribute('data-gallery-preview-requested', 'false');
        removeClass(card, 'is-video-previewing');
      });
    } else {
      addClass(card, 'is-video-previewing');
    }
  }

  function bindCardVideoPreview(card) {
    if (!card.querySelector('video[data-gallery-video-preview]')) return;

    card.addEventListener('mouseenter', function () {
      startCardVideoPreview(card);
    });
    card.addEventListener('mouseleave', function () {
      stopCardVideoPreview(card);
    });
    card.addEventListener('focusin', function () {
      startCardVideoPreview(card);
    });
    card.addEventListener('focusout', function (event) {
      if (!event.relatedTarget || !card.contains(event.relatedTarget)) {
        stopCardVideoPreview(card);
      }
    });
  }

  function getRelativePosition(cardIndex, activeIndex, length, lastDirection) {
    var forward = normalizeIndex(cardIndex - activeIndex, length);
    var backward = forward - length;

    if (forward === 0) return 0;
    if (Math.abs(forward) === Math.abs(backward)) {
      return lastDirection < 0 ? backward : forward;
    }

    return Math.abs(forward) < Math.abs(backward) ? forward : backward;
  }

  function storeOriginalTabIndex(element) {
    if (element.hasAttribute('data-gallery-original-tabindex')) return;

    if (element.hasAttribute('tabindex')) {
      element.setAttribute('data-gallery-original-tabindex', element.getAttribute('tabindex'));
    } else {
      element.setAttribute('data-gallery-original-tabindex', '__none__');
    }
  }

  function setElementTabbable(element, tabbable) {
    var original;
    storeOriginalTabIndex(element);

    if (!tabbable) {
      element.setAttribute('tabindex', '-1');
      return;
    }

    original = element.getAttribute('data-gallery-original-tabindex');
    if (original === '__none__') {
      element.removeAttribute('tabindex');
    } else {
      element.setAttribute('tabindex', original);
    }
  }

  function setCardAccessibility(card, isActive) {
    var interactiveElements = toArray(card.querySelectorAll(INTERACTIVE_SELECTOR));

    card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    interactiveElements.forEach(function (element) {
      setElementTabbable(element, isActive);
    });

    card.removeAttribute('role');
    card.removeAttribute('aria-label');
    card.removeAttribute('tabindex');

    if (isActive) {
      card.setAttribute('aria-current', 'true');
    } else {
      card.removeAttribute('aria-current');
    }
  }

  function addMediaOpenButton(state, card) {
    var button;
    if (state.kind !== 'media' || card.querySelector('[data-gallery-open]')) return;

    button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-card-open';
    button.setAttribute('data-gallery-open', '');
    button.setAttribute('aria-label', 'Open ' + getCardDescription(card) + ' in gallery viewer');
    button.innerHTML = '<span aria-hidden="true">↗</span>';
    card.appendChild(button);
  }

  function initGalleryTabs() {
    var tabList = document.querySelector('[data-gallery-tabs]');
    var lightbox = document.querySelector('[data-gallery-lightbox]');
    var buttons;
    var panels;
    var indicator;
    var hashToTab;
    var tabToHash;
    var stacks = {};
    var currentTab = '';
    var lightboxContext = null;
    var lightboxImage;
    var lightboxVideo;
    var lightboxTitle;
    var lightboxCount;
    var lightboxLive;
    var closeButton;
    var desktopGalleryQuery;
    var indicatorAnimation = null;
    var indicatorPosition = 0;
    var indicatorWidth = 0;
    var indicatorReady = false;

    if (!tabList || tabList.getAttribute('data-gallery-initialized') === 'true') return;

    buttons = toArray(tabList.querySelectorAll('[data-gallery-tab]'));
    panels = toArray(document.querySelectorAll('[data-gallery-panel]'));
    indicator = tabList.querySelector('.gallery-tab-indicator');
    if (!buttons.length || !panels.length) return;

    hashToTab = {
      '#gallery': 'lens',
      '#blender-gallery': 'blender',
      '#threejs-arts': 'threejs'
    };
    tabToHash = {
      lens: 'gallery',
      blender: 'blender-gallery',
      threejs: 'threejs-arts'
    };

    if (lightbox) {
      lightboxImage = lightbox.querySelector('[data-gallery-lightbox-image]');
      lightboxVideo = lightbox.querySelector('[data-gallery-lightbox-video]');
      lightboxTitle = lightbox.querySelector('[data-gallery-lightbox-title]');
      lightboxCount = lightbox.querySelector('[data-gallery-lightbox-count]');
      lightboxLive = lightbox.querySelector('[data-gallery-lightbox-live]');
      closeButton = lightbox.querySelector('[data-gallery-lightbox-action="close"]');
    }

    function getButton(name) {
      return tabList.querySelector('[data-gallery-tab="' + name + '"]');
    }

    function getPanel(name) {
      return document.querySelector('[data-gallery-panel="' + name + '"]');
    }

    function readIndicatorVisualState() {
      var tabListRect;
      var indicatorRect;

      if (!indicatorReady || indicator.style.opacity !== '1') {
        return {
          position: indicatorPosition,
          width: indicatorWidth
        };
      }

      tabListRect = tabList.getBoundingClientRect();
      indicatorRect = indicator.getBoundingClientRect();
      return {
        position: indicatorRect.left - tabListRect.left,
        width: indicatorRect.width
      };
    }

    function updateIndicator(button, immediate) {
      var targetPosition;
      var targetWidth;
      var currentState;
      var stretchPosition;
      var stretchWidth;
      var reduceMotion;
      var canAnimate;
      var activeAnimation;

      if (!indicator || !button) return;

      targetPosition = button.offsetLeft;
      targetWidth = button.offsetWidth;
      reduceMotion = mediaMatches(REDUCED_MOTION_QUERY);
      canAnimate = !immediate &&
        !reduceMotion &&
        indicatorReady &&
        typeof indicator.animate === 'function';
      currentState = readIndicatorVisualState();
      canAnimate = canAnimate && (
        Math.abs(currentState.position - targetPosition) > 0.5 ||
        Math.abs(currentState.width - targetWidth) > 0.5
      );

      if (indicatorAnimation) {
        activeAnimation = indicatorAnimation;
        indicatorAnimation = null;
        activeAnimation.cancel();
      }

      toggleClass(indicator, 'is-instant', Boolean(immediate) || reduceMotion);
      toggleClass(indicator, 'is-magnetic', canAnimate);
      indicator.style.width = targetWidth + 'px';
      indicator.style.transform = 'translateX(' + targetPosition + 'px)';
      indicator.style.opacity = '1';
      indicatorPosition = targetPosition;
      indicatorWidth = targetWidth;
      indicatorReady = true;

      if (!canAnimate) return;

      stretchPosition = Math.min(currentState.position, targetPosition);
      stretchWidth = Math.max(
        currentState.position + currentState.width,
        targetPosition + targetWidth
      ) - stretchPosition;

      indicatorAnimation = indicator.animate([
        {
          transform: 'translateX(' + currentState.position + 'px)',
          width: currentState.width + 'px',
          offset: 0,
          easing: 'cubic-bezier(0.34, 0.02, 0.22, 1)'
        },
        {
          transform: 'translateX(' + stretchPosition + 'px)',
          width: stretchWidth + 'px',
          offset: 0.393,
          easing: 'cubic-bezier(0.2, 0.82, 0.22, 1)'
        },
        {
          transform: 'translateX(' + targetPosition + 'px)',
          width: targetWidth + 'px',
          offset: 1
        }
      ], {
        duration: 280,
        fill: 'both'
      });

      activeAnimation = indicatorAnimation;
      activeAnimation.onfinish = function () {
        if (indicatorAnimation !== activeAnimation) return;
        indicatorAnimation = null;
        activeAnimation.cancel();
        removeClass(indicator, 'is-magnetic');
      };
      activeAnimation.oncancel = function () {
        if (indicatorAnimation === activeAnimation) {
          indicatorAnimation = null;
          removeClass(indicator, 'is-magnetic');
        }
      };
    }

    function updateHash(name) {
      var anchorId = tabToHash[name];
      if (!anchorId || window.location.hash === '#' + anchorId) return;

      try {
        window.history.replaceState(null, '', '#' + anchorId);
      } catch (error) {
        console.warn('Unable to update gallery hash:', error);
      }
    }

    function setStackStatus(state, announce) {
      var current = state.shell.querySelector('[data-gallery-current]');
      var total = state.shell.querySelector('[data-gallery-total]');
      var live = state.shell.querySelector('[data-gallery-live]');
      var description = getCardDescription(state.cards[state.index]);

      if (current) current.textContent = padNumber(state.index + 1);
      if (total) total.textContent = padNumber(state.cards.length);
      if (announce && live) {
        live.textContent = state.label + ', ' + description + ', item ' +
          (state.index + 1) + ' of ' + state.cards.length;
      }
    }

    function loadStackWindow(state) {
      if (!state.cards.length) return;

      loadCardMedia(state.cards[state.index]);
      loadCardMedia(state.cards[normalizeIndex(state.index - 1, state.cards.length)]);
      loadCardMedia(state.cards[normalizeIndex(state.index + 1, state.cards.length)]);
    }

    function renderStack(state, options) {
      var config = options || {};
      var activeCard = null;

      state.root.style.setProperty('--gallery-drag-x', '0px');
      toggleClass(state.root, 'is-instant', Boolean(config.immediate) || mediaMatches(REDUCED_MOTION_QUERY));
      state.cards.forEach(function (card, cardIndex) {
        var position = getRelativePosition(cardIndex, state.index, state.cards.length, state.lastDirection);
        var visible = Math.abs(position) <= 1;
        var isActive = position === 0;

        if (isActive) activeCard = card;
        if (!isActive) stopCardVideoPreview(card);
        card.hidden = !visible;
        if (visible) {
          card.setAttribute('data-gallery-position', String(position));
        } else {
          card.removeAttribute('data-gallery-position');
        }
        setCardAccessibility(card, isActive);
      });

      if (config.loadMedia !== false) {
        loadStackWindow(state);
      }
      setStackStatus(state, Boolean(config.announce));
      if (config.announce && activeCard && !lightboxContext) {
        requestFrame(function () {
          startCardVideoPreview(activeCard);
        });
      }
      requestFrame(function () {
        removeClass(state.root, 'is-instant');
      });
    }

    function setStackIndex(state, index, options) {
      var config = options || {};
      var nextIndex = normalizeIndex(index, state.cards.length);

      if (!state.cards.length || nextIndex === state.index) {
        renderStack(state, config);
        return;
      }

      state.lastDirection = config.direction || (nextIndex > state.index ? 1 : -1);
      state.index = nextIndex;
      renderStack(state, config);
    }

    function moveStack(state, amount, announce) {
      if (!state || state.cards.length < 2) return;

      setStackIndex(state, state.index + amount, {
        direction: amount < 0 ? -1 : 1,
        announce: announce
      });
    }

    function pauseLightboxVideo() {
      if (!lightboxVideo) return;
      try {
        lightboxVideo.pause();
      } catch (error) {
        // Media pause is best-effort during teardown.
      }
    }

    function pauseGalleryVideoPreviews() {
      toArray(document.querySelectorAll('[data-gallery-card]')).forEach(function (card) {
        stopCardVideoPreview(card);
      });
    }

    function renderLightbox(announce) {
      var state;
      var card;
      var media;
      var source;

      if (!lightboxContext || !lightbox) return;

      state = lightboxContext.state;
      card = state.cards[state.index];
      loadCardMedia(card);
      media = getCardSource(card);
      if (!media || !media.source) return;

      pauseLightboxVideo();
      if (media.type === 'image') {
        lightboxVideo.hidden = true;
        lightboxVideo.removeAttribute('src');
        lightboxVideo.removeAttribute('poster');
        lightboxImage.hidden = false;
        lightboxImage.src = media.source;
        lightboxImage.alt = media.description;
      } else {
        lightboxImage.hidden = true;
        lightboxImage.removeAttribute('src');
        lightboxImage.alt = '';
        lightboxVideo.hidden = false;
        if (media.poster) {
          lightboxVideo.setAttribute('poster', media.poster);
        } else {
          lightboxVideo.removeAttribute('poster');
        }
        source = media.source;
        if (lightboxVideo.getAttribute('src') !== source) {
          lightboxVideo.src = source;
          lightboxVideo.load();
        }
      }

      lightboxTitle.textContent = state.label;
      lightboxCount.textContent = padNumber(state.index + 1) + ' / ' + padNumber(state.cards.length);
      if (announce && lightboxLive) {
        lightboxLive.textContent = media.description + ', item ' +
          (state.index + 1) + ' of ' + state.cards.length;
      }
    }

    function openLightbox(state, opener) {
      if (!lightbox || !state || state.kind !== 'media') return;

      lightboxContext = {
        state: state,
        opener: opener || state.root
      };
      pauseGalleryVideoPreviews();
      renderLightbox(false);
      lightbox.hidden = false;
      document.body.classList.add('is-gallery-lightbox-open');
      requestFrame(function () {
        addClass(lightbox, 'is-open');
        if (closeButton) closeButton.focus();
      });
    }

    function closeLightbox() {
      var opener;
      var openerCard;
      var activeCard;
      var focusTarget;
      if (!lightbox || !lightboxContext) return;

      opener = lightboxContext.opener;
      openerCard = getClosest(opener, '[data-gallery-card]');
      activeCard = lightboxContext.state.cards[lightboxContext.state.index];
      focusTarget = opener;
      if (openerCard && openerCard !== activeCard) {
        focusTarget = activeCard.querySelector('[data-gallery-open]') || lightboxContext.state.root;
      }
      pauseLightboxVideo();
      removeClass(lightbox, 'is-open');
      document.body.classList.remove('is-gallery-lightbox-open');
      lightbox.hidden = true;
      lightboxContext = null;

      if (focusTarget && focusTarget.isConnected && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
      }
    }

    function moveLightbox(amount) {
      if (!lightboxContext) return;

      moveStack(lightboxContext.state, amount, true);
      renderLightbox(true);
    }

    function getLightboxFocusableElements() {
      if (!lightbox) return [];
      return toArray(lightbox.querySelectorAll('button:not([disabled]), video[controls]')).filter(function (element) {
        return !element.hidden && element.offsetParent !== null;
      });
    }

    function trapLightboxFocus(event) {
      var focusable = getLightboxFocusableElements();
      var first;
      var last;
      if (!focusable.length) return;

      first = focusable[0];
      last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function bindLightbox() {
      var surface;
      var pointerId = null;
      var startX = 0;
      var startY = 0;
      var deltaX = 0;
      var deltaY = 0;

      if (!lightbox) return;

      lightbox.addEventListener('click', function (event) {
        var actionButton = getClosest(event.target, '[data-gallery-lightbox-action]');
        if (getClosest(event.target, '[data-gallery-lightbox-close]')) {
          closeLightbox();
          return;
        }
        if (!actionButton) return;

        if (actionButton.getAttribute('data-gallery-lightbox-action') === 'previous') {
          moveLightbox(-1);
        } else if (actionButton.getAttribute('data-gallery-lightbox-action') === 'next') {
          moveLightbox(1);
        } else {
          closeLightbox();
        }
      });

      lightbox.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeLightbox();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveLightbox(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveLightbox(1);
        } else if (event.key === 'Tab') {
          trapLightboxFocus(event);
        }
      });

      surface = lightbox.querySelector('[data-gallery-lightbox-surface]');
      if (!surface || typeof window.PointerEvent === 'undefined') return;

      surface.addEventListener('pointerdown', function (event) {
        if (!event.isPrimary || event.button !== 0 || getClosest(event.target, 'video')) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        deltaX = 0;
        deltaY = 0;
        if (typeof surface.setPointerCapture === 'function') {
          surface.setPointerCapture(pointerId);
        }
      });

      surface.addEventListener('pointermove', function (event) {
        if (pointerId === null || event.pointerId !== pointerId) return;
        deltaX = event.clientX - startX;
        deltaY = event.clientY - startY;
        if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
          event.preventDefault();
        }
      }, { passive: false });

      function finishLightboxSwipe(event) {
        if (pointerId === null || event.pointerId !== pointerId) return;
        if (Math.abs(deltaX) >= 56 && Math.abs(deltaX) > Math.abs(deltaY)) {
          moveLightbox(deltaX < 0 ? 1 : -1);
        }
        pointerId = null;
        deltaX = 0;
        deltaY = 0;
      }

      surface.addEventListener('pointerup', finishLightboxSwipe);
      surface.addEventListener('pointercancel', function () {
        pointerId = null;
        deltaX = 0;
        deltaY = 0;
      });
    }

    function bindStack(state) {
      var root = state.root;
      var previousButton = state.shell.querySelector('[data-gallery-action="previous"]');
      var nextButton = state.shell.querySelector('[data-gallery-action="next"]');
      var pointerId = null;
      var startX = 0;
      var startY = 0;
      var deltaX = 0;
      var deltaY = 0;
      var dragFrame = 0;
      var dragging = false;
      var suppressClick = false;

      function renderDrag() {
        dragFrame = 0;
        root.style.setProperty('--gallery-drag-x', deltaX + 'px');
      }

      function scheduleDragRender() {
        if (dragFrame) return;
        dragFrame = window.requestAnimationFrame(renderDrag);
      }

      function resetDrag() {
        pointerId = null;
        deltaX = 0;
        deltaY = 0;
        dragging = false;
        removeClass(root, 'is-dragging');
        root.style.setProperty('--gallery-drag-x', '0px');
      }

      function finishDrag(event, cancelled) {
        var threshold;
        var shouldMove;
        if (pointerId === null || event.pointerId !== pointerId) return;

        threshold = Math.max(48, root.clientWidth * 0.1);
        shouldMove = !cancelled && dragging &&
          Math.abs(deltaX) > Math.abs(deltaY) &&
          Math.abs(deltaX) >= threshold;
        suppressClick = dragging;

        if (shouldMove) {
          moveStack(state, deltaX < 0 ? 1 : -1, true);
        }
        resetDrag();
        window.setTimeout(function () {
          suppressClick = false;
        }, 0);
      }

      if (previousButton) {
        previousButton.addEventListener('click', function () {
          moveStack(state, -1, true);
        });
      }
      if (nextButton) {
        nextButton.addEventListener('click', function () {
          moveStack(state, 1, true);
        });
      }

      root.addEventListener('pointerdown', function (event) {
        var card = getClosest(event.target, '[data-gallery-card]');
        if (
          typeof window.PointerEvent === 'undefined' ||
          !event.isPrimary ||
          event.button !== 0 ||
          !card ||
          card.getAttribute('data-gallery-position') !== '0' ||
          isInteractiveTarget(event.target)
        ) {
          return;
        }

        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        deltaX = 0;
        deltaY = 0;
        dragging = false;
        suppressClick = false;
        if (typeof root.setPointerCapture === 'function') {
          try {
            root.setPointerCapture(pointerId);
          } catch (error) {
            // Pointer capture is a progressive enhancement.
          }
        }
      });

      root.addEventListener('pointermove', function (event) {
        if (pointerId === null || event.pointerId !== pointerId) return;

        deltaX = event.clientX - startX;
        deltaY = event.clientY - startY;
        if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
          dragging = true;
          addClass(root, 'is-dragging');
          event.preventDefault();
          scheduleDragRender();
        }
      }, { passive: false });

      root.addEventListener('pointerup', function (event) {
        finishDrag(event, false);
      });
      root.addEventListener('pointercancel', function (event) {
        finishDrag(event, true);
      });

      root.addEventListener('click', function (event) {
        var card = getClosest(event.target, '[data-gallery-card]');
        var position;
        var openButton = getClosest(event.target, '[data-gallery-open]');

        if (suppressClick) {
          suppressClick = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!card) return;

        position = parseInt(card.getAttribute('data-gallery-position'), 10);
        if (position !== 0 && isFinite(position)) {
          event.preventDefault();
          event.stopPropagation();
          setStackIndex(state, parseInt(card.getAttribute('data-gallery-card-index'), 10), {
            direction: position < 0 ? -1 : 1,
            announce: true
          });
          return;
        }

        if (state.kind === 'media' && (openButton || !isInteractiveTarget(event.target))) {
          openLightbox(state, openButton || card);
        }
      });

      root.addEventListener('keydown', function (event) {
        var targetIsInteractive = event.target !== root && isInteractiveTarget(event.target);

        if (targetIsInteractive && event.key !== 'Escape') return;

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveStack(state, -1, true);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveStack(state, 1, true);
        } else if (event.key === 'Home') {
          event.preventDefault();
          setStackIndex(state, 0, { direction: -1, announce: true });
        } else if (event.key === 'End') {
          event.preventDefault();
          setStackIndex(state, state.cards.length - 1, { direction: 1, announce: true });
        } else if (
          state.kind === 'media' &&
          (event.key === 'Enter' || event.key === ' ') &&
          !targetIsInteractive
        ) {
          event.preventDefault();
          openLightbox(state, event.target);
        }
      });
    }

    function createStack(panel) {
      var root = panel.querySelector('[data-gallery-stack]');
      var shell;
      var state;
      if (!root) return null;

      shell = getClosest(root, '.gallery-stack-shell');
      state = {
        root: root,
        shell: shell,
        cards: toArray(root.querySelectorAll(':scope > [data-gallery-card]')),
        kind: root.getAttribute('data-gallery-kind') || 'media',
        label: root.getAttribute('data-gallery-label') || 'Gallery',
        index: 0,
        lastDirection: 1
      };

      state.cards.forEach(function (card, index) {
        card.setAttribute('data-gallery-card-index', String(index));
        addMediaOpenButton(state, card);
        bindCardVideoPreview(card);
      });

      addClass(root, 'is-enhanced');
      bindStack(state);
      return state;
    }

    function animatePanel(panel, direction, immediate) {
      if (!panel) return;

      removeClass(panel, 'is-animating');
      removeClass(panel, 'is-from-right');
      removeClass(panel, 'is-from-left');
      if (!direction || immediate || mediaMatches(REDUCED_MOTION_QUERY)) return;

      panel.offsetWidth;
      addClass(panel, 'is-animating');
      addClass(panel, direction < 0 ? 'is-from-left' : 'is-from-right');
      panel.addEventListener('animationend', function handleAnimationEnd() {
        removeClass(panel, 'is-animating');
        removeClass(panel, 'is-from-right');
        removeClass(panel, 'is-from-left');
        panel.removeEventListener('animationend', handleAnimationEnd);
      });
    }

    function activateTab(name, options) {
      var config = options || {};
      var activeButton = getButton(name);
      var activePanel = getPanel(name);
      var previousIndex;
      var nextIndex;
      var direction = 0;
      if (!activeButton || !activePanel || !stacks[name]) return;

      if (currentTab && currentTab !== name) pauseGalleryVideoPreviews();
      previousIndex = buttons.indexOf(getButton(currentTab));
      nextIndex = buttons.indexOf(activeButton);
      if (previousIndex !== -1 && nextIndex !== previousIndex) {
        direction = nextIndex > previousIndex ? 1 : -1;
      }

      currentTab = name;
      buttons.forEach(function (button) {
        var active = button === activeButton;
        toggleClass(button, 'is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.setAttribute('tabindex', active ? '0' : '-1');
      });
      panels.forEach(function (panel) {
        var active = panel === activePanel;
        panel.hidden = !active;
        panel.setAttribute('aria-hidden', String(!active));
      });

      loadVideoPosters(activePanel);
      renderStack(stacks[name], { immediate: config.immediate });
      animatePanel(activePanel, direction, config.immediate);
      updateIndicator(activeButton, config.immediate);

      if (config.scrollTabIntoView) {
        scrollElementIntoView(activeButton, config.immediate);
      }
      if (config.focusTab) activeButton.focus();
      if (config.updateHash) updateHash(name);
    }

    panels.forEach(function (panel) {
      var name = panel.getAttribute('data-gallery-panel');
      var stack = createStack(panel);
      if (name && stack) {
        stacks[name] = stack;
        renderStack(stack, { immediate: true, loadMedia: false });
      }
    });

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

    bindLightbox();
    tabList.setAttribute('data-gallery-initialized', 'true');
    activateTab(hashToTab[window.location.hash] || 'lens', {
      immediate: true,
      scrollTabIntoView: Boolean(hashToTab[window.location.hash])
    });

    window.addEventListener('hashchange', function () {
      activateTab(hashToTab[window.location.hash] || 'lens', {
        scrollTabIntoView: true
      });
    });

    window.addEventListener('resize', function () {
      requestFrame(function () {
        updateIndicator(getButton(currentTab), true);
      });
    });

    desktopGalleryQuery = window.matchMedia ? window.matchMedia(DESKTOP_GALLERY_QUERY) : null;
    if (desktopGalleryQuery) {
      var handleDesktopGalleryChange = function () {
        if (!desktopGalleryQuery.matches) closeLightbox();
      };
      if (desktopGalleryQuery.addEventListener) {
        desktopGalleryQuery.addEventListener('change', handleDesktopGalleryChange);
      } else if (desktopGalleryQuery.addListener) {
        desktopGalleryQuery.addListener(handleDesktopGalleryChange);
      }
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        pauseLightboxVideo();
        pauseGalleryVideoPreviews();
      }
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        requestFrame(function () {
          updateIndicator(getButton(currentTab), true);
        });
      });
    }
  }

export { initGalleryTabs };
