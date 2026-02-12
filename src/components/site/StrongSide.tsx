// src/components/site/WhyUsSection.tsx
import React from "react";
import { motion } from "framer-motion";
import { cn } from '@/lib/utils';
import { MousePointerClick } from 'lucide-react';

// Иконки для фич
import carIcon from '@/assets/icons/car_ico.webp';
import growIcon from '@/assets/icons/grow_ico.webp';
import agrIcon from '@/assets/icons/agr_ico.webp';
import lcsIcon from '@/assets/icons/lcs_ico.webp';
import rusIcon from '@/assets/icons/rus_ico.webp';
import thaiIcon from '@/assets/icons/thai_ico.webp';

// Продающие фичи — наши реальные преимущества
const features = [
  {
    iconSrc: thaiIcon,
    title: "Тайские цены",
    description: "Никаких наценок — вы платите столько же, сколько местные"
  },
  {
    iconSrc: rusIcon,
    title: "Русскоязычная поддержка",
    description: "Решаем вопросы на русском в любое время суток"
  },
  {
    iconSrc: agrIcon,
    title: "Платформа-агрегатор",
    description: "Парки платят нам, а не вы — экономия 20-30% от цены"
  },
  {
    iconSrc: lcsIcon,
    title: "Только официальные парки",
    description: "Все партнёры — лицензированные тайские компании"
  },
  {
    iconSrc: carIcon,
    title: "Огромный выбор",
    description: "74+ автомобилей и байков на любой вкус и бюджет"
  }
];

export const StrongSide = () => {

  return (
    <section 
      id="strong-side"
      className={cn(
        "relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 scroll-mt-24",
        isMobile ? "py-12" : "py-16 lg:py-20"
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
          <div className="text-center mb-12">
            <h2 className={cn(
              "font-bold text-white mb-4 flex items-center justify-center gap-3",
              isMobile ? "text-2xl" : "text-3xl lg:text-4xl"
            )}>
              <MousePointerClick className={cn(
                "text-yellow-300",
                isMobile ? "w-6 h-6" : "w-8 h-8 lg:w-10 lg:h-10"
              )} />
              Бронь в 2 клика
            </h2>
            <p className={cn(
              "text-white/90 max-w-3xl mx-auto leading-relaxed",
              isMobile ? "text-base px-4" : "text-lg lg:text-xl"
            )}>
              Все автомобили застрахованы и обслужены{" "}
              <span className="font-semibold text-yellow-300">Заходи и выбирай</span> 
            </p>
          </div>

          <div className={cn(
            "grid gap-8",
            isMobile ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-3"
          )}>
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className={cn(
                  "rounded-xl flex items-center justify-center flex-shrink-0",
                  "bg-white/10 backdrop-blur-sm",
                  isMobile ? "w-14 h-14 p-2.5" : "w-16 h-16 p-3"
                )}>
                  <img 
                    src={feature.iconSrc} 
                    alt={feature.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h3 className={cn(
                    "font-bold text-white mb-1",
                    isMobile ? "text-lg" : "text-xl"
                  )}>
                    {feature.title}
                  </h3>
                  <p className={cn(
                    "text-white/80",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={cn(
              "mt-16 pt-12 border-t border-white/20",
              "grid gap-8",
              isMobile ? "grid-cols-1" : "grid-cols-3"
            )}
          >
            <div className="text-center">
              <div className={cn(
                "font-bold text-yellow-300 mb-2",
                isMobile ? "text-4xl" : "text-5xl lg:text-6xl"
              )}>
                до 30%
              </div>
              <div className={cn(
                "text-white/90 font-medium",
                isMobile ? "text-sm" : "text-base"
              )}>
                Экономия vs других парков
              </div>
            </div>

            <div className="text-center">
              <div className={cn(
                "font-bold text-yellow-300 mb-2",
                isMobile ? "text-4xl" : "text-5xl lg:text-6xl"
              )}>
                74+
              </div>
              <div className={cn(
                "text-white/90 font-medium",
                isMobile ? "text-sm" : "text-base"
              )}>
                Авто и байков в парке
              </div>
            </div>

            <div className="text-center">
              <div className={cn(
                "font-bold text-yellow-300 mb-2",
                isMobile ? "text-4xl" : "text-5xl lg:text-6xl"
              )}>
                Отсутствует
              </div>
              <div className={cn(
                "text-white/90 font-medium",
                isMobile ? "text-sm" : "text-base"
              )}>
                Комиссия для клиентов
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};