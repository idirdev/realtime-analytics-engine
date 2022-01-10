import { v4 as uuidv4 } from 'uuid';
import { AlertRule, Alert, AggregatedMetric } from './types';

export class AlertEngine {
  private rules: Map<string, AlertRule> = new Map();
  private lastTriggered: Map<string, number> = new Map();
  private history: Alert[] = [];
  private listeners: Array<(alert: Alert) => void> = [];

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(id: string): boolean {
    this.lastTriggered.delete(id);
    return this.rules.delete(id);
  }

  enableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) rule.enabled = true;
  }

  disableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) rule.enabled = false;
  }

  onAlert(listener: (alert: Alert) => void): void {
    this.listeners.push(listener);
  }

  evaluate(metric: AggregatedMetric): Alert | null {
    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.metric !== metric.name) continue;

      const now = Date.now();
      const lastFired = this.lastTriggered.get(rule.id) ?? 0;
      if (now - lastFired < rule.cooldownMs) continue;

      const triggered = this.checkCondition(rule, metric);
      if (triggered) {
        const alert = this.createAlert(rule, metric);
        this.lastTriggered.set(rule.id, now);
        this.history.push(alert);
        this.executeActions(rule, alert);
        this.notifyListeners(alert);
        return alert;
      }
    }
    return null;
  }

  private checkCondition(rule: AlertRule, metric: AggregatedMetric): boolean {
    const condition = rule.condition;

    if (condition.type === 'threshold') {
      const value = metric.avg;
      switch (condition.operator) {
        case 'gt':  return value > condition.value;
        case 'lt':  return value < condition.value;
        case 'gte': return value >= condition.value;
        case 'lte': return value <= condition.value;
      }
    }

    if (condition.type === 'rate_of_change') {
      const recentAlerts = this.history.filter(
        (a) => a.ruleId === rule.id && a.triggeredAt > Date.now() - condition.windowMs
      );
      if (recentAlerts.length > 0) {
        const prevValue = recentAlerts[recentAlerts.length - 1].value;
        const change = Math.abs((metric.avg - prevValue) / prevValue) * 100;
        return change >= condition.percentChange;
      }
    }

    if (condition.type === 'anomaly') {
      const baseline = this.history
        .filter((a) => a.metric === rule.metric && a.triggeredAt > Date.now() - condition.baselineWindowMs)
        .map((a) => a.value);

      if (baseline.length >= 2) {
        const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
        const variance = baseline.reduce((a, v) => a + (v - mean) ** 2, 0) / baseline.length;
        const stdDev = Math.sqrt(variance);
        return Math.abs(metric.avg - mean) > condition.stdDeviations * stdDev;
      }
    }

    return false;
  }

  private createAlert(rule: AlertRule, metric: AggregatedMetric): Alert {
    const thresholdValue = rule.condition.type === 'threshold' ? rule.condition.value : metric.avg;
    return {
      id: uuidv4(),
      ruleId: rule.id,
      ruleName: rule.name,
      metric: metric.name,
      value: metric.avg,
      threshold: thresholdValue,
      triggeredAt: Date.now(),
      message: `Alert "${rule.name}": ${metric.name} = ${metric.avg.toFixed(2)} (${rule.condition.type})`,
    };
  }

  private executeActions(rule: AlertRule, alert: Alert): void {
    for (const action of rule.actions) {
      if (action.type === 'log') {
        console.warn(`[ALERT] ${alert.message}`);
      }
      // webhook and callback actions would be implemented with HTTP/function calls
    }
  }

  private notifyListeners(alert: Alert): void {
    for (const listener of this.listeners) {
      try { listener(alert); } catch { /* swallow listener errors */ }
    }
  }

  getHistory(limit?: number): Alert[] {
    const sorted = [...this.history].sort((a, b) => b.triggeredAt - a.triggeredAt);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }
}
