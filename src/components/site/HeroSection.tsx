import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Star } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import heroImage from '@/assets/hero_bg.webp';
import heroImageMob from '@/assets/hero_bg.png';
import logo from '@/assets/logo.png';

import compactImg from '@/assets/classes/compact_realistic.webp';
import sedanImg from '@/assets/classes/sedan_realistic.webp';
import seatImg from '@/assets/classes/7seat_realistic.webp';
import suvImg from '@/assets/classes/suv_realistic.webp';
import bikeImg from '@/assets/classes/bike_realistic.webp';

// Gallery data for vehicle classes
interface HeroSectionProps {
  desktopForm?: React.ReactNode;
}

export const HeroSection = ({ desktopForm }: HeroSectionProps) => {
    const isMobile = useIsMobile();
    const reduceMotion = useReducedMotion();
    const [isHeroReady, setIsHeroReady] = useState(false);
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const [activeSlide, setActiveSlide] = useState(0);
    const [hasUsedCarousel, setHasUsedCarousel] = useState(false);
    const [useMobileAssets] = useState(() => (
      typeof window !== 'undefined'
        ? window.matchMedia('(max-width: 767px)').matches
        : false
    ));

    const vehicleGallery = [
    { image: compactImg, title: 'Компакт', description: 'Экономия и парковка', price: '600฿', shadowBottom: 22, shadowWidth: 58 },
    { image: sedanImg, title: 'Седан', description: 'Комфорт и вместительность', price: '700฿', shadowBottom: 23, shadowWidth: 58 },
    { image: seatImg, title: '7-местный', description: 'Для семьи и большой компании', price: '1,100฿', shadowBottom: 22, shadowWidth: 60 },
    { image: suvImg, title: 'SUV', description: 'Уверенность на дороге', price: '1,400฿', shadowBottom: 22, shadowWidth: 56 },
    { image: bikeImg, title: 'Байк', description: 'Быстрое передвижение', price: '250฿', shadowBottom: 12, shadowWidth: 42 },
  ];

  useEffect(() => {
    let isActive = true;

    const preloadImage = (src: string) => new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => {
        if (typeof image.decode === 'function') {
          image.decode().catch(() => undefined).finally(resolve);
          return;
        }

        resolve();
      };
      image.onerror = () => resolve();
      image.fetchPriority = 'high';
      image.src = src;
    });

    const criticalImages = useMobileAssets
      ? [logo, heroImageMob, compactImg]
      : [logo, heroImage, compactImg];

    const minimumDisplay = new Promise<void>((resolve) => {
      window.setTimeout(resolve, reduceMotion ? 100 : 450);
    });
    const safetyTimeout = window.setTimeout(() => {
      if (isActive) setIsHeroReady(true);
    }, 5000);

    Promise.all([
      ...criticalImages.map(preloadImage),
      minimumDisplay,
    ]).then(() => {
      if (isActive) {
        window.clearTimeout(safetyTimeout);
        setIsHeroReady(true);
      }
    });

    return () => {
      isActive = false;
      window.clearTimeout(safetyTimeout);
    };
  }, [reduceMotion, useMobileAssets]);

  useEffect(() => {
    if (!carouselApi) return;

    const updateActiveSlide = () => {
      setActiveSlide(carouselApi.selectedScrollSnap());
    };

    updateActiveSlide();
    carouselApi.on('select', updateActiveSlide);
    carouselApi.on('reInit', updateActiveSlide);

    return () => {
      carouselApi.off('select', updateActiveSlide);
      carouselApi.off('reInit', updateActiveSlide);
    };
  }, [carouselApi]);

   return (
    <>
      <AnimatePresence>
        {!isHeroReady && (
          <motion.div
            key="hero-preloader"
            role="status"
            aria-label="Загружаем Sunny Rentals"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-gradient-to-br from-blue-950 via-sky-900 to-cyan-700 text-white"
          >
            <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.22),transparent_34%)]" />
            <div className="relative flex flex-col items-center px-6 text-center">
              <div className="relative grid h-20 w-20 place-items-center">
                <motion.div
                  animate={reduceMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border border-white/20 border-t-amber-300"
                />
                <motion.img
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  animate={reduceMotion ? undefined : { scale: [0.94, 1.04, 0.94] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-16 w-16 object-contain drop-shadow-[0_8px_18px_rgba(2,22,45,0.45)]"
                />
              </div>

              <div className="mt-6 text-xl font-black tracking-tight">Sunny Rentals</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                Phuket
              </div>

              <div className="mt-7 h-0.5 w-36 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={reduceMotion ? { x: 0 } : { x: ['-100%', '120%'] }}
                  transition={reduceMotion
                    ? { duration: 0 }
                    : { duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-300 to-amber-300"
                />
              </div>
              <span className="sr-only">Загружаем страницу</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] lg:min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100"
            style={{ backgroundImage: `url(${useMobileAssets ? heroImageMob : heroImage})` }}
          />
          <div
            className={cn(
              "absolute inset-0",
              isMobile
                ? "bg-gradient-to-b from-slate-950/55 via-slate-950/20 to-slate-950/65"
                : "bg-gradient-to-br from-black/40 via-black/25 to-primary-dark/25"
            )}
          />
          {/* Decorative gradient orbs */}
          <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
          <div className="relative z-10 container mx-auto px-4 pt-1.5 pb-24 lg:pt-8 lg:pb-16">
          <div className={cn(
            "grid gap-8 lg:gap-16 items-start",
            isMobile ? "grid-cols-1" : desktopForm ? "lg:grid-cols-2" : "lg:grid-cols-1"
          )}>
            {/* Left: Marketing Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className={cn("text-white", !desktopForm && "mx-auto w-full max-w-5xl text-center")}
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
                 Аренда авто и байков на Пхукете
              </h1>

              <p className={cn(
                "mb-4 text-white/85",
                isMobile ? "text-lg font-medium leading-snug" : "text-xl"
              )}>
                Расчет стоимости аренды в онлайн калькуляторе
              </p>

              <div className={cn(
                "relative mx-auto lg:mx-0",
                isMobile ? "max-w-[380px]" : "max-w-[620px]",
                !desktopForm && "lg:mx-auto"
              )}></div>

              {/* Vehicle Gallery Carousel */}
              <div className="relative">
                <Carousel
                  setApi={setCarouselApi}
                  onPointerDown={() => setHasUsedCarousel(true)}
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
                            "relative flex items-center justify-center",
                            isMobile ? "mb-1 h-[210px] w-[270px]" : "mb-4 h-[360px] w-[500px]"
                          )}>
                            <div
                              aria-hidden="true"
                              className="absolute left-1/2 h-3 -translate-x-1/2 rounded-full bg-slate-950/45 blur-lg"
                              style={{
                                bottom: `${vehicle.shadowBottom}%`,
                                width: `${vehicle.shadowWidth}%`,
                              }}
                            />
                            <img
                              src={vehicle.image}
                              alt={vehicle.title}
                              className="relative z-10 h-full w-full object-contain drop-shadow-[0_14px_16px_rgba(2,12,24,0.34)]"
                            />
                          </div>
                          <div className="mx-auto flex w-full max-w-[320px] items-center justify-between gap-4 rounded-[18px] border border-white/30 bg-gradient-to-r from-white/20 via-slate-900/25 to-sky-950/35 px-4 py-2.5 text-left shadow-[0_14px_36px_rgba(2,14,28,0.24)] backdrop-blur-2xl sm:max-w-[360px]">
                            <div className="min-w-0">
                              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">
                                Категория
                              </div>
                              <div className="mt-0.5 text-base font-black leading-tight text-white">
                                {vehicle.title}
                              </div>
                              <div className="mt-0.5 truncate text-[11px] font-medium text-white/65">
                                {vehicle.description}
                              </div>
                            </div>
                            <div className="shrink-0 border-l border-white/20 pl-4 text-right">
                              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">
                                от
                              </div>
                              <div className="mt-0.5 text-xl font-black leading-none text-white">
                                {vehicle.price}
                              </div>
                              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">
                                за сутки
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>

                  <div className="mt-4 flex items-center justify-center gap-2" aria-label="Категории транспорта">
                    {vehicleGallery.map((vehicle, index) => (
                      <button
                        key={vehicle.title}
                        type="button"
                        onClick={() => {
                          carouselApi?.scrollTo(index);
                          setHasUsedCarousel(true);
                        }}
                        aria-label={`Показать категорию ${vehicle.title}`}
                        aria-current={activeSlide === index ? 'true' : undefined}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                          activeSlide === index
                            ? "w-7 bg-amber-300"
                            : "w-1.5 bg-white/35 hover:bg-white/60"
                        )}
                      />
                    ))}
                  </div>

                  <AnimatePresence>
                    {isMobile && !hasUsedCarousel && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25 }}
                        className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-white/65"
                      >
                        <span>Свайпните категории</span>
                        <motion.span
                          animate={reduceMotion ? undefined : { x: [0, 8, 0] }}
                          transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Carousel>
              </div>
            </motion.div>

            {/* Right: Filter Form - Desktop */}
            {!isMobile && desktopForm && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                {desktopForm}
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

   </>
  );
};
export default HeroSection;
