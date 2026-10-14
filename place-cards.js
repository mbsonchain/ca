import { setupCardDismissal } from './map-labels.js';

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function setupCards(main, getContent, navigate) {
  const card = document.createElement('aside');
  card.id = 'place-card';
  card.className = 'place-card';
  card.setAttribute('aria-label', 'Location preview');
  card.hidden = true;
  main.append(card);
  let active = null;
  let pinned = false;
  let closeTimer;
  let lastPointer = '';
  let suppressedFocus = false;
  const controller = new AbortController();
  const on = (target, type, callback) => target.addEventListener(type, callback, { signal: controller.signal });
  const cancelClose = () => clearTimeout(closeTimer);
  function close({ restoreFocus = false } = {}) {
    cancelClose();
    const old = active;
    active?.setAttribute('aria-expanded', 'false');
    card.hidden = true;
    active = null;
    pinned = false;
    if (restoreFocus && old) {
      suppressedFocus = true;
      old.focus({ preventScroll: true });
      suppressedFocus = false;
    }
  }
  function scheduleClose() {
    cancelClose();
    if (pinned) return;
    closeTimer = setTimeout(() => {
      if (!pinned && !card.contains(document.activeElement) && document.activeElement !== active) close();
    }, 220);
  }
  function position() {
    if (!active || card.hidden) return;
    const r = active.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const margin = 12;
    let left = r.right + 9;
    if (left + w > innerWidth - margin) left = r.left - w - 9;
    if (left < margin) left = Math.max(margin, Math.min(innerWidth - w - margin, r.left + r.width / 2 - w / 2));
    let top = r.top + r.height / 2 - h / 2;
    const footerTop = document.querySelector('.site-footer').getBoundingClientRect().top;
    if (innerWidth < 641) top = r.bottom + 8;
    if (top + h > footerTop - 8) top = r.top - h - 8;
    card.style.left = `${left}px`;
    card.style.top = `${Math.max(margin, Math.min(innerHeight - h - margin, top))}px`;
  }
  function show(button, pin = false) {
    cancelClose();
    pinned = active === button ? pinned || pin : pin;
    if (active !== button) {
      active?.setAttribute('aria-expanded', 'false');
      active = button;
      const item = getContent(button);
      card.innerHTML = `<button class="card-close" aria-label="Close preview">×</button><span class="eyebrow">${escape(item.eyebrow)}</span><h2>${escape(item.title)}</h2>${item.intro ? `<p>${escape(item.intro)}</p>` : ''}${item.url ? `<a href="${item.url}">${item.link}</a>` : ''}`;
      card.querySelector('.card-close').addEventListener('click', () => close({ restoreFocus: true }));
      // Put the preview immediately after the active marker for keyboard navigation.
      button.after(card);
    }
    button.setAttribute('aria-expanded', 'true');
    card.hidden = false;
    position();
  }
  main.querySelectorAll('.hotspot').forEach(button => {
    on(button, 'pointerenter', event => { if (event.pointerType === 'mouse') show(button); });
    on(button, 'pointerleave', event => { if (event.pointerType === 'mouse') scheduleClose(); });
    on(button, 'pointerdown', event => { lastPointer = event.pointerType; });
    on(button, 'focus', () => { if (!suppressedFocus) show(button); });
    on(button, 'blur', scheduleClose);
    on(button, 'click', event => {
      const item = getContent(button);
      if (lastPointer === 'mouse' && event.detail > 0 && item.url) navigate(item.url);
      else {
        show(button, true);
        if (event.detail === 0) (card.querySelector('a') || card.querySelector('button')).focus();
      }
      lastPointer = '';
    });
  });
  on(card, 'pointerenter', cancelClose);
  on(card, 'pointerleave', event => { if (event.pointerType === 'mouse') scheduleClose(); });
  on(card, 'focusin', cancelClose);
  on(card, 'focusout', scheduleClose);
  const cleanDismissal = setupCardDismissal(card, close);
  on(document, 'keydown', event => { if (event.key === 'Escape' && !card.hidden) { event.preventDefault(); close({ restoreFocus: card.contains(document.activeElement) }); } });
  on(window, 'resize', position);
  on(window, 'scroll', position);
  return () => { cancelClose(); cleanDismissal(); controller.abort(); card.remove(); };
}
