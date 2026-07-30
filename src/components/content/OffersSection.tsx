import React from 'react';
import { OfferCard } from '@/components/content/OfferCard';
import { OfferData } from '@/types/seo';
import { Tag, Loader2 } from 'lucide-react';

interface OffersSectionProps {
  offers: OfferData[];
  loading?: boolean;
  title?: string;
  maxDisplay?: number; // Сколько показать (по умолчанию все)
}

export const OffersSection: React.FC<OffersSectionProps> = ({
  offers,
  loading = false,
  title = "Актуальные предложения",
  maxDisplay,
}) => {
  const displayOffers = maxDisplay ? offers.slice(0, maxDisplay) : offers;

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        </div>
      </section>
    );
  }

  if (displayOffers.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 rounded-full mb-4">
            <Tag className="w-4 h-4 text-cyan-600" />
            <span className="text-sm font-medium text-cyan-700">Спецпредложения</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-3">{title}</h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            Выгодные условия на аренду автомобилей на Пхукете. Выберите подходящее предложение!
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayOffers.map((offer) => (
            <OfferCard
              key={offer.slug}
              title={offer.title}
              slug={offer.slug}
              content={offer.content}
              cta={offer.cta}
              cta_color={offer.cta_color}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default OffersSection;