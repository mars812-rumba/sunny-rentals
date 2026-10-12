import type { PlatformAssetInput } from '@/api/platform-admin';

/** Prices belong exclusively to the details editor; omit them, not stale copies. */
export function fleetBasicInput(data: PlatformAssetInput): PlatformAssetInput {
  return { name: data.name, asset_type: data.asset_type, brand: data.brand, model: data.model,
    year: data.year, color: data.color, ...(data.public === undefined ? {} : { public: data.public }) };
}
