(function (window) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  Site.initInitialScrollPosition();

  Site.ready(function () {
    if (Site.Media && Site.Media.init) Site.Media.init();
    if (Site.initGalleryTabs) Site.initGalleryTabs();
    if (Site.Carousels) Site.Carousels.init();
    Site.initToggleLinks();
    Site.initLogoFallback();
    Site.initMobileNavbar();
    Site.initHeroBioDisclosure();
    Site.initSmoothScroll();
    if (Site.initSiteGlassNav) Site.initSiteGlassNav();
    if (Site.loadBlogCards) Site.loadBlogCards();
  });
}(window));
