import React, { useState, useEffect, useMemo } from 'react';
import { Star, Fuel, Settings, Users, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface CarCardProps {
  car: any;
  rentalDays: number;
  onBooking: (car: any) => void;
  isSubmitting: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ImageCarousel = ({ photos, carName, t, carId }: { photos: string[], carName: string, t: (key: string) => string, carId: string }) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Генерируем timestamp ОДИН РАЗ при монтировании компонента
  const imageTimestamp = useMemo(() => Date.now(), [carId]);
  
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    watchDrag: isTouchDevice 
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  if (!photos || photos.length === 0) {
    return (
      <div className="aspect-[16/10] flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-2 bg-primary/10 rounded-full flex items-center justify-center">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{t('photo_unavailable')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="embla aspect-[16/10]">
      <div className="embla__viewport h-full" ref={emblaRef}>
        <div className="embla__container h-full">
          {photos.map((photo, index) => {
            const imageUrl = `${API_URL}/images_web/${photo}?v=${imageTimestamp}`;
            
            return (
              <div className="embla__slide" key={index}>
                <img
                  src={imageUrl}
                  alt={`${carName} photo ${index + 1}`}
                  className="embla__slide__img"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Пробуем без параметров
                    if (target.src.includes('?v=')) {
                      target.src = `${API_URL}/images_web/${photo}`;
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {photos.length > 1 && (
        <div className="embla__progress">
          {photos.map((_, index) => (
            <div
              key={index}
              className={`embla__progress__bar ${index === selectedIndex ? 'embla__progress__bar--selected' : ''}`}
            />
          ))}
        </div>
      )}

      {!isTouchDevice && photos.length > 1 && (
        <div className="embla__hover-triggers">
          {photos.map((_, index) => (
            <div
              key={index}
              className="embla__hover-trigger"
              onMouseEnter={() => emblaApi && emblaApi.scrollTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const photoBadges = [
  { textKey: 'badge_free_cancellation', color: 'green' },
  { textKey: 'badge_hit_2025', color: 'orange' },
  { textKey: 'badge_great_price', color: 'orange' },
  { textKey: 'badge_no_prepayment', color: 'blue' },
  { textKey: 'badge_payment_options', color: 'white' },
  { textKey: 'badge_unlimited_mileage', color: 'green' },
  { textKey: 'badge_province_travel', color: 'green' },
  { textKey: 'badge_child_seats_free', color: 'blue' },
  { textKey: 'badge_car_wash_included', color: 'blue' },
  { textKey: 'badge_night_delivery', color: 'white' },
  { textKey: 'badge_new_car', color: 'orange' },
  { textKey: 'badge_top_choice', color: 'orange' },
  { textKey: 'badge_full_tank', color: 'blue' },
  { textKey: 'badge_no_deposit', color: 'green' }
];

const getBadgeColorClasses = (color: string) => {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    white: 'bg-white text-gray-700 border-gray-300'
  };
  return colorMap[color] || colorMap.blue;
};

const CarCard = ({ car, rentalDays, onBooking, isSubmitting }: CarCardProps) => {
  const { t } = useLanguage();
 const getSeason = (date: Date) => {
    const month = date.getMonth() + 1; // getMonth() is 0-indexed, нужно 1-12
    
    // Высокий сезон: ноябрь (11) - апрель (4)
    // Низкий сезон: май (5) - октябрь (10)
    if (month >= 11 || month <= 4) {
      return 'high_season';
    }
    
    return 'low_season';
  };

  const getPriceForPeriod = (pricing: any, days: number) => {
    const today = new Date();
    const season = getSeason(today);
    
    // Fallback to low_season if high_season pricing is not available
    const seasonalPricing = pricing[season] || pricing.low_season;

    if (!seasonalPricing) {
      // Fallback to any available pricing if the determined season's pricing doesn't exist
      const fallbackSeason = Object.keys(pricing).find(k => k.includes('season'));
      if (fallbackSeason) {
        const fallbackPricing = pricing[fallbackSeason];
        if (days >= 30) return fallbackPricing.price_30 || 0;
        if (days >= 15) return fallbackPricing.price_15_29 || 0;
        if (days >= 7) return fallbackPricing.price_7_14 || 0;
        return fallbackPricing.price_1_6 || 0;
      }
      return 0; // Or handle as an error
    }

    if (days >= 30) return seasonalPricing.price_30;
    if (days >= 15) return seasonalPricing.price_15_29;
    if (days >= 7) return seasonalPricing.price_7_14;
    return seasonalPricing.price_1_6;
  };

  const dailyPrice = getPriceForPeriod(car.pricing, rentalDays);
  const totalPrice = dailyPrice * rentalDays;

  const imageGallery = car.photos?.gallery && car.photos.gallery.length > 0 
    ? car.photos.gallery 
    : (car.photos?.main ? [car.photos.main] : []);

  const [randomBadges, setRandomBadges] = useState<{ textKey: string; color: string }[]>([]);

  useEffect(() => {
    const count = Math.random() > 0.5 ? 2 : 3;
    const shuffled = [...photoBadges].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    setRandomBadges(selected);
  }, []);

  return (
    <Card data-car-id={car.id} className="overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300 flex flex-col transform hover:scale-[1.02] hover:border-primary">
      <div className="relative h-48">
        <ImageCarousel photos={imageGallery} carName={car.name} t={t} carId={car.id} />
        
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10 transform-gpu">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
            <Star className="w-4 h-4 text-blue-600 fill-current" />
            <span className="font-bold text-sm">4.9</span>
          </div>
          
          <div className="bg-green-500/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-xs font-semibold shadow-sm">
            {t('verified')}
          </div>
        </div>
      </div>

      <CardContent className="p-4 flex-grow flex flex-col">
        <div className="space-y-3 flex-grow flex flex-col">
          
          <div className="flex flex-wrap gap-1.5 mt-1">
            {randomBadges.map((badge, index) => (
              <span
                key={index}
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                  getBadgeColorClasses(badge.color)
                )}
              >
                {t(badge.textKey)}
              </span>
            ))}
          </div>

          <div>
            <h3 className="font-semibold text-lg text-foreground leading-tight">
              {car.brand} {car.model}
            </h3>
            <p className="text-sm text-muted-foreground">
              {car.year} • {car.color}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Fuel className="w-3 h-3 text-primary" />
              <span>{t(`fuel_${car.specs.fuel}`)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Settings className="w-3 h-3 text-primary" />
              <span>{t(`transmission_${car.specs.transmission}`)}</span>
            </div>
            {car.specs.power && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary" />
                <span>{car.specs.power}</span>
              </div>
            )}
            {car.specs.engine && (
              <div className="flex items-center gap-1">
                <Settings className="w-3 h-3 text-primary" />
                <span>{car.specs.engine}</span>
              </div>
            )}
            {(car.class === 'minivan' || car.class === '7s') && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-primary" />
                <span>{t('seats_7')}</span>
              </div>
            )}
          </div>

          

          <div className="flex-grow"></div>

          <div className="space-y-2 pt-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {totalPrice.toLocaleString()}฿
                </div>
                <div className="text-sm text-muted-foreground">
                  {dailyPrice}{t('per_day')} • {t('days', { rentalDays })}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {t('deposit')} ฿{car.pricing.deposit.toLocaleString()}
            </div>
          </div>

          <Button 
            onClick={() => onBooking(car)}
            disabled={isSubmitting}
            className="w-full bg-ocean-gradient hover:opacity-90 font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('sending')}</> : 
              <><ArrowRight className="w-4 h-4 ml-2" /> {t('book')}</>
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CarCard;