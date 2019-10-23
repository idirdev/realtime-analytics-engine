import { describe, it, expect } from 'vitest';
import { Aggregator } from '../src/Aggregator';

describe('Aggregator', () => {
  it('aggregates count', () => {
    const agg = new Aggregator({ windowMs: 60000 });
    agg.add({ metric: 'pageview', value: 1, timestamp: Date.now() });
    agg.add({ metric: 'pageview', value: 1, timestamp: Date.now() });
    expect(agg.getCount('pageview')).toBe(2);
  });

  it('aggregates sum', () => {
    const agg = new Aggregator({ windowMs: 60000 });
    agg.add({ metric: 'response_time', value: 120, timestamp: Date.now() });
    agg.add({ metric: 'response_time', value: 80, timestamp: Date.now() });
    expect(agg.getSum('response_time')).toBe(200);
  });

  it('calculates average', () => {
    const agg = new Aggregator({ windowMs: 60000 });
    agg.add({ metric: 'latency', value: 100, timestamp: Date.now() });
    agg.add({ metric: 'latency', value: 200, timestamp: Date.now() });
    agg.add({ metric: 'latency', value: 300, timestamp: Date.now() });
    expect(agg.getAverage('latency')).toBe(200);
  });

  it('returns 0 for unknown metric', () => {
    const agg = new Aggregator({ windowMs: 60000 });
    expect(agg.getCount('unknown')).toBe(0);
    expect(agg.getSum('unknown')).toBe(0);
  });

  it('tracks min and max', () => {
    const agg = new Aggregator({ windowMs: 60000 });
    agg.add({ metric: 'cpu', value: 45, timestamp: Date.now() });
    agg.add({ metric: 'cpu', value: 92, timestamp: Date.now() });
    agg.add({ metric: 'cpu', value: 67, timestamp: Date.now() });
    expect(agg.getMin('cpu')).toBe(45);
    expect(agg.getMax('cpu')).toBe(92);
  });
});
