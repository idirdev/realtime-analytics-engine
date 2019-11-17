import { describe, it, expect, vi } from 'vitest';
import { AlertEngine } from '../src/AlertEngine';

describe('AlertEngine', () => {
  it('fires alert when threshold exceeded', () => {
    const handler = vi.fn();
    const engine = new AlertEngine();
    engine.addRule({ metric: 'cpu', threshold: 90, operator: '>', handler });
    engine.evaluate({ metric: 'cpu', value: 95, timestamp: Date.now() });
    expect(handler).toHaveBeenCalled();
  });

  it('does not fire when below threshold', () => {
    const handler = vi.fn();
    const engine = new AlertEngine();
    engine.addRule({ metric: 'cpu', threshold: 90, operator: '>', handler });
    engine.evaluate({ metric: 'cpu', value: 70, timestamp: Date.now() });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports less-than operator', () => {
    const handler = vi.fn();
    const engine = new AlertEngine();
    engine.addRule({ metric: 'disk_free', threshold: 10, operator: '<', handler });
    engine.evaluate({ metric: 'disk_free', value: 5, timestamp: Date.now() });
    expect(handler).toHaveBeenCalled();
  });

  it('respects cooldown period', () => {
    const handler = vi.fn();
    const engine = new AlertEngine();
    engine.addRule({ metric: 'errors', threshold: 100, operator: '>', handler, cooldownMs: 60000 });
    engine.evaluate({ metric: 'errors', value: 150, timestamp: Date.now() });
    engine.evaluate({ metric: 'errors', value: 160, timestamp: Date.now() });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removes rules', () => {
    const handler = vi.fn();
    const engine = new AlertEngine();
    const id = engine.addRule({ metric: 'mem', threshold: 80, operator: '>', handler });
    engine.removeRule(id);
    engine.evaluate({ metric: 'mem', value: 95, timestamp: Date.now() });
    expect(handler).not.toHaveBeenCalled();
  });
});
