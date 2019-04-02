import { Metric, AggregatedMetric, QueryOptions } from './types';

interface StoredPoint {
  timestamp: number;
  value: number;
  dimensions: Record<string, string>;
}

export class TimeSeriesStorage {
  private data: Map<string, StoredPoint[]> = new Map();
  private retentionMs: number;
  private maxPointsPerMetric: number;

  constructor(options: { retentionMs?: number; maxPointsPerMetric?: number } = {}) {
    this.retentionMs = options.retentionMs ?? 7 * 24 * 60 * 60 * 1000; // 7 days
    this.maxPointsPerMetric = options.maxPointsPerMetric ?? 100_000;
  }

  store(metric: Metric): void {
    const points = this.data.get(metric.name) ?? [];
    points.push({ timestamp: metric.timestamp, value: metric.value, dimensions: metric.dimensions });
    this.data.set(metric.name, points);

    if (points.length > this.maxPointsPerMetric) {
      this.data.set(metric.name, points.slice(-this.maxPointsPerMetric));
    }
  }

  storeAggregated(aggregated: AggregatedMetric): void {
    this.store({
      name: `${aggregated.name}.avg`,
      value: aggregated.avg,
      timestamp: aggregated.windowEnd,
      dimensions: aggregated.dimensions,
    });
    this.store({
      name: `${aggregated.name}.count`,
      value: aggregated.count,
      timestamp: aggregated.windowEnd,
      dimensions: aggregated.dimensions,
    });
  }

  query(options: QueryOptions): StoredPoint[] {
    const points = this.data.get(options.metric) ?? [];
    let filtered = points.filter((p) => p.timestamp >= options.from && p.timestamp <= options.to);

    if (options.groupBy && options.groupBy.length > 0) {
      filtered = filtered.filter((p) =>
        options.groupBy!.every((key) => key in p.dimensions)
      );
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  downsample(metricName: string, bucketMs: number): StoredPoint[] {
    const points = this.data.get(metricName) ?? [];
    if (points.length === 0) return [];

    const buckets = new Map<number, number[]>();
    for (const point of points) {
      const bucketKey = Math.floor(point.timestamp / bucketMs) * bucketMs;
      const bucket = buckets.get(bucketKey) ?? [];
      bucket.push(point.value);
      buckets.set(bucketKey, bucket);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, values]) => ({
        timestamp: ts,
        value: values.reduce((a, b) => a + b, 0) / values.length,
        dimensions: {},
      }));
  }

  compact(olderThanMs: number, bucketMs: number): void {
    const cutoff = Date.now() - olderThanMs;
    for (const [name, points] of this.data.entries()) {
      const recent = points.filter((p) => p.timestamp >= cutoff);
      const old = points.filter((p) => p.timestamp < cutoff);
      const downsampled = this.downsamplePoints(old, bucketMs);
      this.data.set(name, [...downsampled, ...recent]);
    }
  }

  private downsamplePoints(points: StoredPoint[], bucketMs: number): StoredPoint[] {
    const buckets = new Map<number, StoredPoint[]>();
    for (const p of points) {
      const key = Math.floor(p.timestamp / bucketMs) * bucketMs;
      const bucket = buckets.get(key) ?? [];
      bucket.push(p);
      buckets.set(key, bucket);
    }
    return Array.from(buckets.entries()).map(([ts, pts]) => ({
      timestamp: ts,
      value: pts.reduce((a, b) => a + b.value, 0) / pts.length,
      dimensions: pts[0]?.dimensions ?? {},
    }));
  }

  enforceRetention(): number {
    const cutoff = Date.now() - this.retentionMs;
    let removed = 0;
    for (const [name, points] of this.data.entries()) {
      const before = points.length;
      const retained = points.filter((p) => p.timestamp >= cutoff);
      removed += before - retained.length;
      this.data.set(name, retained);
    }
    return removed;
  }

  export(): Record<string, StoredPoint[]> {
    const result: Record<string, StoredPoint[]> = {};
    for (const [name, points] of this.data.entries()) {
      result[name] = [...points];
    }
    return result;
  }

  getMetricNames(): string[] {
    return Array.from(this.data.keys());
  }

  getTotalPoints(): number {
    let total = 0;
    for (const points of this.data.values()) total += points.length;
    return total;
  }
}
