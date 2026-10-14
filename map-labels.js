// The paper becomes pure white at this threshold in #map-paper-white.
export function isMapPaper([red, green, blue, alpha]) {
  return alpha === 0 || (red >= 243 && green >= 243 && blue >= 243);
}

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
  const map = page.querySelector('.map-image');
  const canvas = page.querySelector('.map-canvas');
  const labels = page.querySelector('.map-labels');
  const controller = new AbortController();
  const on = (target, type, callback) => target.addEventListener(type, callback, { signal: controller.signal });
  let pixels;
  let disposed = false;
  function readMap() {
    if (!map.naturalWidth) return;
    const sample = document.createElement('canvas');
    sample.width = map.naturalWidth;
    sample.height = map.naturalHeight;
    pixels = sample.getContext('2d', { willReadFrequently: true });
    pixels.drawImage(map, 0, 0);
  }
  function positionLabels() {
    if (!visible || disposed) return;
    const bounds = canvas.getBoundingClientRect();
    labels.querySelectorAll('.map-label').forEach(label => {
      const width = label.offsetWidth;
      const anchor = Number(label.dataset.x) / 1024 * bounds.width;
      const preferred = label.dataset.side === 'left' ? anchor - width - 8 : anchor + 8;
      // Keep names on screen even when their preferred side is outside the map.
      const left = Math.max(8 - bounds.left, Math.min(innerWidth - 8 - bounds.left - width, preferred));
      label.style.left = `${left}px`;
    });
  }
  function update() {
    labels.hidden = !visible;
    background.setAttribute('aria-pressed', String(visible));
    positionLabels();
  }
  function toggle(event) {
    if (event?.defaultPrevented) return;
    visible = !visible;
    update();
    onChange(visible);
  }
  on(background, 'click', toggle);
  on(map, 'load', readMap);
  on(map, 'click', event => {
    if (event.defaultPrevented || !pixels) return;
    const bounds = map.getBoundingClientRect();
    const x = Math.max(0, Math.min(map.naturalWidth - 1, Math.floor((event.clientX - bounds.left) / bounds.width * map.naturalWidth)));
    const y = Math.max(0, Math.min(map.naturalHeight - 1, Math.floor((event.clientY - bounds.top) / bounds.height * map.naturalHeight)));
    if (isMapPaper(pixels.getImageData(x, y, 1, 1).data)) toggle(event);
  });
  const observer = new ResizeObserver(positionLabels);
  observer.observe(canvas);
  document.fonts.ready.then(() => { if (!disposed) positionLabels(); });
  if (map.complete) readMap();
  update();
  return () => { disposed = true; controller.abort(); observer.disconnect(); pixels = null; };
}
