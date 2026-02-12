import { Shield, CheckCircle, ClipboardCheck, Wallet, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import carScheme from "@/assets/car_scheme.webp";

const benefits = [
  {
    title: "Оплата при получении",
    description: "Никаких предоплат — платите только после осмотра авто",
  },
  {
    title: "Проверяете машину перед оплатой",
    description: "Осматриваете автомобиль и убеждаетесь, что всё в порядке",
  },
  {
    title: "Проверка уровня топлива",
    description: "Фиксируем показания и возвращаете с тем же уровнем",
  },
  {
    title: "Фото и видео документация",
    description: "Снимаем состояние авто со всех сторон перед выдачей",
  },
  {
    title: "Прозрачный возврат депозита",
    description: "Депозит у нас — возвращаем сразу после проверки",
  },
  {
    title: "Мы на вашей стороне",
    description: "Поможем решить любые вопросы и спорные ситуации",
  },
];

export const DepositProtectionSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="py-20 bg-gradient-to-br from-ocean-light to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-sm mb-4">
                <Wallet className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">Приемка авто</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Оплата по факту доставки
              </h2>
              <p className="text-muted-foreground text-lg">
                Сначала осматриваете автомобиль, потом оплачиваете. Без предоплат и рисков.
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: Benefits */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-card rounded-2xl p-8 shadow-sm"
              >
                <h3 className="text-2xl font-bold mb-6">Как это работает:</h3>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.li
                      key={benefit.title}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex gap-3"
                    >
                      <CheckCircle className="w-6 h-6 text-tropical-green flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-semibold mb-1">{benefit.title}</div>
                        <div className="text-muted-foreground text-sm">{benefit.description}</div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
              
              {/* Right: Car Inspection Scheme */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-card rounded-2xl p-6 shadow-sm flex flex-col justify-center"
              >
<div 
  className="relative rounded-xl overflow-hidden bg-white p-4 cursor-pointer hover:shadow-lg transition-shadow group"
  onClick={() => setIsModalOpen(true)}
>
  <img 
    src={carScheme} 
    alt="Схема осмотра автомобиля" 
    className="w-full max-w-[250px] mx-auto max-h-[450px] object-contain transition-transform group-hover:scale-105" 
    loading="lazy" 
  />
  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
    <span className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-opacity">
      Нажмите для увеличения
    </span>
  </div>
</div>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Проверяем все элементы кузова и уровень топлива
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative max-w-5xl w-full bg-white rounded-2xl p-4 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={carScheme} 
                alt="Схема осмотра автомобиля" 
                className="w-full h-auto object-contain max-h-[80vh]" 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};