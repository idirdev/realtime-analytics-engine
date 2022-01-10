import { TimeSeriesStorage } from './Storage';
import { QueryOptions } from './types';

interface TrendResult {
  current: number;
  previous: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
}

interface HeatmapCell {
  x: number;
  y: string;
  value: number;
}

export class DashboardQuery {
  constructor(private storage: TimeSeriesStorage) {}

  getMetric(name: string, from: number, to: number): { timestamp: number; value: number }[] {
    const points = this.storage.query({ metric: name, from, to });
    return points.map((p) => ({ timestamp: p.timestamp, value: p.value }));
  }

  getTopN(metricPrefix: string, n: number, from: number, to: number): { name: string; total: number }[] {
    const metricNames = this.storage.getMetricNames().filter((m) => m.startsWith(metricPrefix));
    const totals = metricNames.map((name) => {
      const points = this.storage.query({ metric: name, from, to });
      const total = points.reduce((sum, p) => sum + p.value, 0);
      return { name, total };
    });
    return totals.sort((a, b) => b.total - a.total).slice(0, n);
  }

  getTrend(metric: string, periodMs: number): TrendResult {
    const now = Date.now();
    const currentPoints = this.storage.query({ metric, from: now - periodMs, to: now });
    const previousPoints = this.storage.query({ metric, from: now - 2 * periodMs, to: now - periodMs });

    const currentAvg = this.average(currentPoints.map((p) => p.value));
    const previousAvg = this.average(previousPoints.map((p) => p.value));

    const changePercent = previousAvg !== 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      current: currentAvg,
      previous: previousAvg,
      changePercent,
      direction: changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'flat',
    };
  }

  comparePeriods(
    metric: string,
    period1: { from: number; to: number },
    period2: { from: number; to: number }
  ): { period1Avg: number; period2Avg: number; diffPercent: number } {
    const p1 = this.storage.query({ metric, ...period1 });
    const p2 = this.storage.query({ metric, ...period2 });

    const avg1 = this.average(p1.map((p) => p.value));
    const avg2 = this.average(p2.map((p) => p.value));
    const diffPercent = avg1 !== 0 ? ((avg2 - avg1) / avg1) * 100 : 0;

    return { period1Avg: avg1, period2Avg: avg2, diffPercent };
  }

  getHeatmap(metric: string, from: number, to: number, bucketMs: number): HeatmapCell[] {
    const points = this.storage.query({ metric, from, to });
    const cells: HeatmapCell[] = [];

    for (const point of points) {
      const bucket = Math.floor(point.timestamp / bucketMs) * bucketMs;
      const dimLabel = Object.values(point.dimensions).join(':') || 'default';
      cells.push({ x: bucket, y: dimLabel, value: point.value });
    }

    return cells;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
