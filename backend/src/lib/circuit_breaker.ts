/**
 * Generic Circuit Breaker implementation for external dependencies.
 *
 * States:
 *  - CLOSED: Normal operation. Requests pass through.
 *  - OPEN: Requests fail fast without attempting remote calls.
 *  - HALF_OPEN: Allows a trial request to check if remote service has recovered.
 */

import { CircuitBreakerOpenError } from './errors';

export interface CircuitBreakerOptions<TResult = any> {
  /** Request timeout in ms (default 5000) */
  timeout?: number;
  /** Error percentage threshold (0-100) to trip circuit (default 50) */
  errorThresholdPercentage?: number;
  /** Time in ms before trying HALF_OPEN state (default 10000) */
  resetTimeout?: number;
  /** Minimum number of total requests before evaluating threshold (default 3) */
  volumeThreshold?: number;
  /** Optional fallback handler invoked on error or open circuit */
  fallback?: (error: Error, ...args: any[]) => TResult | Promise<TResult>;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export { CircuitBreakerOpenError };

export class CircuitBreaker<TArgs extends any[] = any[], TResult = any> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalCount = 0;
  private nextAttempt = 0;

  private readonly timeout: number;
  private readonly errorThresholdPercentage: number;
  private readonly resetTimeout: number;
  private readonly volumeThreshold: number;
  private readonly fallback?: (error: Error, ...args: TArgs) => TResult | Promise<TResult>;

  constructor(
    private readonly fn: (...args: TArgs) => Promise<TResult>,
    options: CircuitBreakerOptions<TResult> = {}
  ) {
    this.timeout = options.timeout ?? 5000;
    this.errorThresholdPercentage = options.errorThresholdPercentage ?? 50;
    this.resetTimeout = options.resetTimeout ?? 10000;
    this.volumeThreshold = options.volumeThreshold ?? 3;
    this.fallback = options.fallback;
  }

  public getState(): CircuitState {
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt) {
      this.state = CircuitState.HALF_OPEN;
    }
    return this.state;
  }

  public async fire(...args: TArgs): Promise<TResult> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      const openErr = new CircuitBreakerOpenError('Circuit breaker is OPEN — anchor request blocked');
      if (this.fallback) {
        return this.fallback(openErr, ...args);
      }
      throw openErr;
    }

    let timer: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Operation timed out after ${this.timeout}ms`));
        }, this.timeout);
      });

      const result = await Promise.race([this.fn(...args), timeoutPromise]);
      if (timer) clearTimeout(timer);
      this.onSuccess();
      return result;
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      const error = err instanceof Error ? err : new Error(String(err));
      this.onFailure();
      if (this.fallback) {
        return this.fallback(error, ...args);
      }
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.reset();
    } else {
      this.successCount++;
      this.totalCount++;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.totalCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.trip();
    } else if (this.totalCount >= this.volumeThreshold) {
      const errorRate = (this.failureCount / this.totalCount) * 100;
      if (errorRate >= this.errorThresholdPercentage) {
        this.trip();
      }
    }
  }

  private trip(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.resetTimeout;
  }

  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCount = 0;
    this.nextAttempt = 0;
  }
}
