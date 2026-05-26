(function (window, document) {
  'use strict';

  var Site = window.Site;
  if (!Site) return;

  function initTimeline() {
    var ranges = Site.toArray(document.querySelectorAll('.timeline-range'));
    if (!ranges.length) return;

    var timelineStart = new Date('2021-01-01');
    var timelineEnd = new Date();
    var total = timelineEnd - timelineStart;
    if (total <= 0) return;

    function parseDateString(value) {
      if (!value) return null;
      if (value.toLowerCase() === 'now') return timelineEnd;
      return new Date(value);
    }

    function mapPctLinearToNonLinear(pct) {
      var clamped = Math.max(0, Math.min(1, pct / 100));
      return Math.pow(clamped, 1.6) * 100;
    }

    ranges.forEach(function (element) {
      var startValue = element.getAttribute('data-start');
      var endValue = element.getAttribute('data-end');
      if (!startValue) return;

      var startDate = parseDateString(startValue);
      var endDate = parseDateString(endValue) || timelineEnd;
      if (!(startDate instanceof Date) || isNaN(startDate.getTime())) return;
      if (!(endDate instanceof Date) || isNaN(endDate.getTime())) endDate = timelineEnd;
      if (endDate < startDate) endDate = startDate;

      var left = mapPctLinearToNonLinear(((startDate - timelineStart) / total) * 100);
      var right = mapPctLinearToNonLinear(((endDate - timelineStart) / total) * 100);
      var width = Math.max(0.5, right - left);

      if (typeof endValue === 'string' && endValue.toLowerCase() === 'now') {
        width = Math.max(12, width);
        element.style.zIndex = 2;
      }

      if (left + width > 100) {
        left = Math.max(0, 100 - width);
      }

      element.style.left = Math.max(0, left) + '%';
      element.style.width = width + '%';
    });

    var axis = document.querySelector('.timeline-axis');
    if (axis) {
      var labels = axis.querySelectorAll('span');
      if (labels.length === 2) {
        labels[0].style.left = '0%';
        labels[0].style.transform = 'translateX(0)';
        labels[1].style.left = 'auto';
        labels[1].style.right = '0';
        labels[1].style.transform = 'translateX(0)';
      } else if (labels.length >= 3) {
        var midDate = new Date('2024-01-01');
        var midPct = mapPctLinearToNonLinear(((midDate - timelineStart) / total) * 100);
        labels[0].style.left = '0%';
        labels[0].style.transform = 'translateX(0)';
        labels[1].style.left = Math.max(0, Math.min(100, midPct)) + '%';
        labels[1].style.transform = 'translateX(-50%)';
        labels[2].style.left = '100%';
        labels[2].style.transform = 'translateX(-100%)';
      }
    }

    var tooltip = document.createElement('div');
    tooltip.className = 'timeline-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '9999';
    tooltip.style.padding = '8px 10px';
    tooltip.style.background = 'rgba(0, 0, 0, 0.85)';
    tooltip.style.color = '#fff';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '12px';
    tooltip.style.maxWidth = '320px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.boxSizing = 'border-box';
    document.body.appendChild(tooltip);

    function positionTooltip(event) {
      var pad = 12;
      var x = event.clientX + pad;
      var y = event.clientY + pad;
      var rect = tooltip.getBoundingClientRect();
      var viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      var viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

      if (x + rect.width + 8 > viewportWidth) {
        x = Math.max(pad, event.clientX - rect.width - pad);
      }

      if (y + rect.height + 8 > viewportHeight) {
        y = Math.max(pad, event.clientY - rect.height - pad);
      }

      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    }

    function showTooltip(text, event) {
      if (!text) return;
      tooltip.textContent = text;
      tooltip.style.display = 'block';
      positionTooltip(event);
    }

    ranges.forEach(function (element) {
      element.addEventListener('mouseenter', function (event) {
        var text = element.getAttribute('data-desc') || element.getAttribute('title') || '';
        showTooltip(text, event);
      });
      element.addEventListener('mousemove', function (event) {
        if (tooltip.style.display !== 'none') positionTooltip(event);
      });
      element.addEventListener('mouseleave', function () {
        tooltip.style.display = 'none';
      });
    });
  }

  Site.initTimeline = initTimeline;
}(window, document));
