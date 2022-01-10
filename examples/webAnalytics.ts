import { EventCollector } from '../src/EventCollector';
import { Pipeline } from '../src/Pipeline';
import { Aggregator } from '../src/Aggregator';
import { TimeSeriesStorage } from '../src/Storage';
import { AlertEngine } from '../src/AlertEngine';
import { DashboardQuery } from '../src/Dashboard';
import { Metric, AggregatedMetric } from '../src/types';

// Initialize components
const storage = new TimeSeriesStorage({ retentionMs: 24 * 60 * 60 * 1000 });
const aggregator = new Aggregator('5m', (agg: AggregatedMetric) => storage.storeAggregated(agg));
const alertEngine = new AlertEngine();
const dashboard = new DashboardQuery(storage);

// Set up alert for high error rates
alertEngine.addRule({
  id: 'high-errors',
  name: 'High Error Rate',
  metric: 'errors.count',
  condition: { type: 'threshold', operator: 'gt', value: 50 },
  actions: [{ type: 'log', config: {} }],
  cooldownMs: 300_000,
  enabled: true,
});

alertEngine.onAlert((alert) => {
  console.log(`ALERT FIRED: ${alert.message}`);
});

// Build processing pipeline
const pipeline = new Pipeline('web-analytics')
  .filter('valid-events', (event) => !!event.name && !!event.userId)
  .transform('normalize-url', (event) => ({
    ...event,
    properties: {
      ...event.properties,
      url: String(event.properties.url ?? '/').split('?')[0],
    },
  }))
  .enrich('add-hour', (event) => ({
    hour: new Date(event.timestamp).getHours().toString(),
    dayOfWeek: new Date(event.timestamp).getDay().toString(),
  }))
  .addSink((event) => {
    const metric: Metric = {
      name: event.name,
      value: 1,
      timestamp: event.timestamp,
      dimensions: {
        url: String(event.properties.url ?? '/'),
        source: event.source,
      },
    };
    storage.store(metric);
    aggregator.add(metric);
  });

// Simulate event collection
const collector = new EventCollector({ sourceTag: 'web', flushIntervalMs: 1000 });

const pages = ['/', '/about', '/pricing', '/docs', '/blog', '/contact'];
const referrers = ['google', 'twitter', 'direct', 'reddit', 'hackernews'];
const now = Date.now();

console.log('Ingesting simulated web analytics events...');

for (let i = 0; i < 500; i++) {
  const event = collector.ingest({
    name: 'pageview',
    timestamp: now - Math.random() * 3_600_000,
    userId: `user-${Math.floor(Math.random() * 100)}`,
    sessionId: `sess-${Math.floor(Math.random() * 200)}`,
    properties: {
      url: pages[Math.floor(Math.random() * pages.length)],
      referrer: referrers[Math.floor(Math.random() * referrers.length)],
      loadTime: Math.floor(Math.random() * 3000),
    },
  });

  if (event) pipeline.process(event);
}

// Flush aggregator and check alerts
const flushed = aggregator.forceFlushAll();
console.log(`\nFlushed ${flushed.length} aggregated windows`);

for (const agg of flushed) {
  alertEngine.evaluate(agg);
}

// Dashboard queries
const oneHourAgo = now - 3_600_000;
console.log('\n--- Dashboard ---');

const trend = dashboard.getTrend('pageview', 1_800_000);
console.log(`Pageview trend: ${trend.direction} (${trend.changePercent.toFixed(1)}%)`);

const topPages = dashboard.getTopN('pageview', 5, oneHourAgo, now);
console.log('Top pages:', topPages.map((p) => `${p.name}: ${p.total}`).join(', '));

const pipelineStats = pipeline.getStats();
console.log(`\nPipeline stats: ${pipelineStats.processed} processed, ${pipelineStats.errors} errors`);
console.log(`Storage: ${storage.getTotalPoints()} total data points across ${storage.getMetricNames().length} metrics`);

collector.destroy();
