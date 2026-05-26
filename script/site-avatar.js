(function (window, document) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  function initAvatarCarousel() {
    var wrap = Site.getElement('avatarCarousel');
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

      Site.removeClass(slides[current], 'active');
      Site.removeClass(dots[current], 'active');

      current = nextIndex;
      Site.addClass(slides[current], 'active');
      Site.addClass(dots[current], 'active');
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
      if (index === 0) Site.addClass(img, 'active');
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

  Site.initAvatarCarousel = initAvatarCarousel;
}(window, document));
