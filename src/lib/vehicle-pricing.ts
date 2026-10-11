import type { PlatformAsset, PricingMode, TariffGrid } from '@/api/platform-admin';

export function vehiclePricingMode(asset: PlatformAsset): PricingMode {
  return asset.pricing.pricing_mode || (asset.pricing.tariff_grid ? 'seasonal' : 'flat');
}

export function activeVehicleGrid(asset: PlatformAsset): TariffGrid | null {
  const mode = vehiclePricingMode(asset);
  const grid = asset.pricing.tariff_grid;
  return mode === 'flat' || !grid ? null : { ...grid, mode: mode === 'duration' ? 'duration' : undefined };
}

export function minimumVehicleRate(asset: PlatformAsset): number {
  const grid = activeVehicleGrid(asset);
  if (!grid) return asset.pricing.daily_rate || 0;
  return Math.min(...Object.values(grid.low_season), ...(grid.mode === 'duration' ? [] : Object.values(grid.high_season)));
}
