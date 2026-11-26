export function startCountdown(clock) {
  const deadline = Date.parse(clock.dateTime);
  const pad = value => String(value).padStart(2, '0');

  let timer;
  function update() {
    const remaining = Math.max(0, deadline - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds / 3600) % 24;
    const minutes = Math.floor(seconds / 60) % 60;
    clock.textContent = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds % 60)}s`;

    if (remaining > 0) timer = setTimeout(update, remaining % 1000 || 1000);
  }

  update();
  return () => clearTimeout(timer);
}

export const homeClock = `<time class="site-countdown" role="timer" datetime="2027-02-14T11:11:00-08:00" aria-label="Countdown to February 14, 2027 at 11:11 a.m. Pacific Standard Time" title="February 14, 2027 at 11:11 a.m. PST">Feb 14, 2027 · 11:11 AM PST</time>`;
