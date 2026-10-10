// Local invalidation only: no credentials, booking details or persistent storage.
const listeners = new Map<string, Set<() => void>>();

export function subscribeParkCalendar(tenantId: string, listener: () => void): () => void {
  const group = listeners.get(tenantId) || new Set<() => void>();
  group.add(listener);
  listeners.set(tenantId, group);
  return () => {
    group.delete(listener);
    if (!group.size && listeners.get(tenantId) === group) listeners.delete(tenantId);
  };
}

export function invalidateParkCalendar(tenantId: string): void {
  listeners.get(tenantId)?.forEach(listener => listener());
}
