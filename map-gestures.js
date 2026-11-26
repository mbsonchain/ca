// The home link can become a town or a control under the same finger or cursor.
// Wait for fresh input on the guide before handling the tail of that activation.
function waitForGuideInput(root, { clientX, clientY, detail }) {
  const controller = new AbortController();
  const capture = { capture: true, signal: controller.signal };
  const release = () => controller.abort();
  const block = event => {
    if (!event.target.closest?.('.guide-page')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  root.addEventListener('focus', block, capture);
  root.addEventListener('click', event => {
    if (!event.target.closest?.('.guide-page')) return;
    if (event.detail === 0) release(); // Keyboard and assistive-technology activation.
    else block(event);
  }, capture);
  root.addEventListener('pointermove', event => {
    const moved = detail ? Math.hypot(event.clientX - clientX, event.clientY - clientY) > 3
      : event.movementX || event.movementY;
    if (moved && event.pointerType === 'mouse' && !event.sourceCapabilities?.firesTouchEvents) release();
    else block(event);
  }, capture);
  root.addEventListener('pointerdown', release, capture);
  root.addEventListener('keydown', release, capture);
  root.defaultView?.addEventListener('pagehide', release, capture);
}

// The listener stays mounted across the home-to-guide transition so a second
// tap on the same patch of glass can't zoom the newly opened guide.
export function lockMapGestures(root) {
  const options = { capture: true, passive: false };
  const surface = '.home, .guide-background, .map-image, .hotspot, .map-crop';
  const onMap = target => Boolean(target?.closest?.(surface));
  let lastTap;
  let mapTouch = false;

  root.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.target.closest?.('a[href="/travel-guide"]') && root.querySelector('.home')) waitForGuideInput(root, event);
  }, true);

  root.addEventListener('touchstart', event => {
    if (event.touches.length === 1) mapTouch = onMap(event.target);
    if (mapTouch && event.touches.length > 1) event.preventDefault();
  }, options);
  root.addEventListener('touchmove', event => {
    if (mapTouch && event.touches.length > 1) event.preventDefault();
  }, options);
  root.addEventListener('touchend', event => {
    if (!mapTouch || event.touches.length) return;
    mapTouch = false;
    const point = event.changedTouches[0];
    if (!point) return;
    if (lastTap && event.timeStamp - lastTap.time < 400 &&
        Math.hypot(point.clientX - lastTap.x, point.clientY - lastTap.y) < 24) {
      event.preventDefault();
    }
    lastTap = { time: event.timeStamp, x: point.clientX, y: point.clientY };
  }, options);
  root.addEventListener('touchcancel', () => { mapTouch = false; lastTap = undefined; }, options);
  for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
    root.addEventListener(type, event => {
      if (mapTouch || onMap(event.target)) event.preventDefault();
    }, options);
  }
  root.addEventListener('wheel', event => {
    if ((event.ctrlKey || event.metaKey) && onMap(event.target)) event.preventDefault();
  }, options);
}
