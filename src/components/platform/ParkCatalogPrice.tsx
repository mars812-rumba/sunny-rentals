import type { ParkCatalogRentalPrice } from '@/api/park-telegram';
import type { StorefrontAsset } from '@/api/storefront';
import { useParkLocale } from '@/contexts/park-locale';
import { rentalMoney } from '@/lib/park-rental';

export function ParkCatalogPrice({ asset, currency, selected, rental }: { asset: Pick<StorefrontAsset, 'daily_rate' | 'tariff_grid' | 'deposit'>; currency: string; selected: boolean; rental?: ParkCatalogRentalPrice }) {
  const { pt } = useParkLocale();
  const money = (amount: string | number) => rentalMoney(amount, rental?.currency || currency);
  const mixed = (rental?.tariff_breakdown?.length || 0) > 1;
  return <div className="mt-auto pt-5">
    <p className="break-words text-2xl font-bold tabular-nums text-blue-700">{rental ? money(rental.total_rental) : selected ? pt('Расчёт в карточке автомобиля') : asset.daily_rate ? asset.tariff_grid ? pt('от {0}', [money(asset.daily_rate)]) : money(asset.daily_rate) : pt('Цена по запросу')}</p>
    {rental ? <p className="text-sm text-slate-600">{mixed ? pt('Аренда за {0} суток · разные сезоны', [rental.days]) : pt('{0} / сутки · за {1} суток', [money(rental.daily_rate), rental.days])}</p> : !selected && Boolean(asset.daily_rate) && <p className="text-sm text-slate-600">{pt('за сутки')}</p>}
    {rental && <p className="mt-1 text-xs text-slate-600">{pt('Аренда без доставки. Цена повторно проверяется при отправке.')}</p>}
    <p className="mt-2 text-sm text-slate-600">{rental ? pt('Депозит отдельно: {0}', [money(rental.deposit)]) : asset.deposit !== null ? pt('Депозит отдельно: {0}', [money(asset.deposit)]) : pt('Депозит уточняется')}</p>
  </div>;
}
