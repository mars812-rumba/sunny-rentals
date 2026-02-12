// src/components/CarCardCompact.tsx
import React, { useMemo } from 'react';
import { Star, Fuel, Settings, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CarCardCompactProps {
  car: any;
  rentalDays: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// УПРОЩЁННОЕ ФОТО - без карусели, только первое фото
const ImageSingle = ({ photo, carName, carId }: { photo: string, carName: string, carId: string }) => {
  const imageTimestamp = useMemo(() => Date.now(), [carId]);

  if (!photo) {
    return (
      <div className="aspect-[16/10] flex items-center justify-center bg-muted">
        <Settings className="w-8 h-8 text-primary opacity-30" />
      </div>
    );
  }

  const imageUrl = `${API_URL}/images_web/${photo}?v=${imageTimestamp}`;

  return (
    <div className="aspect-[16/10] overflow-hidden bg-muted">
      <img
        src={imageUrl}
        alt={carName}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src.includes('?v=')) {
            target.src = `${API_URL}/images_web/${photo}`;
          }
        }}
      />
    </div>
  );
};

const CarCardCompact = ({ car, rentalDays }: CarCardCompactProps) => {
  const getSeason = (date: Date) => {
    const month = date.getMonth();
    if (month >= 3 && month <= 9) {
      return 'low_season';
    }
    return 'high_season';
  };

  const getPriceForPeriod = (pricing: any, days: number) => {
    const today = new Date();
    const season = getSeason(today);
    const seasonalPricing = pricing[season] || pricing.low_season;

    if (!seasonalPricing) {
      const fallbackSeason = Object.keys(pricing).find(k => k.includes('season'));
      if (fallbackSeason) {
        const fallbackPricing = pricing[fallbackSeason];
        if (days >= 30) return fallbackPricing.price_30 || 0;
        if (days >= 15) return fallbackPricing.price_15_29 || 0;
        if (days >= 7) return fallbackPricing.price_7_14 || 0;
        return fallbackPricing.price_1_6 || 0;
      }
      return 0;
    }

    if (days >= 30) return seasonalPricing.price_30;
    if (days >= 15) return seasonalPricing.price_15_29;
    if (days >= 7) return seasonalPricing.price_7_14;
    return seasonalPricing.price_1_6;
  };

  const dailyPrice = getPriceForPeriod(car.pricing, rentalDays);
  const totalPrice = dailyPrice * rentalDays;

  // Берём только первое фото
  const mainPhoto = car.photos?.gallery?.[0] || car.photos?.main || '';

  return (
    <Card 
      data-car-id={car.id} 
      className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col"
    >
      {/* Фото с рейтингом - БЕЗ карусели */}
      <div className="relative h-28">
        <ImageSingle photo={mainPhoto} carName={car.name} carId={car.id} />
        
        {/* Только рейтинг */}
        <div className="absolute top-1.5 left-1.5 z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-full flex items-center gap-1 shadow-sm px-2 py-0.5">
            <Star className="w-3 h-3 text-blue-600 fill-current" />
            <span className="font-bold text-xs">4.9</span>
          </div>
        </div>
      </div>

      <CardContent className="px-2 pb-2 pt-[2px] flex-grow flex flex-col">
        <div className="space-y-1 flex-grow flex flex-col">

          {/* Название */}
          <div>
            <h3 className="font-semibold text-xs text-foreground leading-tight line-clamp-1">
              {car.brand} {car.model}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {car.year} • {car.color}
            </p>
          </div>


          <div className="flex-grow"></div>

          {/* Цена */}
          <div className="pt-1 border-t border-gray-100">
            <div className="font-bold text-base text-primary leading-tight">
              {totalPrice.toLocaleString()}฿
            </div>
            <div className="text-[10px] text-muted-foreground">
              {dailyPrice}฿/день • {rentalDays}д
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CarCardCompact;