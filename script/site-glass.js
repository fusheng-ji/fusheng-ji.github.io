/**
 * SiteGlass — hybrid liquid glass for static sites.
 * Layer 1: CSS backdrop-filter blur/saturate (live DOM, all browsers)
 * Layer 2: SVG feDisplacementMap chromatic edge (Chromium / Edge)
 * Layer 3: CSS rim highlight (specular edge, no painted chromatic)
 *
 * Displacement technique adapted from @taehalim/liquid-glass (MIT).
 */
(function (window, document) {
  'use strict';

  var mounted = new WeakMap();
  var supportChecked = false;
  var supportsSvgBackdrop = false;

  var DEFAULTS = {
    radius: 16,
    border: 0.11,
    edge: 0.11,
    lightness: 50,
    blend: 'difference',
    xChannel: 'R',
    yChannel: 'B',
    alpha: 0.9,
    blur: 18,
    rOffset: 0,
    gOffset: 6,
    bOffset: 12,
    scale: -115,
    frost: 0.05,
    backdropBlur: 10,
    saturate: 1.22
  };

  function readNumber(element, name, fallback) {
    var value = element.getAttribute('data-' + name);
    var parsed;
    if (value === null || value === '') return fallback;
    parsed = parseFloat(value);
    return isFinite(parsed) ? parsed : fallback;
  }

  function readConfig(element) {
    return {
      radius: readNumber(element, 'radius', DEFAULTS.radius),
      border: readNumber(element, 'border', DEFAULTS.border),
      edge: readNumber(element, 'edge', DEFAULTS.edge),
      lightness: readNumber(element, 'lightness', DEFAULTS.lightness),
      blend: element.getAttribute('data-blend') || DEFAULTS.blend,
      xChannel: element.getAttribute('data-x-channel') || DEFAULTS.xChannel,
      yChannel: element.getAttribute('data-y-channel') || DEFAULTS.yChannel,
      alpha: readNumber(element, 'alpha', DEFAULTS.alpha),
      blur: readNumber(element, 'blur', DEFAULTS.blur),
      rOffset: readNumber(element, 'r-offset', DEFAULTS.rOffset),
      gOffset: readNumber(element, 'g-offset', DEFAULTS.gOffset),
      bOffset: readNumber(element, 'b-offset', DEFAULTS.bOffset),
      scale: readNumber(element, 'scale', DEFAULTS.scale),
    frost: readNumber(element, 'frost', DEFAULTS.frost),
    backdropBlur: readNumber(element, 'backdrop-blur', DEFAULTS.backdropBlur),
    saturate: readNumber(element, 'saturate', DEFAULTS.saturate)
    };
  }

  function checkSvgBackdropSupport() {
    if (supportChecked) return supportsSvgBackdrop;
    supportChecked = true;
    if (!window.CSS || !CSS.supports) return false;
    supportsSvgBackdrop =
      CSS.supports('backdrop-filter: url("#site-glass-support")') ||
      CSS.supports('-webkit-backdrop-filter: url("#site-glass-support")');
    return supportsSvgBackdrop;
  }

  function buildDisplacementSvg(width, height, config) {
    var border = Math.min(width, height) * config.border;
    var innerWidth = Math.max(1, width - border * 2);
    var innerHeight = Math.max(1, height - border * 2);
    var innerRadius = Math.max(0, config.radius - border * 0.35);

    return (
      '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="sg-red" x1="100%" y1="0%" x2="0%" y2="0%">' +
            '<stop offset="0%" stop-color="#0000"/>' +
            '<stop offset="42%" stop-color="#0000"/>' +
            '<stop offset="100%" stop-color="red"/>' +
          '</linearGradient>' +
          '<linearGradient id="sg-blue" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#0000"/>' +
            '<stop offset="42%" stop-color="#0000"/>' +
            '<stop offset="100%" stop-color="blue"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="' + width + '" height="' + height + '" fill="black"/>' +
        '<rect width="' + width + '" height="' + height + '" rx="' + config.radius + '" fill="url(#sg-red)"/>' +
        '<rect width="' + width + '" height="' + height + '" rx="' + config.radius + '" fill="url(#sg-blue)" style="mix-blend-mode:' + config.blend + '"/>' +
        '<rect x="' + border + '" y="' + border + '" width="' + innerWidth + '" height="' + innerHeight + '" rx="' + innerRadius + '"' +
          ' fill="hsl(0 0% ' + config.lightness + '% / ' + config.alpha + ')" style="filter:blur(' + config.blur + 'px)"/>' +
      '</svg>'
    );
  }

  function getEdgeWidthPx(width, height, config) {
    return Math.max(3, Math.round(Math.min(width, height) * config.edge));
  }

  function buildFilterMarkup(filterId, mapUri, config) {
    return (
      '<feImage x="0" y="0" width="100%" height="100%" href="' + mapUri + '" result="map"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="' + config.xChannel + '" yChannelSelector="' + config.yChannel + '"' +
        ' scale="' + (config.scale + config.rOffset) + '" result="dispRed"/>' +
      '<feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="' + config.xChannel + '" yChannelSelector="' + config.yChannel + '"' +
        ' scale="' + (config.scale + config.gOffset) + '" result="dispGreen"/>' +
      '<feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="' + config.xChannel + '" yChannelSelector="' + config.yChannel + '"' +
        ' scale="' + (config.scale + config.bOffset) + '" result="dispBlue"/>' +
      '<feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue"/>' +
      '<feBlend in="red" in2="green" mode="screen" result="rg"/>' +
      '<feBlend in="rg" in2="blue" mode="screen" result="output"/>' +
      '<feGaussianBlur in="output" stdDeviation="0.14"/>'
    );
  }

  function ensureStructure(element) {
    var filterId = element.getAttribute('data-site-glass-id');
    var layers = element.querySelector('.site-glass-layers');
    var svgRoot = element.querySelector('.site-glass-filter-defs');
    var filterNode;

    if (!filterId) {
      filterId = 'site-glass-' + Math.random().toString(36).slice(2, 9);
      element.setAttribute('data-site-glass-id', filterId);
    }

    if (!layers) {
      layers = document.createElement('div');
      layers.className = 'site-glass-layers';
      layers.setAttribute('aria-hidden', 'true');
      layers.innerHTML =
        '<div class="site-glass-backdrop"></div>' +
        '<div class="site-glass-edge"></div>' +
        '<div class="site-glass-rim"></div>';
      element.insertBefore(layers, element.firstChild);
    } else if (!layers.querySelector('.site-glass-edge')) {
      var rimNode = layers.querySelector('.site-glass-rim');
      var edgeNode = document.createElement('div');
      edgeNode.className = 'site-glass-edge';
      layers.insertBefore(edgeNode, rimNode);
    }

    if (!svgRoot) {
      svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgRoot.setAttribute('class', 'site-glass-filter-defs');
      svgRoot.setAttribute('aria-hidden', 'true');
      svgRoot.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgRoot.innerHTML =
        '<defs><filter id="' + filterId + '" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"></filter></defs>';
      element.insertBefore(svgRoot, layers.nextSibling);
    }

    filterNode = svgRoot.querySelector('#' + CSS.escape(filterId));
    return {
      filterId: filterId,
      backdrop: layers.querySelector('.site-glass-backdrop'),
      edge: layers.querySelector('.site-glass-edge'),
      filterNode: filterNode
    };
  }

  function applyBackdrop(element, parts, config, metrics) {
    var blurPx = config.backdropBlur;
    var saturatePct = Math.round(config.saturate * 100);
    var baseFilter = 'blur(' + blurPx + 'px) saturate(' + saturatePct + '%)';
    var frostAlpha = Math.max(0, Math.min(1, config.frost));
    var isDark = element.getAttribute('data-glass-dark') === 'true';
    var chromaticEnabled = element.getAttribute('data-chromatic') !== 'false';
    var edgeWidthPx = metrics ? metrics.edgeWidthPx : getEdgeWidthPx(1, 1, config);

    element.style.setProperty('--site-glass-frost', String(frostAlpha));
    element.style.setProperty('--site-glass-edge-width', edgeWidthPx + 'px');
    element.classList.toggle('site-glass--dark', isDark);

    parts.backdrop.style.display = '';
    parts.backdrop.style.backdropFilter = baseFilter;
    parts.backdrop.style.webkitBackdropFilter = baseFilter;

    if (parts.edge) {
      parts.edge.style.backdropFilter = '';
      parts.edge.style.webkitBackdropFilter = '';
      parts.edge.style.display = chromaticEnabled ? '' : 'none';
    }

    if (chromaticEnabled && checkSvgBackdropSupport() && parts.filterNode && parts.edge) {
      element.classList.add('site-glass--chromatic');
      parts.edge.style.backdropFilter = 'url("#' + parts.filterId + '")';
      parts.edge.style.webkitBackdropFilter = parts.edge.style.backdropFilter;
    } else {
      element.classList.remove('site-glass--chromatic');
    }
  }

  function render(element) {
    var parts = ensureStructure(element);
    var config = readConfig(element);
    var rect = element.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width));
    var height = Math.max(1, Math.round(rect.height));
    var edgeWidthPx = getEdgeWidthPx(width, height, config);
    var mapUri;
    var radiusPx = config.radius + 'px';

    element.style.borderRadius = radiusPx;
    element.style.setProperty('--site-glass-radius', radiusPx);

    if (parts.filterNode && checkSvgBackdropSupport() && element.getAttribute('data-chromatic') !== 'false') {
      mapUri = 'data:image/svg+xml,' + encodeURIComponent(
        buildDisplacementSvg(width, height, config)
      );
      parts.filterNode.innerHTML = buildFilterMarkup(parts.filterId, mapUri, config);
    }

    applyBackdrop(element, parts, config, { edgeWidthPx: edgeWidthPx });
  }

  function mount(element) {
    if (!element || element.getAttribute('data-site-glass-mounted') === 'true') return;

    element.classList.add('site-glass');
    render(element);

    if (typeof ResizeObserver !== 'undefined' && !mounted.has(element)) {
      var observer = new ResizeObserver(function () {
        render(element);
      });
      observer.observe(element);
      mounted.set(element, observer);
    }

    element.setAttribute('data-site-glass-mounted', 'true');
  }

  function unmount(element) {
    var observer = mounted.get(element);
    if (observer) {
      observer.disconnect();
      mounted.delete(element);
    }
    if (!element) return;

    element.classList.remove('site-glass', 'site-glass--chromatic', 'site-glass--dark');
    element.removeAttribute('data-site-glass-mounted');

    Array.prototype.forEach.call(
      element.querySelectorAll('.site-glass-layers, .site-glass-filter-defs'),
      function (node) {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
    );

    element.style.removeProperty('--site-glass-frost');
    element.style.removeProperty('--site-glass-radius');
    if (!element.getAttribute('data-site-glass-nav')) {
      element.style.removeProperty('border-radius');
    }
  }

  function setup(root) {
    var scope = root || document;
    var elements = scope.querySelectorAll('[data-site-glass]');
    var i;
    for (i = 0; i < elements.length; i++) {
      mount(elements[i]);
    }
  }

  window.SiteGlass = {
    mount: mount,
    unmount: unmount,
    setup: setup,
    render: render,
    supportsChromatic: function () {
      return checkSvgBackdropSupport();
    },
    defaults: DEFAULTS
  };
}(window, document));
