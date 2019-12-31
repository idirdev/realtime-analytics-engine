import { describe, it, expect, vi } from 'vitest';
import { EventCollector } from '../src/EventCollector';

describe('EventCollector', () => {
  it('collects events', () => {
    const collector = new EventCollector();
    collector.ingest({ name: 'click', properties: { x: 100, y: 200 } });
    expect(collector.getBufferSize()).toBe(1);
  });

  it('deduplicates by event id', () => {
    const collector = new EventCollector();
    collector.ingest({ id: 'evt-1', name: 'click', properties: {} });
    collector.ingest({ id: 'evt-1', name: 'click', properties: {} });
    expect(collector.getBufferSize()).toBe(1);
  });

  it('rejects events without a name', () => {
    const collector = new EventCollector();
    const result = collector.ingest({ properties: {} });
    expect(result).toBeNull();
    expect(collector.getBufferSize()).toBe(0);
  });

  it('manual flush empties buffer', () => {
    const collector = new EventCollector();
    collector.ingest({ name: 'test', properties: {} });
    const flushed = collector.flush();
    expect(flushed).toHaveLength(1);
    expect(collector.getBufferSize()).toBe(0);
  });

  it('assigns default source tag', () => {
    const collector = new EventCollector({ sourceTag: 'web' });
    const event = collector.ingest({ name: 'pageview', properties: {} });
    expect(event).toBeDefined();
    expect(event!.source).toBe('web');
  });

  it('normalizes event name to lowercase', () => {
    const collector = new EventCollector();
    const event = collector.ingest({ name: 'PageView', properties: {} });
    expect(event).toBeDefined();
    expect(event!.name).toBe('pageview');
  });

  it('destroy flushes and clears', () => {
    const onFlush = vi.fn();
    const collector = new EventCollector({ onFlush, flushIntervalMs: 100000 });
    collector.ingest({ name: 'test', properties: {} });
    collector.destroy();
    expect(onFlush).toHaveBeenCalled();
    expect(collector.getBufferSize()).toBe(0);
  });
});
