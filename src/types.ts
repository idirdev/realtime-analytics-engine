export interface Event {
  id: string;
  name: string;
  timestamp: number;
  source: string;
  properties: Record<string, string | number | boolean>;
  userId?: string;
  sessionId?: string;
}

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  dimensions: Record<string, string>;
  tags?: string[];
}

export interface AggregatedMetric {
  name: string;
  windowStart: number;
  windowEnd: number;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  percentiles: Record<number, number>;
  dimensions: Record<string, string>;
}

export type TimeWindowSize = '1m' | '5m' | '15m' | '1h' | '6h' | '1d';

export interface TimeWindow {
  size: TimeWindowSize;
  start: number;
  end: number;
  metrics: Metric[];
}

export type PipelineStageType = 'filter' | 'transform' | 'enrich' | 'aggregate' | 'sink';

export interface PipelineStage {
  name: string;
  type: PipelineStageType;
  handler: (event: Event) => Event | null;
}

export interface Pipeline {
  name: string;
  stages: PipelineStage[];
  errorHandler?: (error: Error, event: Event) => void;
}

export interface Filter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'regex';
  value: string | number | boolean;
}

export interface Aggregation {
  metric: string;
  fn: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'p50' | 'p90' | 'p95' | 'p99';
  groupBy?: string[];
  window: TimeWindowSize;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
}

export interface DashboardWidget {
  id: string;
  title: string;
  metric: string;
  aggregation: Aggregation;
  chartType: 'line' | 'bar' | 'counter' | 'heatmap' | 'table';
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  actions: AlertAction[];
  cooldownMs: number;
  enabled: boolean;
}

export type AlertCondition =
  | { type: 'threshold'; operator: 'gt' | 'lt' | 'gte' | 'lte'; value: number }
  | { type: 'rate_of_change'; percentChange: number; windowMs: number }
  | { type: 'anomaly'; stdDeviations: number; baselineWindowMs: number };

export interface AlertAction {
  type: 'log' | 'webhook' | 'callback';
  config: Record<string, string>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  triggeredAt: number;
  message: string;
}

export interface EventSource {
  name: string;
  type: 'http' | 'websocket' | 'kafka' | 'file';
  config: Record<string, string>;
}

export interface QueryOptions {
  from: number;
  to: number;
  metric: string;
  groupBy?: string[];
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  limit?: number;
}
