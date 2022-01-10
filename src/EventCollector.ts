import { v4 as uuidv4 } from 'uuid';
import { Event } from './types';

export class EventCollector {
  private seen: Set<string> = new Set();
  private bloomCapacity: number;
  private sourceTag: string;
  private buffer: Event[] = [];
  private flushCallback?: (events: Event[]) => void;
  private flushIntervalMs: number;
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(options: {
    sourceTag?: string;
    bloomCapacity?: number;
    flushIntervalMs?: number;
    onFlush?: (events: Event[]) => void;
  } = {}) {
    this.sourceTag = options.sourceTag ?? 'default';
    this.bloomCapacity = options.bloomCapacity ?? 100_000;
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
    this.flushCallback = options.onFlush;

    if (this.flushCallback) {
      this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    }
  }

  ingest(event: Partial<Event>): Event | null {
    const validated = this.validate(event);
    if (!validated) return null;

    if (this.isDuplicate(validated.id)) return null;

    const normalized = this.normalize(validated);
    this.markSeen(normalized.id);
    this.buffer.push(normalized);
    return normalized;
  }

  batchIngest(events: Partial<Event>[]): Event[] {
    const results: Event[] = [];
    for (const event of events) {
      const ingested = this.ingest(event);
      if (ingested) results.push(ingested);
    }
    return results;
  }

  private validate(event: Partial<Event>): Event | null {
    if (!event.name || typeof event.name !== 'string') return null;

    return {
      id: event.id ?? uuidv4(),
      name: event.name,
      timestamp: event.timestamp ?? Date.now(),
      source: event.source ?? this.sourceTag,
      properties: event.properties ?? {},
      userId: event.userId,
      sessionId: event.sessionId,
    };
  }

  private isDuplicate(id: string): boolean {
    if (this.seen.size >= this.bloomCapacity) {
      this.seen.clear();
    }
    return this.seen.has(id);
  }

  private markSeen(id: string): void {
    this.seen.add(id);
  }

  private normalize(event: Event): Event {
    return {
      ...event,
      timestamp: Math.floor(event.timestamp),
      source: event.source || this.sourceTag,
      name: event.name.trim().toLowerCase(),
    };
  }

  flush(): Event[] {
    const events = [...this.buffer];
    this.buffer = [];
    if (this.flushCallback && events.length > 0) {
      this.flushCallback(events);
    }
    return events;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
    this.seen.clear();
  }
}
