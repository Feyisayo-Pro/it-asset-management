import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * RequestContext — per-request store propagated automatically through
 * async callbacks. Middleware seeds it; any downstream code
 * (repositories, event handlers, domain services) can read the caller's
 * identity without threading it through method signatures.
 */
export interface RequestContext {
  correlationId: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
  roleName?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const asyncContext = {
  run<T>(ctx: RequestContext, callback: () => T): T {
    return storage.run(ctx, callback);
  },
  get(): RequestContext | undefined {
    return storage.getStore();
  },
  set(patch: Partial<RequestContext>): void {
    const current = storage.getStore();
    if (current) Object.assign(current, patch);
  },
};
