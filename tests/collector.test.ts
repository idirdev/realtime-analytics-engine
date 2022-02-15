import { describe, it, expect, vi } from 'vitest';
import { EventCollector } from '../src/EventCollector';

describe('EventCollector', () => {
  it('collects events', () => {
    const collector = new EventCollector({ batchSize: 10 });
    collector.push({ type: 'click', data: { x: 100, y: 200 } });
    expect(collector.size).toBe(1);
  });

  it('deduplicates by event id', () => {
    const collector = new EventCollector({ batchSize: 10, deduplicate: true });
    collector.push({ id: 'evt-1', type: 'click', data: {} });
    collector.push({ id: 'evt-1', type: 'click', data: {} });
    expect(collector.size).toBe(1);
  });

  it('flushes when batch size reached', () => {
    const onFlush = vi.fn();
    const collector = new EventCollector({ batchSize: 3, onFlush });
    collector.push({ type: 'a', data: {} });
    collector.push({ type: 'b', data: {} });
    collector.push({ type: 'c', data: {} });
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ type: 'a' }),
    ]));
  });

  it('manual flush empties buffer', () => {
    const collector = new EventCollector({ batchSize: 100 });
    collector.push({ type: 'test', data: {} });
    const flushed = collector.flush();
    expect(flushed).toHaveLength(1);
    expect(collector.size).toBe(0);
  });

  it('drops events when buffer full', () => {
    const collector = new EventCollector({ batchSize: 100, maxBuffer: 2 });
    collector.push({ type: 'a', data: {} });
    collector.push({ type: 'b', data: {} });
    collector.push({ type: 'c', data: {} });
    expect(collector.size).toBe(2);
    expect(collector.dropped).toBe(1);
  });
});
