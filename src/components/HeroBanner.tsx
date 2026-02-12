// webapp/src/components/HeroBanner.tsx
import React from 'react';
import heroBg from '@/assets/hero_bg.jpg';
import heroMob from '@/assets/hero_mob.jpg';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { CircleDollarSign, CreditCard, MousePointerClick, Star, Users } from 'lucide-react';

const HeroBanner = () => {
  const { t, language, setLanguage } = useLanguage();
  const isMobile = useIsMobile();

  return (
    <div
      className="relative h-64 overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${isMobile ? heroMob : heroBg})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50"></div>
     
      {/* Top badges */}
<div className="absolute top-4 left-4 right-4 flex justify-between items-start">
  {/* Rating badge - left */}
  <div className="flex items-center gap-1.5">
    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
    <span className="text-white font-semibold text-sm drop-shadow-lg">4.8</span>
    <span className="text-white/90 text-xs drop-shadow-lg">(100+ reviews) </span>
  </div>
</div>
      {/* Main content */}
      <div className="relative h-full flex flex-col justify-center px-4 text-white">
        {/* Main title */}
        <h1 className="text-3xl font-bold mb-2 drop-shadow-lg text-center">
          {language === 'ru'
            ? 'Аренда на Пхукете'
            : 'Car Rental in Phuket'}
        </h1>
       
        {/* Subtitle */}
        <p className="text-lg mb-6 drop-shadow-md text-center opacity-90">
          {language === 'ru'
            ? 'Sunny Rentals - большой выбор проверенных авто и байков'
            : 'Sunny Rentals - wide selection of verified cars'}
        </p>

        {/* Feature cards - HORIZONTAL LAYOUT */}
        <div className="grid grid-cols-3 gap-2 max-w-2xl mx-auto">
          {/* Card 1 */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 flex flex-row items-center gap-2">
            <CircleDollarSign className="w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <div className="text-xs font-semibold leading-tight">
                {language === 'ru' ? 'От 600฿' : 'st.600฿'}
              </div>
              <div className="text-xs opacity-90 leading-tight">
                {language === 'ru' ? 'в сутки' : 'per day'}
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 flex flex-row items-center gap-2">
            <CreditCard className="w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <div className="text-xs font-semibold leading-tight">
                {language === 'ru' ? 'Оплата' : 'Payment'}
              </div>
              <div className="text-xs opacity-90 leading-tight">
                {language === 'ru' ? 'на месте' : 'on-site'}
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 flex flex-row items-center gap-2">
            <MousePointerClick className="w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <div className="text-xs font-semibold leading-tight">
                {language === 'ru' ? 'Аренда' : 'Rent'}
              </div>
              <div className="text-xs opacity-90 leading-tight">
                {language === 'ru' ? 'в 2 клика' : 'in 2 clicks'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;