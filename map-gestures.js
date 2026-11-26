// The listener stays mounted across the home-to-guide transition so a second
// tap on the same patch of glass can't zoom the newly opened guide.
export function lockMapGestures(root) {
  const options = { capture: true, passive: false };
  const surface = '.home, .guide-background, .map-image, .hotspot, .map-crop';
  const onMap = target => Boolean(target?.closest?.(surface));
  let lastTap;
  let mapTouch = false;

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
