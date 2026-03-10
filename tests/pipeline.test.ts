import { describe, it, expect } from "vitest";
import { EventCollector } from "../src/EventCollector";
import { Pipeline } from "../src/Pipeline";
import { Aggregator } from "../src/Aggregator";
import { TimeSeriesStorage } from "../src/Storage";
import { AlertEngine } from "../src/AlertEngine";

describe("EventCollector", () => {
  it("ingests and returns a normalized event", () => {
    const collector = new EventCollector({ sourceTag: "test" });
    const event = collector.ingest({ name: "signup", userId: "u1" });
    expect(event).not.toBeNull();
    expect(event!.name).toBe("signup");
    expect(event!.source).toBe("test");
    expect(event!.id).toBeDefined();
    expect(event!.timestamp).toBeDefined();
  });

  it("deduplicates events by ID", () => {
    const collector = new EventCollector();
    const e1 = collector.ingest({ name: "click", userId: "u1" });
    const e2 = collector.ingest({ name: "click", userId: "u1", id: e1!.id });
    expect(e1).not.toBeNull();
    expect(e2).toBeNull();
  });

  it("rejects events without a name", () => {
    const collector = new EventCollector();
    const event = collector.ingest({ userId: "u1" });
    expect(event).toBeNull();
  });
});

describe("Pipeline", () => {
  it("filters events", () => {
    const pipeline = new Pipeline("test");
    const results: any[] = [];
    pipeline
      .filter("has-user", (e) => !!e.userId)
      .addSink((e) => results.push(e));

    const collector = new EventCollector();
    const e1 = collector.ingest({ name: "a", userId: "u1" });
    const e2 = collector.ingest({ name: "b" });

    if (e1) pipeline.process(e1);
    if (e2) pipeline.process(e2);

    expect(results.length).toBe(1);
    expect(results[0].name).toBe("a");
  });

  it("transforms events", () => {
    const pipeline = new Pipeline("test");
    const results: any[] = [];
    pipeline
      .transform("uppercase", (e) => ({ ...e, name: e.name.toUpperCase() }))
      .addSink((e) => results.push(e));

    const collector = new EventCollector();
    const event = collector.ingest({ name: "signup" });
    if (event) pipeline.process(event);

    expect(results[0].name).toBe("SIGNUP");
  });
});

describe("Aggregator", () => {
  it("aggregates metrics within a window", () => {
    const agg = new Aggregator("1m");
    const now = Date.now();
    agg.add({ name: "latency", value: 100, timestamp: now, dimensions: {} });
    agg.add({ name: "latency", value: 200, timestamp: now + 1000, dimensions: {} });

    const results = agg.forceFlushAll();
    expect(results.length).toBe(1);
    expect(results[0].count).toBe(2);
    expect(results[0].avg).toBe(150);
    expect(results[0].min).toBe(100);
    expect(results[0].max).toBe(200);
  });
});

describe("TimeSeriesStorage", () => {
  it("stores and queries metrics", () => {
    const storage = new TimeSeriesStorage();
    const now = Date.now();
    storage.store({ name: "cpu", value: 75, timestamp: now, dimensions: {} });
    storage.store({ name: "cpu", value: 80, timestamp: now + 1000, dimensions: {} });

    const results = storage.query({ metric: "cpu", from: now - 1000, to: now + 2000 });
    expect(results.length).toBe(2);
  });

  it("returns metric names", () => {
    const storage = new TimeSeriesStorage();
    storage.store({ name: "cpu", value: 50, timestamp: Date.now(), dimensions: {} });
    storage.store({ name: "memory", value: 60, timestamp: Date.now(), dimensions: {} });
    expect(storage.getMetricNames()).toContain("cpu");
    expect(storage.getMetricNames()).toContain("memory");
  });
});

describe("AlertEngine", () => {
  it("adds and evaluates threshold rules", () => {
    const engine = new AlertEngine();
    const alerts: any[] = [];
    engine.onAlert((a) => alerts.push(a));
    engine.addRule({
      id: "high-cpu",
      name: "High CPU",
      metric: "cpu",
      condition: { type: "threshold", operator: "gt", value: 90 },
      actions: [{ type: "log", config: {} }],
      cooldownMs: 0,
      enabled: true,
    });

    const alert = engine.evaluate({
      name: "cpu",
      windowStart: Date.now() - 60000,
      windowEnd: Date.now(),
      count: 10,
      sum: 950,
      avg: 95,
      min: 90,
      max: 100,
      dimensions: {},
    });

    expect(alert).not.toBeNull();
    expect(alert!.ruleName).toBe("High CPU");
  });
});
