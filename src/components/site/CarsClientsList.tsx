// src/components/site/CarsClientsList.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, Users, Bike, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCars } from '@/contexts/CarsContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import CarCard from '@/components/CarCard';
import CarCardCompact from '@/components/site/CarCardCompact';
import useEmblaCarousel from 'embla-carousel-react';
// Категории машин
const CATEGORIES = [
  { value: "all", label: "Все", icon: Car },
  { value: "compact", label: "Компакт", icon: Car },
  { value: "sedan", label: "Седаны", icon: Car },
  { value: "suv", label: "SUV", icon: Car },
  { value: "7s", label: "7 мест", icon: Users },
  { value: "bikes", label: "Байки", icon: Bike },
];

// Заглушка при пустых результатах
const CarTeaserPlaceholder = () => (
  <div className="text-center py-12 px-4">
    <Car className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
    <h3 className="text-lg font-semibold mb-2">В этой категории пока нет автомобилей</h3>
    <p className="text-sm text-muted-foreground">
      Попробуйте выбрать другую категорию
    </p>
  </div>
);

export const CarsClientsList = () => {
  const { cars, loading } = useCars();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [rentalDays, setRentalDays] = useState([7]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Embla для мобильной карусели
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false
  });
  const [selectedSlide, setSelectedSlide] = useState(0);

  // Отслеживаем изменение слайда
  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setSelectedSlide(emblaApi.selectedScrollSnap());
    };
    
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Фильтрация по категории
  const filteredCars = useMemo(() => {
    if (!cars) return [];
    
    const available = cars.filter(c => c.available !== false);
    
    if (selectedCategory === 'all') return available;
    
    return available.filter(c => 
      (c.class || '').toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [cars, selectedCategory]);

  // Подсчёт машин по категориям
  const carsByCategory = useMemo(() => {
    if (!cars) return {};
    
    return CATEGORIES.reduce((acc, cat) => {
      if (cat.value === 'all') {
        acc[cat.value] = cars.filter(c => c.available !== false).length;
      } else {
        acc[cat.value] = cars.filter(c => 
          c.available !== false && 
          (c.class || '').toLowerCase() === cat.value.toLowerCase()
        ).length;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [cars]);

  // Разбивка на страницы: мобилка - 4 карточки, десктоп - 6 карточек
  const carPages = useMemo(() => {
    const chunks = [];
    const itemsPerPage = isMobile ? 4 : 6;
    for (let i = 0; i < filteredCars.length; i += itemsPerPage) {
      chunks.push(filteredCars.slice(i, i + itemsPerPage));
    }
    return chunks;
  }, [filteredCars, isMobile]);

  // Обработчик бронирования
  const handleBooking = (car: any) => {
    setIsSubmitting(true);
    console.log('Booking:', car, 'for', rentalDays[0], 'days');
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  // Сброс на первый слайд при смене категории
  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(0);
    }
  }, [selectedCategory, emblaApi]);

  return (
    <section 
      id="vehicles"
      className={cn(
        "relative bg-gradient-to-b from-gray-50 to-white scroll-mt-24",
        isMobile ? "py-8" : "py-16 lg:py-20"
      )}
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
          {/* Заголовок - только на десктопе
          {!isMobile && (
            <div className="text-center mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                Выберите автомобиль
              </h2>
              <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
                {filteredCars.length} {filteredCars.length === 1 ? 'автомобиль' : 'автомобилей'} доступно для аренды
              </p>
            </div>
          )} */}

          {/* Список машин */}
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Загрузка автомобилей...</p>
            </div>
          ) : filteredCars.length === 0 ? (
            <CarTeaserPlaceholder />
          ) : isMobile ? (
            // МОБИЛЬНАЯ ВЕРСИЯ
            <>
              <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold text-foreground">
                    Калькулятор стоимости
                  </h2>
              </div>

              <div className="px-2 mb-4">
                <div className="text-left mb-3">
                  <p className="text-xs text-gray-600 mb-1">Расчет приблизительный. Чем больше срок аренды - тем выгоднее стоимость</p>
                  <p className="text-center-xl font-bold text-blue-500">
                    {rentalDays[0]} {rentalDays[0] === 1 ? 'день' : rentalDays[0] < 5 ? 'дня' : 'дней'}
                  </p>
                </div>
                
                <Slider
                  value={rentalDays}
                  onValueChange={setRentalDays}
                  min={3}
                  max={31}
                  step={1}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>3 дня</span>
                  <span>31 день</span>
                </div>
              </div>

              {/* 2. КАРТОЧКИ - СЕРЕДИНА (4 штуки - 2×2) */}
              <div className="embla mb-4" ref={emblaRef}>
                <div className="embla__container">
                  {carPages.map((page, pageIdx) => (
                    <div key={pageIdx} className="embla__slide">
                      <div className="grid grid-cols-2 gap-2.5">
                        {page.map((car) => (
                          <CarCardCompact
                            key={car.id}
                            car={car}
                            rentalDays={rentalDays[0]}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ИНДИКАТОРЫ */}
              {carPages.length > 1 && (
                <div className="flex justify-center gap-2 mb-6">
                  {carPages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => emblaApi?.scrollTo(idx)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        idx === selectedSlide
                          ? "w-6 bg-blue-600"
                          : "w-1.5 bg-gray-300 hover:bg-gray-400"
                      )}
                      aria-label={`Перейти к странице ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* 3. КАТЕГОРИИ - ВНИЗУ (без иконок) */}
              <div className="px-2">
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const count = carsByCategory[cat.value] || 0;
                    const isActive = selectedCategory === cat.value;
                    
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={cn(
                          "flex items-center justify-center gap-1 rounded-lg font-semibold transition-all border-2 py-2.5 px-2",
                          "text-xs leading-tight",
                          isActive
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        )}
                      >
                        <span>{cat.label}</span>
                        <span className={cn(
                          "font-bold",
                          isActive ? "text-blue-100" : "text-gray-500"
                        )}>
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            // ДЕСКТОП ВЕРСИЯ
            <>
              {/* Табы категорий */}
              <div className="mb-8 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 min-w-max justify-center">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const count = carsByCategory[cat.value] || 0;
                    const isActive = selectedCategory === cat.value;
                    
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full font-medium transition-all border-2 whitespace-nowrap px-4 py-2 text-sm",
                          isActive
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{cat.label}</span>
                        <Badge 
                          variant={isActive ? "secondary" : "outline"}
                          className={cn(
                            "text-[10px] px-1.5 h-4",
                            isActive ? "bg-blue-500 text-white border-blue-400" : ""
                          )}
                        >
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Слайдер дней */}
              <div className="mb-10 max-w-xl mx-auto">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 mb-1">Срок аренды</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {rentalDays[0]} {rentalDays[0] === 1 ? 'день' : rentalDays[0] < 5 ? 'дня' : 'дней'}
                  </p>
                </div>
                
                <Slider
                  value={rentalDays}
                  onValueChange={setRentalDays}
                  min={3}
                  max={31}
                  step={1}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>3 дня</span>
                  <span>31 день</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    rentalDays={rentalDays[0]}
                    onBooking={handleBooking}
                    isSubmitting={isSubmitting}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};