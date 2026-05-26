(function (window) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  Site.initInitialScrollPosition();

  Site.ready(function () {
    if (Site.initGalleryTabs) Site.initGalleryTabs();
    if (Site.Carousels) Site.Carousels.init();
    if (Site.initAvatarCarousel) Site.initAvatarCarousel();
    Site.initToggleLinks();
    Site.initLogoFallback();
    Site.initMobileNavbar();
    Site.initHeroBioDisclosure();
    Site.initSmoothScroll();
    if (Site.initTimeline) Site.initTimeline();
    if (Site.loadBlogCards) Site.loadBlogCards();
  });
}(window));
