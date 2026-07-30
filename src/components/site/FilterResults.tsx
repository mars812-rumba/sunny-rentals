import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Car, Star, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import FilterForm from '@/components/FilterForm';
import CarList from '@/components/CarList';
import BookingModal, { BookingModalProps } from '@/components/site/BookingModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCars } from '@/contexts/CarsContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { addDays, isValid } from 'date-fns';



// Функция определения сезона на основе даты
const getSeason = (date: Date | null | undefined): 'high_season' | 'low_season' => {
  if (!date || !isValid(date)) {
    return 'low_season'; // Default to low_season for invalid dates
  }
  const month = date.getMonth() + 1; // getMonth() возвращает 0-11, нужно 1-12

  // Высокий сезон: ноябрь (11) - апрель (4)
  // Низкий сезон: май (5) - октябрь (10)
  if (month >= 11 || month <= 4) {
    return 'high_season';
  }
  return 'low_season';
};

const getPriceForPeriod = (pricing: any, days: number, startDate?: Date) => {
  // Определяем сезон на основе даты начала аренды
  const season = startDate ? getSeason(startDate) : 'low_season';

  // Если нет цен для определенного сезона, используем low_season как fallback
  const seasonPricing = pricing[season] || pricing['low_season'];

  if (days >= 30) return seasonPricing.price_30;
  if (days >= 15) return seasonPricing.price_15_29;
  if (days >= 7) return seasonPricing.price_7_14;
  return seasonPricing.price_1_6;
};

const getDeliveryPrice = (location: string) => location === 'airport' ? 0 : 500;

interface FilterResultsProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  showResults: boolean;
  setShowResults: (show: boolean) => void;
  filters: any;
  setFilters: (filters: any) => void;
  selectedCar: any;
  setSelectedCar: (car: any) => void;
  isBookingModalOpen: boolean;
  setIsBookingModalOpen: (open: boolean) => void;
  isSubmittingBooking: boolean;
  setIsSubmittingBooking: (submitting: boolean) => void;
  isBookingSubmitted: boolean;
  setIsBookingSubmitted: (submitted: boolean) => void;
  bookingId: string | null;
  setBookingId: (id: string | null) => void;
  deepLinkCarId: string | null;
  setDeepLinkCarId: (id: string | null) => void;
}

export const FilterResults = ({
  selectedCategory,
  setSelectedCategory,
  showResults,
  setShowResults,
  filters,
  setFilters,
  selectedCar,
  setSelectedCar,
  isBookingModalOpen,
  setIsBookingModalOpen,
  isSubmittingBooking,
  setIsSubmittingBooking,
  isBookingSubmitted,
  setIsBookingSubmitted,
  bookingId,
  setBookingId,
  deepLinkCarId,
  setDeepLinkCarId
}: FilterResultsProps) => {
    const { t, language } = useLanguage();
    const { cars } = useCars();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const carListRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const carIdParam = params.get('carId');
  const durationParam = params.get('duration');
  const categoryParam = params.get('category');
  const pickupLocationParam = params.get('pickupLocation');
  const returnLocationParam = params.get('returnLocation');
  
  let newFilters = { ...filters }; // ✅ Начинаем с текущих фильтров
  let hasParams = false;

  if (durationParam) {
    const durationDays = parseInt(durationParam, 10);
    // ✅ Такая же валидация как в Index
    if (!isNaN(durationDays) && durationDays > 0) {
      const today = new Date();
      const endDate = addDays(today, durationDays);
      newFilters = { 
        ...newFilters, 
        startDate: today, 
        endDate: endDate, 
        days: durationDays 
      };
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
  
  // ✅ Применяем изменения только если были параметры
  if (hasParams) {
    setFilters(newFilters);
    setShowResults(true);
  }
  
  if (categoryParam) {
    setSelectedCategory(categoryParam);
  }
  
  if (carIdParam) {
    setDeepLinkCarId(carIdParam);
  }
  
  if (hasParams || carIdParam || categoryParam) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}, []); // ✅ Пустой массив зависимостей
      useEffect(() => {
        if (deepLinkCarId && carListRef.current && cars.length > 0) {
          const el = carListRef.current.querySelector(`[data-car-id="${deepLinkCarId}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setDeepLinkCarId(null);
        }
      }, [deepLinkCarId, cars, showResults]);
    
      const categories = [
        { id: 'sedan', name: t('category_sedan') },
        { id: 'suv', name: t('category_suv') },
        { id: 'compact', name: t('category_compact') },
        { id: '7s', name: t('category_7s') },
        { id: 'bikes', name: t('bikes') },
      ];
    
      const carsToDisplay = selectedCategory ? cars.filter((car: any) => car.class === selectedCategory) : [];
    
      const handleFiltersChange = useCallback((newFilters: any) => {
        setFilters(newFilters);
        if (selectedCategory && newFilters.startDate && newFilters.pickupLocation) {
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
        setIsBookingSubmitted(false);
        setBookingId(null);
        window.open('https://t.me/webapp_rent_bot', '_blank', 'noopener,noreferrer');
      };
    
    
    
      // Booking functionality removed - only main app should handle bookings
   return (
    <>


      {/* Mobile Filter Section */}
      {isMobile && (
        <section id="fleet" className="bg-background py-8 -mt-6 relative z-20 rounded-t-3xl shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Подобрать транспорт
              </h2>
            </div>
            <FilterForm
              onFiltersChange={handleFiltersChange}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        </section>
      )}

      {/* Results Section */}
      <section className="py-12 lg:py-16 bg-blue/30">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {!showResults ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                  <ArrowUp className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {language === 'ru' ? 'Выберите параметры аренды' : 'Select rental parameters'}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {language === 'ru' 
                    ? 'Укажите даты, место доставки и категорию — покажем доступные варианты' 
                    : 'Select dates, delivery location and category — we will show available options'}
                </p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-center mb-8">
                  <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                    {t('found_cars', { count: carsToDisplay.length, category: categories.find(c => c.id === selectedCategory)?.name })}
                  </h2>
                  <p className="text-muted-foreground">
                    {language === 'ru' ? 'Выберите транспорт и забронируйте через Telegram' : 'Select a vehicle and book via Telegram'}
                  </p>
                </div>
                <CarList 
                  ref={carListRef} 
                  cars={carsToDisplay} 
                  filters={filters} 
                  onBooking={handleCarBooking} 
                  isSubmitting={isSubmittingBooking} 
                />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        car={selectedCar}
        filters={filters}
        // Booking functionality removed - only main app should handle bookings
        isSubmitted={isBookingSubmitted}
        bookingId={bookingId}
      />
    </>
  );
};

// Экспорт компонента формы для использования в HeroSection
export const DesktopFilterForm = ({
  selectedCategory,
  onCategoryChange,
  filters,
  onFiltersChange,
}: {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  filters: any;
  onFiltersChange: (filters: any) => void;
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/20 p-6 lg:p-8 border border-white/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl lg:text-2xl font-bold text-foreground">
          Подобрать транспорт
        </h2>
      </div>
      <FilterForm
        onFiltersChange={onFiltersChange}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
      />
    </div>
  );
};

export default FilterResults;
