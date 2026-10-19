import { CarFront } from 'lucide-react';
import type { PlatformAsset } from '@/api/platform-admin';
import { useParkLocale } from '@/contexts/park-locale';
import { vehicleAssetTypeLabels } from './VehicleBasicFields';

/** Private fleet identity: never used by the customer storefront. */
export function FleetVehicleIdentity({ asset }: { asset: Pick<PlatformAsset, 'name' | 'asset_type' | 'license_plate'> }) {
  const { pt } = useParkLocale();
  const plate = asset.license_plate?.trim();
  return <>
    <h3 className="break-words text-lg font-semibold leading-snug">{asset.name}</h3>
    <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
      <CarFront aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span>{pt(vehicleAssetTypeLabels[asset.asset_type])}</span>
        {plate && <><span aria-hidden="true">·</span><span className="min-w-0 break-words font-medium text-slate-900">{pt('Госномер: {0}', [plate])}</span></>}
      </span>
    </p>
  </>;
}
