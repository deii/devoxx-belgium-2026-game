// Best result, kept in this browser only. Storage can be missing or blocked (private windows,
// embedded previews), so every access is guarded and the game works the same without it.

const STORAGE_KEY = 'heisenbug-keynote-in-10.best-clock-left';

/** Seconds of keynote clock left in the best winning run, or null. */
export function loadBestClockLeft() {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Stores a winning run if it beats the previous best; returns whether it did. */
export function recordWin(clockLeft) {
  const previousBest = loadBestClockLeft();
  const isNewBest = previousBest === null || clockLeft > previousBest;
  if (isNewBest) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(clockLeft));
    } catch {
      // Not persisted; the end screen still shows this run.
    }
  }
  return { isNewBest, previousBest };
}
