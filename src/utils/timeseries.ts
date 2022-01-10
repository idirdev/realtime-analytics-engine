import { TimeWindowSize } from '../types';

const WINDOW_MS: Record<TimeWindowSize, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '6h': 21_600_000,
  '1d': 86_400_000,
};

export function bucketTimestamp(timestamp: number, windowSize: TimeWindowSize): number {
  const ms = WINDOW_MS[windowSize];
  return Math.floor(timestamp / ms) * ms;
}

export function interpolateGaps(
  points: { timestamp: number; value: number }[],
  intervalMs: number
): { timestamp: number; value: number }[] {
  if (points.length < 2) return [...points];

  const result: { timestamp: number; value: number }[] = [];
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sorted.length - 1; i++) {
    result.push(sorted[i]);
    const gap = sorted[i + 1].timestamp - sorted[i].timestamp;

    if (gap > intervalMs * 1.5) {
      const steps = Math.floor(gap / intervalMs);
      const valueDiff = sorted[i + 1].value - sorted[i].value;

      for (let s = 1; s < steps; s++) {
        result.push({
          timestamp: sorted[i].timestamp + s * intervalMs,
          value: sorted[i].value + (valueDiff * s) / steps,
        });
      }
    }
  }
  result.push(sorted[sorted.length - 1]);
  return result;
}

export function movingAverage(values: number[], windowSize: number): number[] {
  if (windowSize <= 0 || values.length === 0) return [];
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    result.push(window.reduce((a, b) => a + b, 0) / window.length);
  }

  return result;
}

export function calculateRate(
  points: { timestamp: number; value: number }[]
): { timestamp: number; rate: number }[] {
  if (points.length < 2) return [];

  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const rates: { timestamp: number; rate: number }[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const dt = (sorted[i].timestamp - sorted[i - 1].timestamp) / 1000; // seconds
    const dv = sorted[i].value - sorted[i - 1].value;
    rates.push({ timestamp: sorted[i].timestamp, rate: dt > 0 ? dv / dt : 0 });
  }

  return rates;
}
