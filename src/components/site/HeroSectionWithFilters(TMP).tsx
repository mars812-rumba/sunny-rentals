import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, ArrowDown, Search, Zap, Bot, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import FilterForm from '@/components/FilterForm';
import CarListLoader from '@/components/CarListLoader';
import CarList from '@/components/CarList';
import BookingModal from '@/components/site/BookingModal';
import CarTeaserPlaceholder from '@/components/site/CarTeaserPlaceholder';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCars } from '@/contexts/CarsContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { addDays } from 'date-fns';
import { cn } from '@/lib/utils';

import heroImage from '@/assets/hero_bg.webp';
import heroMobileImage from '@/assets/hero-background.webp';
import telegramIcon from "@/assets/icons/telegram_ico.webp";
import instagramIcon from "@/assets/icons/instagram_ico.webp";

const getPriceForPeriod = (pricing: any, days: number) => {
  const season = 'high_season';
  if (days >= 30) return pricing[season].price_30;
  if (days >= 15) return pricing[season].price_15_29;
  if (days >= 7) return pricing[season].price_7_14;
  return pricing[season].price_1_6;
};

const getDeliveryPrice = (location: string) => {
  return location === 'airport' ? 0 : 500;
};

export const HeroSectionWithFilters = () => {
  const { t } = useLanguage();
  const { cars } = useCars();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const carListRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [filters, setFilters] = useState<any>({
    startDate: null,
    endDate: null,
    pickupLocation: '',
    returnLocation: '',
    days: 0
  });
  const [initialFilters, setInitialFilters] = useState(null);

  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isBookingSubmitted, setIsBookingSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [deepLinkCarId, setDeepLinkCarId] = useState<string | null>(null);

  // === ВСЯ ТВОЯ ЛОГИКА ОСТАЛАСЬ БЕЗ ИЗМЕНЕНИЙ ===
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const carIdParam = params.get('carId');
    const durationParam = params.get('duration');
    const categoryParam = params.get('category');
    const pickupLocationParam = params.get('pickupLocation');
    const returnLocationParam = params.get('returnLocation');

    let newFilters: any = {};
    let categoryToSet = '';
    let hasParams = false;

    if (durationParam) {
      const durationDays = parseInt(durationParam, 10);
      if (!isNaN(durationDays) && durationDays > 0) {
        const today = new Date();
        const endDate = addDays(today, durationDays);
        newFilters = { ...newFilters, startDate: today, endDate, days: durationDays };
        hasParams = true;
      }
    }

    if (pickupLocationParam) {
      newFilters = { ...newFilters, pickupLocation: pickupLocationParam };
      hasParams = true;
    }
    if (returnLocationParam) {
      newFilters = { ...newFilters, returnLocation: returnLocationParam };
      hasParams = true;
    }
    if (categoryParam) {
      categoryToSet = categoryParam;
      hasParams = true;
    }
    
    setInitialFilters(newFilters);
    if (categoryToSet) {
      setSelectedCategory(categoryToSet);
    }

    if (carIdParam) {
      setDeepLinkCarId(carIdParam);
    }

    if (hasParams || carIdParam) {
      history.replaceState(null, '', window.location.pathname);
      // If params exist, we should probably show results right away if they are sufficient
      if (newFilters.startDate && newFilters.pickupLocation && categoryToSet) {
        setFilters(prev => ({...prev, ...newFilters}));
        setShowResults(true);
      }
    }
  }, []);

  useEffect(() => {
    if (deepLinkCarId && carListRef.current && cars.length > 0) {
      const targetCarCard = carListRef.current.querySelector(`[data-car-id="${deepLinkCarId}"]`);
      if (targetCarCard) {
        targetCarCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setDeepLinkCarId(null);
      }
    }
  }, [deepLinkCarId, cars, showResults]);

  const categories = [
    { id: 'sedan', name: t('category_sedan') },
    { id: 'suv', name: t('category_suv') },
    { id: 'compact', name: t('category_compact') },
    { id: '7s', name: t('category_7s') },
    { id: 'bikes', name: t('bikes') },
  ];

  const getFilteredCars = () => {
    if (!selectedCategory) return [];
    return cars.filter((car: any) => car.class === selectedCategory);
  };
  const carsToDisplay = getFilteredCars();

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
    if (selectedCategory) {
      setShowResults(true);
    }
  }, [selectedCategory]);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    if (filters.startDate && filters.pickupLocation) {
        setShowResults(true);
    }
  }, [filters]);

  const handleCarBooking = (car: any) => {
    if (!showResults) {
      toast({ title: t('toast_fill_filters'), variant: "destructive" });
      return;
    }
    setSelectedCar(car);
    setIsBookingModalOpen(true);
    setIsBookingSubmitted(false);
    setBookingId(null);
  };

  // Booking functionality removed - only main app should handle bookings

  

  return (
    <>
      {/* ======================= ГЕРОЙСКАЯ СЕКЦИЯ 2025–2026 ======================= */}
      <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950">
        {/* Фон */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{ backgroundImage: isMobile ? `url(${heroMobileImage})` : `url(${heroImage})` }} />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Соцсети */}
        <div className="absolute top-6 left-4 z-50 flex gap-4">
          <a href="https://t.me/carbook_in_phuket" target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full flex items-center justify-center hover:bg-cyan-500/30 transition-all hover:scale-110">
            <img src={telegramIcon} alt="Telegram" className="w-7 h-7" />
          </a>
          <a href="https://instagram.com/sunny.rentals.phuket" target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full flex items-center justify-center hover:bg-pink-500/30 transition-all hover:scale-110">
            <img src={instagramIcon} alt="Instagram" className="w-7 h-7" />
          </a>
        </div>

        <div className="relative z-10 h-screen flex flex-col justify-center items-center px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-5xl">
            {/* Заголовок */}
            <h1 className={cn("font-black text-white leading-tight mb-5", isMobile ? "text-4xl" : "text-6xl lg:text-7xl")}>
              Аренда авто и байков<br />
              <span className="text-cyan-400">за 2 минуты</span> с AI-менеджером
            </h1>

            <p className="text-xl md:text-2xl text-white/90 font-medium mb-8">
              Без предоплаты · Оплата при получении · Доставка в аэропорт бесплатно
            </p>

            {/* Цены в горячий сезон */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-10">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 text-left">
                <div className="text-3xl font-black text-white mb-1">Авто</div>
                <div className="text-3xl font-bold text-cyan-300">от 800 ฿/сутки</div>
                <div className="text-lg text-white/80">от 15 000 ฿/месяц</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 text-left">
                <div className="text-3xl font-black text-white mb-1">Байки</div>
                <div className="text-3xl font-bold text-cyan-300">от 250 ฿/сутки</div>
                <div className="text-lg text-white/80">от 6 000 ฿/месяц</div>
              </motion.div>
            </div>

            {/* УТП иконки */}
            <div className="flex flex-wrap justify-center gap-8 mb-12 text-white/90">
              <div className="flex items-center gap-3"><Bot className="w-9 h-9 text-cyan-400" /><span className="font-semibold">AI-менеджер 24/7</span></div>
              <div className="flex items-center gap-3"><Zap className="w-9 h-9 text-cyan-400" /><span className="font-semibold">Бронь в 2 клика</span></div>
              <div className="flex items-center gap-3"><Clock className="w-9 h-9 text-cyan-400" /><span className="font-semibold">Ответ за секунды</span></div>
            </div>

            {/* Главная кнопка */}
            <motion.button
              onClick={() => document.getElementById('fleet')?.scrollIntoView({ behavior: 'smooth' })}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              whileHover={{ scale: 1.08 }}
              className="group relative inline-flex items-center gap-5 px-12 py-7 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-2xl font-bold rounded-full shadow-2xl hover:shadow-cyan-500/60 transition-all"
            >
              <Search className="w-8 h-8" />
              Забронировать за 2 минуты
              <ArrowDown className="w-8 h-8 group-hover:translate-y-1 transition-transform" />
            </motion.button>

            <p className="mt-6 text-white/70 text-base md:text-lg">
              Никаких звонков и долгих переписок — AI подберёт машину и оформит бронь мгновенно
            </p>
          </motion.div>
        </div>
      </section>

      {/* ======================= ФИЛЬТРЫ ======================= */}
      <section id="fleet" className="bg-gradient-to-b from-gray-50 to-white scroll-mt-20 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Подобрать транспорт</h2>
          </div>
          <FilterForm
            onFiltersChange={handleFiltersChange}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            initialFilters={initialFilters}
          />
        </div>
      </section>

      {/* ======================= ПЛЕЙСХОЛДЕР И РЕЗУЛЬТАТЫ ======================= */}
      {!showResults ? (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4 max-w-7xl"><CarTeaserPlaceholder /></div>
        </section>
      ) : (
        <section className="py-8 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="mt-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center text-xl font-semibold text-gray-800 mb-6">
                {t('found_cars', { count: carsToDisplay.length, category: categories.find(c => c.id === selectedCategory)?.name })}
              </motion.div>
              <CarList ref={carListRef} cars={carsToDisplay} filters={filters} onBooking={handleCarBooking} isSubmitting={isSubmittingBooking} />
            </div>
          </div>
        </section>
      )}

      {/* ======================= МОДАЛКА БРОНИ ======================= */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        car={selectedCar}
        filters={filters}
        isSubmitted={isBookingSubmitted}
        bookingId={bookingId}
      />
    </>
  );
};

export default HeroSectionWithFilters;