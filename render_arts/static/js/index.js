document.addEventListener('DOMContentLoaded', function() {
  var burger = document.querySelector('.navbar-burger');
  var menu = document.querySelector('.navbar-menu');

  if (burger && menu) {
    burger.addEventListener('click', function() {
      var isActive = burger.classList.toggle('is-active');
      menu.classList.toggle('is-active', isActive);
      burger.setAttribute('aria-expanded', String(isActive));
    });
  }

  bulmaCarousel.attach('.carousel', {
    slidesToScroll: 1,
    slidesToShow: 3,
    loop: true,
    infinite: true,
    autoplay: false,
    autoplaySpeed: 3000,
  });
});
