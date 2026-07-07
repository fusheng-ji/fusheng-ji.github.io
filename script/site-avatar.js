(function (window, document) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  function initAvatarCarousel() {
    var wrap = Site.getElement('avatarCarousel');
    if (!wrap || wrap.getAttribute('data-avatar-ready') === 'true') return;

    var slidesEl = wrap.querySelector('.avatar-slides');
    var dotsEl = wrap.querySelector('.avatar-dots');
    if (!slidesEl || !dotsEl) return;

    var slides = Site.toArray(slidesEl.querySelectorAll('img'));
    var dots = Site.toArray(dotsEl.querySelectorAll('.avatar-dot'));
    if (!slides.length) return;

    var current = 0;
    var index;

    for (index = 0; index < slides.length; index += 1) {
      if (Site.hasClass(slides[index], 'active')) {
        current = index;
        break;
      }
    }

    var timerId = null;

    function ensureLoaded(index) {
      var img = slides[index];
      if (!img || !Site.Media || !Site.Media.activateImage) return;
      Site.Media.activateImage(img);
    }

    function preloadWindow(index) {
      ensureLoaded(index);
      if (slides.length > 1) {
        ensureLoaded((index + 1) % slides.length);
      }
    }

    function goTo(index) {
      if (!slides.length) return;

      var nextIndex = (index + slides.length) % slides.length;
      if (nextIndex === current) return;

      Site.removeClass(slides[current], 'active');
      if (dots[current]) Site.removeClass(dots[current], 'active');

      current = nextIndex;
      preloadWindow(current);
      Site.addClass(slides[current], 'active');
      if (dots[current]) Site.addClass(dots[current], 'active');
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
      if (slides.length < 2 || (Site.prefersReducedMotion && Site.prefersReducedMotion())) return;
      timerId = window.setInterval(next, 3500);
    }

    dots.forEach(function (dot, index) {
      if (index >= slides.length) {
        Site.removeNode(dot);
        return;
      }

      dot.addEventListener('click', function () {
        goTo(index);
        startTimer();
      });
    });

    if (dots.length > slides.length) {
      dots.slice(slides.length).forEach(Site.removeNode);
      dots = dots.slice(0, slides.length);
    }

    Site.addClass(slides[current], 'active');
    if (dots[current]) Site.addClass(dots[current], 'active');

    preloadWindow(current);
    startTimer();
    wrap.addEventListener('mouseenter', stopTimer);
    wrap.addEventListener('mouseleave', startTimer);
    wrap.setAttribute('data-avatar-ready', 'true');
  }

  Site.initAvatarCarousel = initAvatarCarousel;
}(window, document));
