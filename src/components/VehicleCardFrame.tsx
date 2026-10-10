import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

/** Shared Sunny card shell; data, prices and media remain the caller's responsibility. */
export function VehicleCardFrame({ assetId, media, children }: { assetId: string; media: ReactNode; children: ReactNode }) {
  return <Card data-car-id={assetId} className="flex min-w-0 flex-col overflow-hidden rounded-xl shadow-soft transition-shadow hover:shadow-medium">
    {media}
    {children}
  </Card>;
}
