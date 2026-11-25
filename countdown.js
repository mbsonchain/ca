export function startCountdown(clock) {
  const deadline = Date.parse(clock.dateTime);
  const pad = value => String(value).padStart(2, '0');

  function update() {
    const remaining = Math.max(0, deadline - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds / 3600) % 24;
    const minutes = Math.floor(seconds / 60) % 60;
    clock.textContent = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds % 60)}s`;

    if (remaining > 0) setTimeout(update, remaining % 1000 || 1000);
  }

  update();
}
