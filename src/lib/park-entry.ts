import type { ParkIdentity } from '@/api/park-telegram';

export type ParkView = 'checking' | 'owner' | 'client';

// A verified owner role alone must not change the public storefront's mode.
export function resolveParkEntryView(ownerEntry: boolean, role?: ParkIdentity['role']): ParkView {
  return ownerEntry && role === 'owner' ? 'owner' : 'client';
}
