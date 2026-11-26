// The paper becomes pure white at this threshold in #map-paper-white.
export function isMapPaper([red, green, blue, alpha]) {
  return alpha === 0 || (red >= 243 && green >= 243 && blue >= 243);
}

// Pixel adjustments on top of each printed town's standard label anchor.
const offsets = {
  orangepoint: { x: 13, y: -5 },
  freetown: { x: -3 },
  santamore: { x: -20 },
  'formal-city': { x: -4 },
  goldpoint: { x: -4 },
  laketown: { x: -2, y: -6 },
  clifftown: { y: -3 },
  hollywood: { side: 'left' },
  sfida: { side: 'above', y: -11 },
};

export function setupCardDismissal(card, close, root = document) {
  const controller = new AbortController();
  const outside = target => !card.contains(target) && !target.closest('.hotspot');
  let startedOutsideCard = false;
  root.addEventListener('pointerdown', event => {
    startedOutsideCard = !card.hidden && outside(event.target);
  }, { capture: true, signal: controller.signal });
  root.addEventListener('pointercancel', () => { startedOutsideCard = false; }, { signal: controller.signal });
  root.addEventListener('click', event => {
    // Keep the card in place until the tap completes, then dismiss it before
    // the same activation can reach the background's label toggle.
    const dismissing = startedOutsideCard || !card.hidden;
    startedOutsideCard = false;
    if (!dismissing || !outside(event.target)) return;
    if (!card.hidden) close();
    if (event.target.closest('.guide-background, .map-image')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { capture: true, signal: controller.signal });
  return () => controller.abort();
}

export function setupMapLabels(page, { visible = false, onChange = () => {} } = {}) {
  const background = page.querySelector('.guide-background');
  const canvas = page.querySelector('.map-canvas');
  const labels = page.querySelector('.map-labels');
  const controller = new AbortController();
  const on = (target, type, callback) => target.addEventListener(type, callback, { signal: controller.signal });
  const samples = new WeakMap();
  let disposed = false;
  let directionsOpen = false;
  function pixelsFor(map) {
    if (samples.has(map)) return samples.get(map);
    const sample = document.createElement('canvas');
    sample.width = map.naturalWidth;
    sample.height = map.naturalHeight;
    const pixels = sample.getContext('2d', { willReadFrequently: true });
    pixels.drawImage(map, 0, 0);
    samples.set(map, pixels);
    return pixels;
  }
  function positionLabels() {
    if (labels.hidden || disposed) return;
    const bounds = canvas.getBoundingClientRect();
    labels.querySelectorAll('.map-label').forEach(label => {
      const width = label.offsetWidth;
      const anchor = Number(label.dataset.x) / 1024 * bounds.width;
      const offset = offsets[label.dataset.label] || {};
      const side = offset.side || label.dataset.side;
      const positions = { right: anchor + 8, left: anchor - width - 8, below: anchor - width / 2, above: anchor - width / 2 };
      const preferred = positions[side] + (offset.x || 0);
      if (offset.y) label.style.marginTop = offset.y + 'px';
      if (side === 'above') label.style.transform = 'translateY(-100%)';
      // Keep names on screen even when their preferred side is outside the map.
      const rightMargin = label.dataset.label === 'orangepoint' ? 3 : 8;
      const left = Math.max(8 - bounds.left, Math.min(innerWidth - rightMargin - bounds.left - width, preferred));
      label.style.left = `${left}px`;
    });
  }
  function update() {
    labels.hidden = !(visible || directionsOpen);
    background.setAttribute('aria-pressed', String(!labels.hidden));
    positionLabels();
  }
  function toggle(event) {
    if (event?.defaultPrevented || directionsOpen) return;
    visible = !visible;
    update();
    onChange(visible);
  }
  on(background, 'click', toggle);
  on(page, 'directions-open', event => { directionsOpen = event.detail; update(); });
  on(canvas, 'click', event => {
    const map = event.target.closest('.map-image');
    if (event.defaultPrevented || directionsOpen || !map?.naturalWidth) return;
    const bounds = map.getBoundingClientRect();
    const x = Math.max(0, Math.min(map.naturalWidth - 1, Math.floor((event.clientX - bounds.left) / bounds.width * map.naturalWidth)));
    const y = Math.max(0, Math.min(map.naturalHeight - 1, Math.floor((event.clientY - bounds.top) / bounds.height * map.naturalHeight)));
    if (isMapPaper(pixelsFor(map).getImageData(x, y, 1, 1).data)) toggle(event);
  });
  const observer = new ResizeObserver(positionLabels);
  observer.observe(canvas);
  document.fonts.ready.then(() => { if (!disposed) positionLabels(); });
  update();
  return () => { disposed = true; controller.abort(); observer.disconnect(); };
}
