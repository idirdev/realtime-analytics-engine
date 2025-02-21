import { describe, it, expect } from 'vitest';
import { Aggregator } from '../src/Aggregator';

describe('Aggregator', () => {
  const now = Date.now();

  it('aggregates count', () => {
    const agg = new Aggregator('1m');
    agg.add({ name: 'pageview', value: 1, timestamp: now, dimensions: {} });
    agg.add({ name: 'pageview', value: 1, timestamp: now, dimensions: {} });
    const results = agg.forceFlushAll();
    const pv = results.find((r) => r.name === 'pageview');
    expect(pv).toBeDefined();
    expect(pv!.count).toBe(2);
  });

  it('aggregates sum', () => {
    const agg = new Aggregator('1m');
    agg.add({ name: 'response_time', value: 120, timestamp: now, dimensions: {} });
    agg.add({ name: 'response_time', value: 80, timestamp: now, dimensions: {} });
    const results = agg.forceFlushAll();
    const rt = results.find((r) => r.name === 'response_time');
    expect(rt).toBeDefined();
    expect(rt!.sum).toBe(200);
  });

  it('calculates average', () => {
    const agg = new Aggregator('1m');
    agg.add({ name: 'latency', value: 100, timestamp: now, dimensions: {} });
    agg.add({ name: 'latency', value: 200, timestamp: now, dimensions: {} });
    agg.add({ name: 'latency', value: 300, timestamp: now, dimensions: {} });
    const results = agg.forceFlushAll();
    const lat = results.find((r) => r.name === 'latency');
    expect(lat).toBeDefined();
    expect(lat!.avg).toBe(200);
  });

  it('returns empty for no metrics', () => {
    const agg = new Aggregator('1m');
    const results = agg.forceFlushAll();
    expect(results).toHaveLength(0);
  });

  it('tracks min and max', () => {
    const agg = new Aggregator('1m');
    agg.add({ name: 'cpu', value: 45, timestamp: now, dimensions: {} });
    agg.add({ name: 'cpu', value: 92, timestamp: now, dimensions: {} });
    agg.add({ name: 'cpu', value: 67, timestamp: now, dimensions: {} });
    const results = agg.forceFlushAll();
    const cpu = results.find((r) => r.name === 'cpu');
    expect(cpu).toBeDefined();
    expect(cpu!.min).toBe(45);
    expect(cpu!.max).toBe(92);
  });
});
