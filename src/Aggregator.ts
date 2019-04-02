import { Metric, AggregatedMetric, TimeWindowSize } from './types';

const WINDOW_MS: Record<TimeWindowSize, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '6h': 21_600_000,
  '1d': 86_400_000,
};

interface WindowBucket {
  start: number;
  end: number;
  values: number[];
  dimensions: Record<string, string>;
}

export class Aggregator {
  private buckets: Map<string, WindowBucket> = new Map();
  private windowSize: TimeWindowSize;
  private onFlush?: (aggregated: AggregatedMetric) => void;

  constructor(windowSize: TimeWindowSize, onFlush?: (aggregated: AggregatedMetric) => void) {
    this.windowSize = windowSize;
    this.onFlush = onFlush;
  }

  add(metric: Metric): void {
    const windowMs = WINDOW_MS[this.windowSize];
    const windowStart = Math.floor(metric.timestamp / windowMs) * windowMs;
    const windowEnd = windowStart + windowMs;
    const dimKey = this.dimensionKey(metric.dimensions);
    const bucketKey = `${metric.name}:${windowStart}:${dimKey}`;

    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = { start: windowStart, end: windowEnd, values: [], dimensions: metric.dimensions };
      this.buckets.set(bucketKey, bucket);
    }
    bucket.values.push(metric.value);
  }

  flushExpired(now: number = Date.now()): AggregatedMetric[] {
    const results: AggregatedMetric[] = [];
    const windowMs = WINDOW_MS[this.windowSize];

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.end + windowMs <= now) {
        const metricName = key.split(':')[0];
        const aggregated = this.computeAggregate(metricName, bucket);
        results.push(aggregated);
        this.buckets.delete(key);
        if (this.onFlush) this.onFlush(aggregated);
      }
    }
    return results;
  }

  forceFlushAll(): AggregatedMetric[] {
    const results: AggregatedMetric[] = [];
    for (const [key, bucket] of this.buckets.entries()) {
      const metricName = key.split(':')[0];
      results.push(this.computeAggregate(metricName, bucket));
    }
    this.buckets.clear();
    return results;
  }

  private computeAggregate(name: string, bucket: WindowBucket): AggregatedMetric {
    const sorted = [...bucket.values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, v) => acc + v, 0);

    return {
      name,
      windowStart: bucket.start,
      windowEnd: bucket.end,
      count,
      sum,
      avg: count > 0 ? sum / count : 0,
      min: count > 0 ? sorted[0] : 0,
      max: count > 0 ? sorted[count - 1] : 0,
      percentiles: {
        50: this.percentile(sorted, 50),
        90: this.percentile(sorted, 90),
        95: this.percentile(sorted, 95),
        99: this.percentile(sorted, 99),
      },
      dimensions: bucket.dimensions,
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  private dimensionKey(dimensions: Record<string, string>): string {
    return Object.entries(dimensions)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('|');
  }

  getBucketCount(): number {
    return this.buckets.size;
  }
}
