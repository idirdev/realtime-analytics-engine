import { Event, PipelineStage, PipelineStageType } from './types';

type SinkHandler = (event: Event) => void;

export class Pipeline {
  private stages: PipelineStage[] = [];
  private sinks: SinkHandler[] = [];
  private errorHandler: (error: Error, event: Event, stage: string) => void;
  private processedCount = 0;
  private errorCount = 0;

  constructor(
    public readonly name: string,
    options: {
      onError?: (error: Error, event: Event, stage: string) => void;
    } = {}
  ) {
    this.errorHandler = options.onError ?? ((err, _ev, stage) => {
      console.error(`[Pipeline:${this.name}] Error in stage "${stage}":`, err.message);
    });
  }

  addStage(name: string, type: PipelineStageType, handler: (event: Event) => Event | null): this {
    this.stages.push({ name, type, handler });
    return this;
  }

  filter(name: string, predicate: (event: Event) => boolean): this {
    return this.addStage(name, 'filter', (event) => predicate(event) ? event : null);
  }

  transform(name: string, transformer: (event: Event) => Event): this {
    return this.addStage(name, 'transform', transformer);
  }

  enrich(name: string, enricher: (event: Event) => Record<string, string | number | boolean>): this {
    return this.addStage(name, 'enrich', (event) => ({
      ...event,
      properties: { ...event.properties, ...enricher(event) },
    }));
  }

  aggregate(name: string, handler: (event: Event) => Event | null): this {
    return this.addStage(name, 'aggregate', handler);
  }

  addSink(handler: SinkHandler): this {
    this.sinks.push(handler);
    return this;
  }

  process(event: Event): Event | null {
    let current: Event | null = { ...event };

    for (const stage of this.stages) {
      if (!current) break;

      try {
        current = stage.handler(current);
      } catch (err) {
        this.errorCount++;
        this.errorHandler(err instanceof Error ? err : new Error(String(err)), event, stage.name);
        return null;
      }
    }

    if (current) {
      this.processedCount++;
      this.fanOut(current);
    }

    return current;
  }

  processBatch(events: Event[]): Event[] {
    const results: Event[] = [];
    for (const event of events) {
      const result = this.process(event);
      if (result) results.push(result);
    }
    return results;
  }

  private fanOut(event: Event): void {
    for (const sink of this.sinks) {
      try {
        sink(event);
      } catch (err) {
        this.errorHandler(
          err instanceof Error ? err : new Error(String(err)),
          event,
          'sink'
        );
      }
    }
  }

  getStages(): ReadonlyArray<PipelineStage> {
    return [...this.stages];
  }

  removeStage(name: string): boolean {
    const idx = this.stages.findIndex((s) => s.name === name);
    if (idx === -1) return false;
    this.stages.splice(idx, 1);
    return true;
  }

  getStats(): { processed: number; errors: number; stageCount: number; sinkCount: number } {
    return {
      processed: this.processedCount,
      errors: this.errorCount,
      stageCount: this.stages.length,
      sinkCount: this.sinks.length,
    };
  }

  clear(): void {
    this.stages = [];
    this.sinks = [];
    this.processedCount = 0;
    this.errorCount = 0;
  }
}
