// webapp/src/components/HeroBanner.tsx
import React from 'react';
import heroBg from '@/assets/hero_bg.jpg.webp';
import heroMob from '@/assets/hero_mob.jpg.webp';
import sunnyLogo from '@/assets/logo.png.webp';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { CircleDollarSign, CreditCard, MousePointerClick, Star, Users } from 'lucide-react';

const HeroBanner = ({ park }: { park?: { name: string; minimumPrice: string | null; logo?: React.ReactNode } }) => {
  const { t, language, setLanguage } = useLanguage();
  const isMobile = useIsMobile();

  return (
    <div
      className={`relative overflow-hidden ${park ? 'min-h-72 bg-cover bg-center py-6' : 'bg-white pt-12 pb-14 sm:pb-24'}`}
      style={park ? { backgroundImage: `url(${isMobile ? heroMob : heroBg})` } : undefined}
    >
      {/* Dark overlay */}
      {park && <div className="absolute inset-0 bg-black/50" />}
     
      {/* Top badges */}
{!park && <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
  {/* Rating badge - left */}
  <div className="flex items-center gap-1.5">
    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
    <span className="text-slate-900 font-semibold text-sm">4.8</span>
    <span className="text-slate-600 text-xs">(100+ reviews) </span>
  </div>
</div>}
      {/* Main content */}
      <div className={`relative flex flex-col justify-center px-4 ${park ? 'mx-auto max-w-6xl text-white sm:px-6 lg:px-8' : 'text-slate-900'}`}>
        {/* Main title */}
        {park?.logo}
        {!park && <img src={sunnyLogo} alt="Sunny Rentals" width={184} height={184}
          className="mx-auto mb-3 h-24 w-24 object-contain" />}
        <h1 className={`text-3xl font-bold mb-2 break-words ${park ? 'text-left drop-shadow-lg' : 'text-center'}`}>
          {park ? park.name : language === 'ru'
            ? 'Аренда на Пхукете'
            : 'Car Rental in Phuket'}
        </h1>
       
        {/* Subtitle */}
        <p className={`mb-6 ${park ? 'text-lg text-left drop-shadow-md opacity-90' : 'mx-auto max-w-md text-center text-base text-slate-600'}`}>
          {park ? 'Выберите транспорт и даты вашей поездки' : language === 'ru'
            ? 'Sunny Rentals — большой выбор проверенных авто'
            : 'Sunny Rentals - wide selection of verified cars'}
        </p>

        {/* Feature cards - HORIZONTAL LAYOUT */}
        <div className={`grid grid-cols-3 gap-2 max-w-2xl ${park ? 'w-full' : 'mx-auto'}`}>
          {/* Card 1 */}
          <div className={`${park ? 'bg-white/20 backdrop-blur-sm' : 'bg-slate-100 text-slate-800'} rounded-lg p-2 flex flex-row items-center gap-2`}>
            <CircleDollarSign className="w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <div className="text-xs font-semibold leading-tight">
                {park ? park.minimumPrice ? `От ${park.minimumPrice}` : 'Цены' : language === 'ru' ? 'От 600฿' : 'st.600฿'}
              </div>
              <div className="text-xs opacity-90 leading-tight">
                {park ? park.minimumPrice ? 'за сутки' : 'в карточках' : language === 'ru' ? 'в сутки' : 'per day'}
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className={`${park ? 'bg-white/20 backdrop-blur-sm' : 'bg-slate-100 text-slate-800'} rounded-lg p-2 flex flex-row items-center gap-2`}>
            <CreditCard className="w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <div className="text-xs font-semibold leading-tight">
                {park ? 'Депозит' : language === 'ru' ? 'Оплата' : 'Payment'}
              </div>
              <div className="text-xs opacity-90 leading-tight">
                {park ? 'отдельно' : language === 'ru' ? 'на месте' : 'on-site'}
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className={`${park ? 'bg-white/20 backdrop-blur-sm' : 'bg-slate-100 text-slate-800'} rounded-lg p-2 flex flex-row items-center gap-2`}>
            <MousePointerClick className="w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <div className="text-xs font-semibold leading-tight">
                {park ? 'Заявка' : language === 'ru' ? 'Аренда' : 'Rent'}
              </div>
              <div className="text-xs opacity-90 leading-tight">
                {park ? 'через Telegram' : language === 'ru' ? 'в 2 клика' : 'in 2 clicks'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
