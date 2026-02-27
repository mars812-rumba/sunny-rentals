import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowDown, Search, Car, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import FilterForm from '@/components/FilterForm';
import CarListLoader from '@/components/CarListLoader';
import CarList from '@/components/CarList';
import BookingModal from '@/components/site/BookingModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCars } from '@/contexts/CarsContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

import heroImage from '@/assets/hero_bg.webp';
import heroImageMob from '@/assets/hero_bg.png';

// Gallery images mobile
import compactImg from '@/assets/classes/compact.png';
import sedanImg from '@/assets/classes/sedan.png';
import seatImg from '@/assets/classes/7seat.png';
import suvImg from '@/assets/classes/suv.png';
import bikeImg from '@/assets/classes/bike.png';
// Gallery images 600px
import compactImg600 from '@/assets/classes/compact_desk.png';
import sedanImg600 from '@/assets/classes/sedan_desk.png';
import seatImg600 from '@/assets/classes/7seat_desk.png';
import suvImg600 from '@/assets/classes/suv_desk.png';
import bikeImg600 from '@/assets/classes/bike_desk.png';

const getPriceForPeriod = (pricing: any, days: number) => {
  const season = 'low_season';
  if (days >= 30) return pricing[season].price_30;
  if (days >= 15) return pricing[season].price_15_29;
  if (days >= 7) return pricing[season].price_7_14;
  return pricing[season].price_1_6;
};

const getDeliveryPrice = (location: string) => location === 'airport' ? 0 : 500;

export const HeroSectionWithFilters = () => {
  const { t, language } = useLanguage();
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
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isBookingSubmitted, setIsBookingSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [deepLinkCarId, setDeepLinkCarId] = useState<string | null>(null);

  // Gallery data for vehicle classes
    const vehicleGallery = [
    { imageMobile: compactImg, imageDesktop: compactImg600, title: language === 'ru' ? 'Компакт' : 'Compact', description: language === 'ru' ? 'Экономия и парковка' : 'Perfect for city', price: 'от 600฿' },
    { imageMobile: sedanImg, imageDesktop: sedanImg600, title: language === 'ru' ? 'Седан' : 'Sedan', description: language === 'ru' ? 'Комфорт и вместительность' : 'Comfort and style', price: 'от 700฿' },
    { imageMobile: seatImg, imageDesktop: seatImg600, title: language === 'ru' ? '7-местный' : '7-Seater', description: language === 'ru' ? 'Для семьи и большой компании' : 'For large groups', price: 'от 1,100฿' },
    { imageMobile: suvImg, imageDesktop: suvImg600, title: 'SUV', description: language === 'ru' ? 'Уверенность на дороге' : 'Power and capability', price: 'от 1,400฿' },
    { imageMobile: bikeImg, imageDesktop: bikeImg600, title: language === 'ru' ? 'Байк' : 'Bike', description: language === 'ru' ? 'Быстрое передвижение' : 'Freedom of movement', price: 'от 250฿' },
  ];

  // Deep link handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const carIdParam = params.get('carId');
    const durationParam = params.get('duration');
    const categoryParam = params.get('category');
    const pickupLocationParam = params.get('pickupLocation');
    const returnLocationParam = params.get('returnLocation');

    let shouldUpdateFilters = false;
    let newFilters = { ...filters };

    if (durationParam) {
      const durationDays = parseInt(durationParam, 10);
      if (!isNaN(durationDays) && durationDays > 0) {
        const today = new Date();
        newFilters = { ...newFilters, startDate: today, endDate: addDays(today, durationDays), days: durationDays };
        shouldUpdateFilters = true;
      }
    }
    if (pickupLocationParam) { newFilters.pickupLocation = pickupLocationParam; shouldUpdateFilters = true; }
    if (returnLocationParam) { newFilters.returnLocation = returnLocationParam; shouldUpdateFilters = true; }
    if (shouldUpdateFilters) setFilters(newFilters);
    if (categoryParam) setSelectedCategory(categoryParam);
    if (carIdParam) setDeepLinkCarId(carIdParam);
    if (carIdParam || durationParam || categoryParam || pickupLocationParam || returnLocationParam) {
      history.replaceState(null, '', window.location.pathname);
    }
  }, []);

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
    setIsBookingModalOpen(true);
    setIsBookingSubmitted(false);
    setBookingId(null);
  };

  // Booking functionality removed - only main app should handle bookings


  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] lg:min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100"
            style={{ backgroundImage: `url(${isMobile ? heroImageMob : heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-black/25 to-primary-dark/15" />
          {/* Decorative gradient orbs */}
          <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
          <div className="relative z-10 container mx-auto px-4 pt-1.5 pb-12 lg:pt-8 lg:pb-16">
          <div className={cn(
            "grid gap-8 lg:gap-16 items-start",
            isMobile ? "grid-cols-1" : "lg:grid-cols-2"
          )}>
            {/* Left: Marketing Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-white"
            >
              {/* Rating Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-3 py-1.5 mb-4"
              >
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-white/90">4,8 средний рейтинг партнеров</span>
              </motion.div>

              {/* Title */}
              <h1 className={cn(
                "font-bold leading-[1.1] mb-3 tracking-tight",
                isMobile ? "text-3xl" : "text-4xl lg:text-5xl"
                )}>
                {language === 'ru' ? 'Аренда авто и байков на Пхукете' : 'Car & Bike Rental in Phuket'}
              </h1>

              <p className={cn(
                "text-white/70 mb-4",
                isMobile ? "text-base" : "text-lg"
              )}>
                {language === 'ru' ? 'Расчет стоимости аренды в онлайн калькуляторе' : 'Calculate rental cost in online calculator'}
              </p>

              <div className={cn(
                "relative mx-auto lg:mx-0",
                isMobile ? "max-w-[380px]" : "max-w-[620px]"
              )}></div>

              {/* Vehicle Gallery Carousel */}
              <div className="relative">
                <Carousel
                  opts={{
                    align: "center",
                    loop: true,
                    dragFree: false,
                    containScroll: "trimSnaps",
                    slidesToScroll: 1,
                  }}
                  className="w-full"
                >
                  <CarouselContent>
                    {vehicleGallery.map((vehicle, index) => (
                      <CarouselItem key={index}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="flex flex-col items-center"
                        >
                          <div className={cn(
                            "flex items-center justify-center mb-4",
                            isMobile ? "w-[280px] h-[240px]" : "w-[500px] h-[400px]"
                          )}>
                            <img
                              src={isMobile ? vehicle.imageMobile : vehicle.imageDesktop}
                              alt={vehicle.title}
                              className="w-full h-full object-contain drop-shadow-2xl"
                            />
                          </div>
                          <div className="p-3 text-center">
                          <div className="font-semibold text-white text-sm mb-0.5">{vehicle.title}</div>
                          <div className="text-white/60 text-xs mb-1">{vehicle.description}</div>
                          <div className="text-blue font-bold text-sm">{vehicle.price} <span className="font-normal text-white/60">в сутки</span></div>
                        </div>
                        </motion.div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>

                  {/* Navigation arrows */}
                  <>
                    <CarouselPrevious
                      className={cn(
                        "bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 hover:text-white transition-all",
                        isMobile
                          ? "left-0 h-16 w-5 rounded-r-lg rounded-lg"
                          : "left-4 h-10 w-10 rounded-full"
                      )}
                    />
                    <CarouselNext
                      className={cn(
                        "bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 hover:text-white transition-all",
                        isMobile
                          ? "right-0 h-16 w-5 rounded-l-lg rounded-r-lg"
                          : "right-4 h-10 w-10 rounded-full"
                      )}
                    />
                  </>
                </Carousel>
              </div>
            </motion.div>

            {/* Right: Filter Form - Desktop */}
            {!isMobile && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/20 p-6 lg:p-8 border border-white/50"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold text-foreground">
                    Подобрать транспорт
                  </h2>
                </div>
                <FilterForm
                  onFiltersChange={handleFiltersChange}
                  selectedCategory={selectedCategory}
                  onCategoryChange={handleCategoryChange}
                />
              </motion.div>
            )}
          </div>

          {/* Scroll Indicator */}
          {!isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            >
              <span className="text-white/50 text-sm">Листайте вниз</span>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ArrowDown className="w-5 h-5 text-white/50" />
              </motion.div>
            </motion.div>
          )}
        </div>
      </section>

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

      {/* Desktop anchor */}
      {!isMobile && <div id="fleet" className="scroll-mt-20" />}

      {/* Results Section */}
      <section className="py-12 lg:py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {!showResults ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                  <Car className="w-8 h-8 text-primary" />
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
                    {language === 'ru' ? 'Выберите транспорт и забронируйте онлайн' : 'Select vehicle and book online'}
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

export default HeroSectionWithFilters;
