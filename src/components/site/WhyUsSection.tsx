// src/components/sections/WhyUsSection.tsx
import React from "react";
import { motion } from "framer-motion";

// ======= ИМПОРТ ТВОИХ ИКОНОК (проверь пути!) =======
import depoIcon from "../../assets/icons/depo_ico.png";
import prepayIcon from "../../assets/icons/prepay_ico.png";
import insIcon from "../../assets/icons/ins_ico.png";
import helpIcon from "../../assets/icons/help_ico.png";
import checkIcon from "../../assets/icons/check_ico.png";
import bookIcon from "../../assets/icons/book_ico.png";

// ======= ДАННЫЕ =======
const features = [
  { icon: depoIcon,    title: "Депозит под защитой",         desc: "Храним депозит у себя, не передаем владельцу. Возврат 100% при отсутствии повреждений." },
  { icon: prepayIcon,  title: "Без предоплаты",              desc: "Оплата при получении авто наличными или картой. Никаких скрытых платежей." },
  { icon: insIcon,     title: "Страховка 1 класса",          desc: "Все автомобили застрахованы. Помощь при ДТП доступна 24/7." },
  { icon: helpIcon,    title: "Поддержка 24/7",               desc: "Telegram, WhatsApp, телефон. Ответим за 5 минут в любое время суток." },
  { icon: checkIcon,   title: "Проверенные авто",            desc: "Каждое авто проходит проверку. Реальные фото, актуальное состояние." },
  { icon: bookIcon,    title: "Простое бронирование",        desc: "Нужны только 2 документа: паспорт и водительские права." },
];

// ======= КОМПОНЕНТ =======
export const WhyUsSection = () => {
  return (
    <section id="why-us" className="relative py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      {/* Лёгкий фон-шар */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 md:w-[600px] md:h-[600px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16 lg:mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-black tracking-tight">
            Почему выбирают <span className="text-primary">Sunny Rentals</span>?
          </h2>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Мы — не просто прокат. Мы — твой надёжный бро на Пхукете.
          </p>
        </motion.div>

        {/* Карточки */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative"
            >
              {/* Blur-подсветка */}
              <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500" />

              <div className="relative h-full bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-8 lg:p-10 overflow-hidden
                              transition-all duration-500 ease-out
                              group-hover:border-primary/60 group-hover:shadow-2xl group-hover:-translate-y-3
                              will-change-transform">
                
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Иконка */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="mb-8 inline-block p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl shadow-lg ring-2 ring-primary/20"
                >
                  <img src={feat.icon} alt={feat.title} className="w-16 h-16 object-contain" />
                </motion.div>

                <h3 className="text-2xl lg:text-3xl font-bold mb-4 transition-colors group-hover:text-primary">
                  {feat.title}
                </h3>

                <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                  {feat.desc}
                </p>

                {/* Нижняя полоска */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};