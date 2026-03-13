# realtime-analytics-engine

[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)

A real-time analytics data pipeline with time-window aggregation, alerting, and dashboard queries. Built in TypeScript with zero external runtime dependencies (besides `uuid`).

## Architecture

```
                         +------------------+
  Events ──> Collector ──> Pipeline         │
                         │  ├── Filter      │
                         │  ├── Transform   │
                         │  ├── Enrich      │
                         │  └── Sink ───────┤
                         +------------------+
                                │
                    ┌───────────┼───────────┐
                    v           v           v
              Aggregator    Storage    AlertEngine
              (windows)   (time-series)  (rules)
                    │           │
                    v           v
                 Dashboard Queries
                 (trend, topN, heatmap)
```

## Features

- **Event Collection** - Ingest, validate, deduplicate, and batch events
- **Processing Pipeline** - Composable stages: filter, transform, enrich, fan-out to sinks
- **Time-Window Aggregation** - Tumbling windows (1m, 5m, 15m, 1h, 6h, 1d) with count, sum, avg, min, max, percentiles
- **Time-Series Storage** - In-memory store with retention policies, downsampling, and compaction
- **Alert Engine** - Threshold, rate-of-change, and anomaly detection with cooldown and actions
- **Dashboard Queries** - Metric retrieval, TopN, trend analysis, period comparison, heatmaps

## Quick Start

```bash
npm install
npm run build

# Run the web analytics example
npm run example
```

## Usage

```typescript
import { EventCollector, Pipeline, Aggregator, TimeSeriesStorage, AlertEngine, DashboardQuery } from 'realtime-analytics-engine';

// 1. Set up storage and aggregation
const storage = new TimeSeriesStorage({ retentionMs: 7 * 24 * 3600000 });
const aggregator = new Aggregator('5m', (agg) => storage.storeAggregated(agg));

// 2. Build a pipeline
const pipeline = new Pipeline('my-pipeline')
  .filter('has-user', (e) => !!e.userId)
  .transform('clean', (e) => ({ ...e, name: e.name.trim() }))
  .addSink((event) => {
    aggregator.add({ name: event.name, value: 1, timestamp: event.timestamp, dimensions: {} });
  });

// 3. Collect and process events
const collector = new EventCollector({ sourceTag: 'api' });
const event = collector.ingest({ name: 'signup', userId: 'u1' });
if (event) pipeline.process(event);

// 4. Query dashboards
const dashboard = new DashboardQuery(storage);
const trend = dashboard.getTrend('signup', 3600000);
```

## Pipeline Stages

| Stage     | Description                                      |
|-----------|--------------------------------------------------|
| `filter`  | Drop events that don't match a predicate         |
| `transform` | Modify event data (rename fields, normalize)   |
| `enrich`  | Add computed properties to the event              |
| `aggregate` | Custom aggregation logic within the pipeline   |
| `sink`    | Fan-out processed events to storage/external systems |

## Aggregation Windows

| Window | Duration  | Use Case                    |
|--------|-----------|-----------------------------|
| `1m`   | 1 minute  | Real-time monitoring        |
| `5m`   | 5 minutes | Dashboard refresh           |
| `15m`  | 15 minutes| Short-term trends           |
| `1h`   | 1 hour    | Hourly reports              |
| `6h`   | 6 hours   | Shift-based analysis        |
| `1d`   | 1 day     | Daily summaries             |

Each window computes: `count`, `sum`, `avg`, `min`, `max`, `p50`, `p90`, `p95`, `p99`.

## Alert Configuration

```typescript
alertEngine.addRule({
  id: 'high-latency',
  name: 'High Latency Alert',
  metric: 'response_time',
  condition: { type: 'threshold', operator: 'gt', value: 2000 },
  actions: [{ type: 'log', config: {} }],
  cooldownMs: 300000, // 5 minutes
  enabled: true,
});
```

Condition types:
- **threshold** - Fires when metric exceeds a static value
- **rate_of_change** - Fires when metric changes by N% within a window
- **anomaly** - Fires when metric deviates by N standard deviations from baseline

## Project Structure

```
src/
  index.ts            - Public API exports
  types.ts            - TypeScript interfaces
  EventCollector.ts   - Event ingestion and deduplication
  Pipeline.ts         - Composable processing pipeline
  Aggregator.ts       - Time-window aggregation
  Storage.ts          - In-memory time-series storage
  AlertEngine.ts      - Rule-based alerting
  Dashboard.ts        - Dashboard query API
  utils/
    timeseries.ts     - Time-series utility functions
examples/
  webAnalytics.ts     - Complete web analytics example
```

## License

MIT

## Storage Backends

Supports in-memory, Redis, and PostgreSQL as storage backends.

---

## 🇫🇷 Documentation en français

### Description
realtime-analytics-engine est un pipeline de données analytiques en temps réel avec agrégation par fenêtres temporelles, alertes et requêtes de tableau de bord. Construit en TypeScript sans dépendances externes au runtime (hormis `uuid`), il offre une architecture légère et performante. Idéal pour implémenter des systèmes d'analytics custom dans vos applications Node.js.

### Installation
```bash
npm install
npm run build
```

### Utilisation
```typescript
import { AnalyticsEngine } from './src';
const engine = new AnalyticsEngine();
engine.ingest({ event: 'page_view', userId: '123' });
```
Consultez la documentation en anglais ci-dessus pour les exemples d'agrégation, d'alertes et de requêtes dashboard.
