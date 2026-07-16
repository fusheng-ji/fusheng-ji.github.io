(function (window) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  function formatDate(dateString) {
    var date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString || '';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getPostUrl(post) {
    var blogBase = '/blog';
    var rawUrl = post && post.url ? String(post.url) : '';

    if (/^https?:\/\//.test(rawUrl)) {
      try {
        var parsed = new URL(rawUrl);
        if (parsed.hostname === 'fusheng-ji.github.io') {
          return parsed.pathname + parsed.search + parsed.hash;
        }
      } catch (error) {
        return rawUrl;
      }
      return rawUrl;
    }
    return blogBase + (rawUrl.indexOf('/') === 0 ? rawUrl : '/' + rawUrl);
  }

  function renderBlogCard(post) {
    var title = escapeHtml(post.title || 'Untitled');
    var description = escapeHtml(post.description || '');
    var date = formatDate(post.date);
    var reading = post.readingTime ? escapeHtml(String(post.readingTime)) + ' min read' : '';
    var metaBits = [];

    if (date) metaBits.push('<span class="blog-card-date">' + date + '</span>');
    if (reading) metaBits.push('<span class="blog-card-reading">' + reading + '</span>');

    return [
      '<article class="blog-card">',
      '  <a class="blog-card-link" href="' + escapeHtml(getPostUrl(post)) + '">',
      '    <div class="blog-card-top">',
      '      <div class="blog-card-top-meta">' + metaBits.join('') + '</div>',
      '    </div>',
      '    <span class="blog-card-title">' + title + '</span>',
      description ? '    <p class="blog-card-desc">' + description + '</p>' : '',
      '  </a>',
      '</article>'
    ].join('\n');
  }

  function renderBlogCards(posts) {
    var allPosts = Array.isArray(posts) ? posts : [];

    if (!allPosts.length) {
      return '<div class="blog-empty">No blog posts yet.</div>';
    }

    return [
      '<div class="blog-carousel" data-blog-carousel>',
      '  <div class="blog-carousel-viewport" aria-label="Blog posts carousel">',
      '    <div class="blog-carousel-track">',
      allPosts.map(renderBlogCard).join('\n'),
      '    </div>',
      '  </div>',
      '  <div class="blog-carousel-controls" aria-label="Blog carousel controls">',
      '    <button class="blog-carousel-button" type="button" data-blog-carousel-prev aria-label="Previous blog posts">&#8592;</button>',
      '    <div class="blog-carousel-dots" aria-label="Blog carousel pages"></div>',
      '    <button class="blog-carousel-button" type="button" data-blog-carousel-next aria-label="Next blog posts">&#8594;</button>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function getCardsPerView() {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches) {
      return 1;
    }

    return 2;
  }

  function initBlogCarousel(list) {
    var carousel = list && list.querySelector('[data-blog-carousel]');
    if (!carousel) return;

    var viewport = carousel.querySelector('.blog-carousel-viewport');
    var track = carousel.querySelector('.blog-carousel-track');
    var previousButton = carousel.querySelector('[data-blog-carousel-prev]');
    var nextButton = carousel.querySelector('[data-blog-carousel-next]');
    var dots = carousel.querySelector('.blog-carousel-dots');
    var cards = Site.toArray(carousel.querySelectorAll('.blog-card'));
    var state = {
      page: 0,
      pageCount: 1,
      cardsPerView: getCardsPerView(),
      gap: 16
    };

    function getPageCount() {
      return Math.max(1, Math.ceil(cards.length / state.cardsPerView));
    }

    function getStartIndex(page) {
      var maxStart = Math.max(0, cards.length - state.cardsPerView);
      return Math.min(page * state.cardsPerView, maxStart);
    }

    function readGap() {
      var styles = window.getComputedStyle ? window.getComputedStyle(track) : null;
      var rawGap = styles ? (styles.columnGap || styles.gap || '') : '';
      var parsedGap = parseFloat(rawGap);
      state.gap = isFinite(parsedGap) ? parsedGap : 16;
    }

    function renderDots() {
      if (!dots) return;

      dots.innerHTML = '';

      for (var index = 0; index < state.pageCount; index += 1) {
        (function (pageIndex) {
          var button = document.createElement('button');
          button.className = 'blog-carousel-dot';
          button.type = 'button';
          button.setAttribute('aria-label', 'Show blog posts page ' + (pageIndex + 1));
          button.addEventListener('click', function () {
            goToPage(pageIndex);
          });
          dots.appendChild(button);
        }(index));
      }
    }

    function updateControls() {
      var isStatic = state.pageCount <= 1;
      var dotButtons = dots ? Site.toArray(dots.querySelectorAll('.blog-carousel-dot')) : [];

      Site.toggleClass(carousel, 'is-static', isStatic);

      if (previousButton) {
        previousButton.disabled = isStatic || state.page === 0;
        previousButton.setAttribute('aria-disabled', previousButton.disabled ? 'true' : 'false');
      }

      if (nextButton) {
        nextButton.disabled = isStatic || state.page >= state.pageCount - 1;
        nextButton.setAttribute('aria-disabled', nextButton.disabled ? 'true' : 'false');
      }

      dotButtons.forEach(function (button, index) {
        var isActive = index === state.page;
        Site.toggleClass(button, 'is-active', isActive);
        button.setAttribute('aria-current', isActive ? 'page' : 'false');
      });
    }

    function updateCardBasis() {
      if (!viewport) return;

      if (!isTouchCarousel()) {
        carousel.style.removeProperty('--blog-card-basis');
        return;
      }

      var viewportWidth = viewport.getBoundingClientRect().width;
      var cardBasis = (viewportWidth - state.gap * (state.cardsPerView - 1)) / state.cardsPerView;

      carousel.style.setProperty('--blog-card-basis', Math.max(0, cardBasis) + 'px');
    }

    function updateTrack() {
      var card = cards[0];
      var offset = 0;

      updateCardBasis();

      if (card) {
        var cardWidth = card.getBoundingClientRect().width;
        offset = getStartIndex(state.page) * (cardWidth + state.gap);
      }

      track.style.transform = 'translate3d(' + (-offset) + 'px, 0, 0)';
      updateControls();
    }

    function refresh() {
      var previousPageCount = state.pageCount;
      state.cardsPerView = getCardsPerView();
      state.pageCount = getPageCount();
      state.page = Math.min(state.page, state.pageCount - 1);

      carousel.style.setProperty('--blog-cards-per-view', state.cardsPerView);
      readGap();

      if (previousPageCount !== state.pageCount) {
        renderDots();
      }

      updateTrack();
    }

    function goToPage(page) {
      state.page = Math.max(0, Math.min(page, state.pageCount - 1));
      updateTrack();
    }

    function isTouchCarousel() {
      return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches;
    }

    function bindTouchSwipe() {
      if (!viewport) return;

      var startX = 0;
      var startY = 0;
      var tracking = false;
      var blockClick = false;

      viewport.addEventListener('touchstart', function (event) {
        if (!isTouchCarousel() || !event.touches || event.touches.length !== 1) return;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        tracking = true;
      }, { passive: true });

      viewport.addEventListener('touchend', function (event) {
        if (!tracking) return;
        tracking = false;

        var touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return;

        var deltaX = touch.clientX - startX;
        var deltaY = touch.clientY - startY;

        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;

        blockClick = true;
        window.setTimeout(function () {
          blockClick = false;
        }, 320);

        if (deltaX < 0) {
          goToPage(state.page + 1);
        } else {
          goToPage(state.page - 1);
        }
      }, { passive: true });

      viewport.addEventListener('click', function (event) {
        if (!blockClick) return;
        event.preventDefault();
        event.stopPropagation();
      }, true);
    }

    if (previousButton) {
      previousButton.addEventListener('click', function () {
        goToPage(state.page - 1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function () {
        goToPage(state.page + 1);
      });
    }

    window.addEventListener('resize', Site.debounce ? Site.debounce(refresh, 120) : refresh);
    bindTouchSwipe();
    refresh();
  }

  function loadBlogCards() {
    var list = Site.getElement('blog-list');
    if (!list) return;

    list.setAttribute('aria-busy', 'true');

    if (typeof window.fetch !== 'function') {
      list.innerHTML = '<div class="blog-error">Blog posts are available on the blog page.</div>';
      list.setAttribute('aria-busy', 'false');
      return;
    }

    window.fetch('https://fusheng-ji.github.io/blog/posts.json', { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to fetch posts.json: ' + response.status);
        }
        return response.json();
      })
      .then(function (posts) {
        list.innerHTML = renderBlogCards(posts);
        initBlogCarousel(list);
      })
      .catch(function (error) {
        console.error(error);
        list.innerHTML = '<div class="blog-error">Unable to load blog posts.</div>';
      })
      .then(function () {
        list.setAttribute('aria-busy', 'false');
      });
  }

  Site.loadBlogCards = loadBlogCards;
}(window));
