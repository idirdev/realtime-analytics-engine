import { describe, it, expect, vi } from 'vitest';
import { AlertEngine } from '../src/AlertEngine';
import { AlertRule, AggregatedMetric } from '../src/types';

function makeMetric(name: string, avg: number): AggregatedMetric {
  return {
    name,
    windowStart: Date.now() - 60000,
    windowEnd: Date.now(),
    count: 1,
    sum: avg,
    avg,
    min: avg,
    max: avg,
    percentiles: { 50: avg, 90: avg, 95: avg, 99: avg },
    dimensions: {},
  };
}

describe('AlertEngine', () => {
  it('fires alert when threshold exceeded', () => {
    const listener = vi.fn();
    const engine = new AlertEngine();
    engine.onAlert(listener);
    engine.addRule({
      id: 'r1',
      name: 'High CPU',
      metric: 'cpu',
      condition: { type: 'threshold', operator: 'gt', value: 90 },
      actions: [{ type: 'log', config: {} }],
      cooldownMs: 0,
      enabled: true,
    });
    engine.evaluate(makeMetric('cpu', 95));
    expect(listener).toHaveBeenCalled();
  });

  it('does not fire when below threshold', () => {
    const listener = vi.fn();
    const engine = new AlertEngine();
    engine.onAlert(listener);
    engine.addRule({
      id: 'r2',
      name: 'High CPU',
      metric: 'cpu',
      condition: { type: 'threshold', operator: 'gt', value: 90 },
      actions: [{ type: 'log', config: {} }],
      cooldownMs: 0,
      enabled: true,
    });
    engine.evaluate(makeMetric('cpu', 70));
    expect(listener).not.toHaveBeenCalled();
  });

  it('supports less-than operator', () => {
    const listener = vi.fn();
    const engine = new AlertEngine();
    engine.onAlert(listener);
    engine.addRule({
      id: 'r3',
      name: 'Low Disk',
      metric: 'disk_free',
      condition: { type: 'threshold', operator: 'lt', value: 10 },
      actions: [{ type: 'log', config: {} }],
      cooldownMs: 0,
      enabled: true,
    });
    engine.evaluate(makeMetric('disk_free', 5));
    expect(listener).toHaveBeenCalled();
  });

  it('respects cooldown period', () => {
    const listener = vi.fn();
    const engine = new AlertEngine();
    engine.onAlert(listener);
    engine.addRule({
      id: 'r4',
      name: 'High Errors',
      metric: 'errors',
      condition: { type: 'threshold', operator: 'gt', value: 100 },
      actions: [{ type: 'log', config: {} }],
      cooldownMs: 60000,
      enabled: true,
    });
    engine.evaluate(makeMetric('errors', 150));
    engine.evaluate(makeMetric('errors', 160));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removes rules', () => {
    const listener = vi.fn();
    const engine = new AlertEngine();
    engine.onAlert(listener);
    engine.addRule({
      id: 'r5',
      name: 'High Mem',
      metric: 'mem',
      condition: { type: 'threshold', operator: 'gt', value: 80 },
      actions: [{ type: 'log', config: {} }],
      cooldownMs: 0,
      enabled: true,
    });
    engine.removeRule('r5');
    engine.evaluate(makeMetric('mem', 95));
    expect(listener).not.toHaveBeenCalled();
  });
});
