export class ReservoirSampler<T> {
  private reservoir: T[] = [];
  private count = 0;

  constructor(private size: number) {}

  add(item: T): void {
    this.count++;
    if (this.reservoir.length < this.size) {
      this.reservoir.push(item);
    } else {
      const j = Math.floor(Math.random() * this.count);
      if (j < this.size) {
        this.reservoir[j] = item;
      }
    }
  }

  getSample(): T[] {
    return [...this.reservoir];
  }

  get totalSeen(): number {
    return this.count;
  }

  reset(): void {
    this.reservoir = [];
    this.count = 0;
  }
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  get available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

export function sampleArray<T>(arr: T[], rate: number): T[] {
  if (rate >= 1) return arr;
  if (rate <= 0) return [];
  return arr.filter(() => Math.random() < rate);
}
