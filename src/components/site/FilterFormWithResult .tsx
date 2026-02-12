import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import FilterForm from '@/components/FilterForm';
import CarList from '@/components/CarList';
import CarTeaserPlaceholder from '@/components/site/CarTeaserPlaceholder';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCars } from '@/contexts/CarsContext';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';

interface FilterFormWithResultsProps {
  onCarBooking: (car: any, filters: any) => void;
}

const FilterFormWithResults: React.FC<FilterFormWithResultsProps> = ({ onCarBooking }) => {
  const { t } = useLanguage();
  const { cars } = useCars();
  const { toast } = useToast();
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
  const [initialFilters, setInitialFilters] = useState<any>(null);
  const [deepLinkCarId, setDeepLinkCarId] = useState<string | null>(null);

  // Deep link парсинг при загрузке
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const carId = params.get('carId');
    const duration = params.get('duration');
    const category = params.get('category');
    const pickup = params.get('pickupLocation');
    const returnLoc = params.get('returnLocation');

    let newFilters: any = {};
    let hasParams = false;

    if (duration) {
      const days = parseInt(duration, 10);
      if (!isNaN(days) && days > 0) {
        const today = new Date();
        newFilters = { 
          ...newFilters, 
          startDate: today, 
          endDate: addDays(today, days), 
          days 
        };
        hasParams = true;
      }
    }
    if (pickup) { 
      newFilters.pickupLocation = pickup; 
      hasParams = true; 
    }
    if (returnLoc) { 
      newFilters.returnLocation = returnLoc; 
      hasParams = true; 
    }
    if (category) { 
      setSelectedCategory(category); 
      hasParams = true; 
    }
    if (carId) {
      setDeepLinkCarId(carId);
    }

    if (hasParams) {
      setInitialFilters(newFilters);
      // Очищаем URL от параметров
      history.replaceState(null, '', window.location.pathname);
      
      // Автоматически показываем результаты если все необходимые фильтры заполнены
      if (newFilters.startDate && newFilters.pickupLocation && category) {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setShowResults(true);
      }
    }
  }, []);

  // Скролл к конкретной машине из deep link
  useEffect(() => {
    if (deepLinkCarId && carListRef.current && cars.length > 0 && showResults) {
      const el = carListRef.current.querySelector(`[data-car-id="${deepLinkCarId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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

  const carsToDisplay = selectedCategory 
    ? cars.filter((car: any) => car.class === selectedCategory) 
    : [];

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
    if (!showResults || !filters.startDate || !filters.pickupLocation) {
      return toast({ 
        title: t('toast_fill_filters'), 
        variant: "destructive" 
      });
    }
    onCarBooking(car, filters);
  };

  return (
    <>
      {/* Секция фильтров */}
      <section 
        id="fleet" 
        className="bg-gradient-to-b from-gray-50 to-white scroll-mt-16 py-10 md:py-12"
      >
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-8">
            Подобрать транспорт
          </h2>
          <FilterForm
            onFiltersChange={handleFiltersChange}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            initialFilters={initialFilters}
          />
        </div>
      </section>

      {/* Результаты или плейсхолдер */}
      {!showResults ? (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <CarTeaserPlaceholder />
          </div>
        </section>
      ) : (
        <section className="py-8 bg-gray-50">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center text-xl font-semibold text-gray-800 mb-6"
            >
              {t('found_cars', { 
                count: carsToDisplay.length, 
                category: categories.find(c => c.id === selectedCategory)?.name 
              })}
            </motion.div>
            <CarList 
              ref={carListRef} 
              cars={carsToDisplay} 
              filters={filters} 
              onBooking={handleCarBooking} 
            />
          </div>
        </section>
      )}
    </>
  );
};

export default FilterFormWithResults;