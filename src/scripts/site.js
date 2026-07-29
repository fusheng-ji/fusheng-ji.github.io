import { Site } from "./modules/core.js";
import "./modules/glass.js";
import "./modules/gallery.js";
import "./modules/blog.js";
import "./modules/media.js";
import "./modules/glass-nav.js";

Site.initInitialScrollPosition();

Site.ready(function () {
  Site.Media?.init();
  Site.initGalleryTabs?.();
  Site.initToggleLinks();
  Site.initLogoFallback();
  Site.initMobileNavbar();
  Site.initHeroBioDisclosure();
  Site.initNewsArchiveDisclosure();
  Site.initSmoothScroll();
  Site.initSiteGlassNav?.();
  Site.loadBlogCards?.();
});
