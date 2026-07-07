(function (window, document) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  function activateImage(img) {
    var src = img && img.getAttribute('data-src');
    if (!src || img.getAttribute('src')) return;
    img.src = src;
    img.removeAttribute('data-src');
    img.setAttribute('data-loaded', 'true');
  }

  function activateVideo(video) {
    var src = video && video.getAttribute('data-src');
    if (!src || video.querySelector('source')) return;

    var source = document.createElement('source');
    source.src = src;
    source.type = 'video/mp4';
    video.appendChild(source);
    video.removeAttribute('data-src');
    video.preload = 'metadata';
    video.load();
  }

  function observeLazyMedia() {
    var lazyNodes = Site.toArray(document.querySelectorAll('img[data-src], video[data-src]'));

    if (!lazyNodes.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      lazyNodes.forEach(function (node) {
        if (node.tagName === 'VIDEO') activateVideo(node);
        else activateImage(node);
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (entry.target.tagName === 'VIDEO') activateVideo(entry.target);
        else activateImage(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '280px 0px', threshold: 0.01 });

    lazyNodes.forEach(function (node) {
      observer.observe(node);
    });
  }

  function init() {
    observeLazyMedia();
  }

  Site.Media = {
    init: init,
    activateImage: activateImage,
    activateVideo: activateVideo
  };
}(window, document));
