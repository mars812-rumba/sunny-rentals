import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parseISO, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import FilterForm from '@/components/FilterForm';
import SendBookForm from '@/components/SendBookForm';
import { Car, Truck, Users, Lock, CircleDollarSign, CreditCard, MousePointerClick, Bike } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import CarList from '@/components/CarList';
import HeroBanner from '@/components/HeroBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCars } from '@/contexts/CarsContext';
import { isValid } from 'date-fns';
import { trackLeadEvent } from '@/api/api';

// --- Pricing helpers ---
const determineSeason = (startDate: Date) => {
  const month = startDate.getMonth() + 1; // 1-12
  // High season: December (12), January (1), February (2)
  if (month === 12 || month === 1 || month === 2) {
    return 'high_season';
  }
  return 'low_season';
};

const getPriceForPeriod = (pricing, days, startDate: Date) => {
  const season = determineSeason(startDate);
  if (days >= 30) return pricing[season].price_30;
  if (days >= 15) return pricing[season].price_15_29;
  if (days >= 7) return pricing[season].price_7_14;
  return pricing[season].price_1_6;
};

const getDeliveryPrice = (location) => {
  return location === 'airport' ? 0 : 500;
};

const Index = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { cars, loading: carsLoading } = useCars();
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    pickupLocation: '',
    returnLocation: '',
    days: 0
  });
  const carListRef = useRef<HTMLDivElement>(null);
  const [deepLinkCarId, setDeepLinkCarId] = useState<string | null>(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [isSendBookFormOpen, setIsSendBookFormOpen] = useState(false);
  const isMobile = useIsMobile();
  // ✅ Состояния для CarList - SendBookForm теперь самостоятельный
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false); // Для совместимости с CarList

  const [availableCars, setAvailableCars] = useState(0);
  const [bookedToday, setBookedToday] = useState(0);
  const [today] = useState(() => new Date());
  const [hasTrackedFilters, setHasTrackedFilters] = useState(false);

  // ✅ Флаг отслеживания filters_used


  const getRandomInt = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
    setShowResults(true);
    setHasTrackedFilters(false); // Сбрасываем флаг при изменении фильтров
  }, []);

  // Сброс флага при изменении категории
  useEffect(() => {
    setHasTrackedFilters(false);
  }, [selectedCategory]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const carIdParam = params.get('carId');
    const durationParam = params.get('duration');
    const categoryParam = params.get('category');
    const pickupLocationParam = params.get('pickupLocation');
    const returnLocationParam = params.get('returnLocation');

    let newFilters = {};
    let categoryToSet = '';
    let hasParams = false;

    if (durationParam) {
      const durationDays = parseInt(durationParam, 10);
      if (!isNaN(durationDays) && durationDays > 0) {
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

    setSelectedCategory(categoryToSet);

    if (carIdParam) {
      setDeepLinkCarId(carIdParam);
    }

    if (hasParams || carIdParam) {
      history.replaceState(null, '', window.location.pathname);
    }
  }, [today]);

  const categories = [
    { id: 'sedan', name: t('category_sedan'), icon: Car },
    { id: 'suv', name: t('category_suv'), icon: Truck },
    { id: 'compact', name: t('category_compact'), icon: Car },
    { id: '7s', name: t('category_7s'), icon: Users },
    { id: 'bikes', name: t('bikes'), icon: Bike },
  ];

  const getFilteredCars = () => {
    // ✅ ФИКС: Проверка на cars
    if (!selectedCategory || !cars) return [];
    return cars.filter((car: any) => car.class === selectedCategory);
  };

  const carsToDisplay = getFilteredCars();

  useEffect(() => {
    if (deepLinkCarId && carListRef.current && cars && cars.length > 0) {
      const targetCarCard = carListRef.current.querySelector(`[data-car-id="${deepLinkCarId}"]`);
      if (targetCarCard) {
        targetCarCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setDeepLinkCarId(null);
      }
    }
  }, [deepLinkCarId, cars, showResults]);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setShowResults(true);
  }, []);

  const handleCarBooking = (car: any) => {
    if (!filters.startDate || !filters.endDate || !filters.pickupLocation) {
      toast({ title: t('toast_fill_filters'), variant: "destructive" });
      return;
    }
    setSelectedCar(car);
    setIsSendBookFormOpen(true);
    // ✅ УДАЛЕНЫ: состояния теперь в SendBookForm
  };

// ✅ УДАЛЕНА: дублирующая функция - теперь используется SendBookForm
// Логика бронирования перенесена в SendBookForm для изоляции

  const renderBottomContent = () => {
    if (!showResults) {
      return (
        <div className={isMobile 
          ? "bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl p-5 text-gray-800 mt-8 shadow-lg"
          : "mt-12"
        }>
          {isMobile ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center opacity-0 animate-stat-item-appear" style={{ animationDelay: '0.1s' }}>
                  <div className="text-2xl font-bold text-blue-600">50+</div>
                  <div className="text-xs text-gray-600 leading-tight">{t('in_base')}</div>
                </div>
                <div className="text-center opacity-0 animate-stat-item-appear" style={{ animationDelay: '0.2s' }}>
                  <div className="text-2xl font-bold text-green-600 animate-number-update-anim">{availableCars}</div>
                  <div className="text-xs text-gray-600 leading-tight">{t('available')}</div>
                </div>
                <div className="text-center opacity-0 animate-stat-item-appear" style={{ animationDelay: '0.3s' }}>
                  <div className="text-2xl font-bold text-orange-600 animate-number-update-anim">{bookedToday}</div>
                  <div className="text-xs text-gray-600 leading-tight" dangerouslySetInnerHTML={{ __html: t('booked_today_html') }}></div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 font-medium">{t('choose_delivery_date_class')}</p>
              </div>
            </>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 shadow-xl border border-blue-100"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Почему Sunny Rentals?</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CircleDollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Лучшие цены на Пхукете</h4>
                      <p className="text-sm text-gray-600">От 600฿ в сутки. Скидки до 40% при аренде от 15 дней</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Car className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">50+ проверенных авто</h4>
                      <p className="text-sm text-gray-600">Все автомобили застрахованы и проходят техосмотр</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MousePointerClick className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Бронирование за 2 минуты</h4>
                      <p className="text-sm text-gray-600">Простая форма, мгновенное подтверждение</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-orange-50 to-white rounded-3xl p-8 shadow-xl border border-orange-100"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Что входит в стоимость</h3>
                </div>

                <div className="space-y-3">
                  {[
                    'Неограниченный километраж',
                    'Страховка авто и водителя',
                    'Бесплатная отмена за 24 часа',
                    'Помощь на дороге 24/7',
                    'Детские кресла бесплатно',
                    'Полный бак топлива',
                    'Мойка автомобиля включена',
                    'Доставка в аэропорт — бесплатно'
                  ].map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <span className="text-gray-700 font-medium">{item}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-orange-200">
                  <p className="text-center text-gray-600 font-medium">
                    <span className="text-blue-600 font-bold">Без скрытых платежей</span> — всё честно и прозрачно
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      );
    }

if (filters.startDate && filters.endDate && 
    filters.startDate instanceof Date && filters.endDate instanceof Date &&
    isValid(filters.startDate) && isValid(filters.endDate) &&
    selectedCategory && !hasTrackedFilters && carsToDisplay.length > 0) {
  
  const tg = window.Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;
  
  if (userId) {
    trackLeadEvent('filters_used', {
      startDate: filters.startDate.toISOString(),
      endDate: filters.endDate.toISOString(),
      
    });
    setHasTrackedFilters(true);
  }
}


// ✅ Трекаем filters_used ОДИН РАЗ когда показываем результаты
if (filters.startDate && filters.endDate && 
    filters.startDate instanceof Date && filters.endDate instanceof Date &&
    selectedCategory && !hasTrackedFilters && carsToDisplay.length > 0) {
  
  const tg = window.Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;
  
  if (userId) {
    console.log('🎯 Tracking filters_used event for user:', userId);
    
    try {
      trackLeadEvent('filters_used', {
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        days: filters.days,
        category: selectedCategory,
        pickupLocation: filters.pickupLocation,
        returnLocation: filters.returnLocation
      }).then(() => {
        console.log('✅ filters_used tracked');
      }).catch(err => {
        console.error('❌ Failed to track filters_used:', err);
      });
      
      setHasTrackedFilters(true);
    } catch (err) {
      console.error('❌ Error tracking filters:', err);
    }
  } else {
    console.log('⚠️ No Telegram user - skipping filters_used tracking');
  }
}
    return (
      <div className="mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xl font-semibold text-gray-800 mb-6"
        >
          {t('found_cars', { count: carsToDisplay.length, category: categories.find(cat => cat.id === selectedCategory)?.name })}
        </motion.div>
        <CarList ref={carListRef} cars={carsToDisplay} filters={filters} onBooking={handleCarBooking} isSubmitting={isSubmittingBooking} />
      </div>
    );
  };

  // ✅ ФИКС: Loading state
  if (carsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  // ✅ ДОБАВЬ ЭТО
if (!cars || cars.length === 0) {
  return <div className="flex items-center justify-center h-screen">
    <div>Загрузка автомобилей...</div>
  </div>;
}

  return (
    <div className={isMobile 
      ? "min-h-screen bg-gradient-to-br from-orange-100/30 via-amber-50/25 to-yellow-50/30" 
      : "min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50"}>
      <HeroBanner />

      <div className="relative">
        <div className={isMobile ? "max-w-4xl mx-auto px-4" : "max-w-6xl mx-auto px-6 lg:px-8"}>
          <div className={isMobile ? "-mt-8 z-10 relative" : "-mt-20 z-10 relative"}>
            <FilterForm
              onFiltersChange={handleFiltersChange}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
          
          {renderBottomContent()}
        </div>
      </div>

      <SendBookForm
        isOpen={isSendBookFormOpen}
        onClose={() => setIsSendBookFormOpen(false)}
        car={selectedCar}
        filters={filters}
        requireWhatsApp={!window.Telegram?.WebApp?.initDataUnsafe?.user?.username}
      />
    </div>
  );
};

export default Index;