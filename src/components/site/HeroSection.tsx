import React from 'react';
import { ArrowDown, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
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
import telegramIcon from '@/assets/icons/telegram_ico.webp';
import whatsappIcon from '@/assets/icons/wa_ico.webp';

// Gallery data for vehicle classes
interface HeroSectionProps {
  desktopForm?: React.ReactNode;
}

export const HeroSection = ({ desktopForm }: HeroSectionProps) => {
    const isMobile = useIsMobile();
    const vehicleGallery = [
    { imageMobile: compactImg, imageDesktop: compactImg600, title:  'Компакт' , description: 'Экономия и парковка', price: 'от 600฿' },
    { imageMobile: sedanImg, imageDesktop: sedanImg600, title: 'Седан' , description: 'Комфорт и вместительность' , price: 'от 700฿' },
    { imageMobile: seatImg, imageDesktop: seatImg600, title:  '7-местный' , description:  'Для семьи и большой компании', price: 'от 1,100฿' },
    { imageMobile: suvImg, imageDesktop: suvImg600, title: 'SUV', description:   'Уверенность на дороге', price: 'от 1,400฿' },
    { imageMobile: bikeImg, imageDesktop: bikeImg600, title: 'Байк', description: 'Быстрое передвижение', price: 'от 250฿' },
  ];
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
                "text-white/70 mb-4",
                isMobile ? "text-base" : "text-lg"
              )}>
                Расчет стоимости аренды в онлайн калькуляторе
              </p>

              <div className="mb-5 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href="https://t.me/webapp_rent_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#229ED9] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-950/25 transition hover:-translate-y-0.5 hover:bg-[#168dcc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/50"
                >
                  <img src={telegramIcon} alt="" className="h-5 w-5" />
                  Забронировать через Telegram
                </a>
                <a
                  href="https://wa.me/66842039140"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/25 transition hover:-translate-y-0.5 hover:bg-[#1fbd5b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50"
                >
                  <img src={whatsappIcon} alt="" className="h-5 w-5" />
                  Написать в WhatsApp
                </a>
              </div>

              <div className={cn(
                "relative mx-auto lg:mx-0",
                isMobile ? "max-w-[380px]" : "max-w-[620px]",
                !desktopForm && "lg:mx-auto"
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
