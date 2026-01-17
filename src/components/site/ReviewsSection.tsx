import { Star, MessageCircle, ExternalLink, Quote, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

// Ссылка на ваше видео (или импорт)
import telegramIcon from "@/assets/icons/telegram_ico.webp";
import instagramIcon from "@/assets/icons/instagram_ico.webp";

import videoReviewFile from "@/assets/video_review.mp4";
import videoPosterImage from "@/assets/video_preview.webp";


const reviews = [
  {
    author: "Артем",
    text: "Спасибо за доверие! Рад, что Xpander зашёл и всем было комфортно 💪 Благодаря нормальной отзывчивой команде все вопросы становятся решаемы🙏",
    telegramLink: "https://t.me/carbook_in_phuket/4814",
    rating: 5,
  },
  {
    author: "Клиент",
    text: "Брал в аренду MG5 на 2 дня. Первое что хотел бы выделить это то что дали авто на такой короткий срок, не каждый рентал дает. Авто получил в срок, чистое, салон был чист, все работало отлично.",
    telegramLink: "https://t.me/carbook_in_phuket/5228",
    rating: 5,
  },
  {
    author: "Клиент",
    text: "Брали машину у Марселя. Все организовано качественно, машину доставили в аэропорт вовремя. Обслуживание 👍🏻 Рекомендуем 🤝",
    telegramLink: "https://t.me/carbook_in_phuket/2848",
    rating: 5,
  },
  {
    author: "Клиент",
    text: "Прилетаем на Пхукет второй год подряд, машину беру соответственно только тут, машинки все новые, приятные, человек всегда на связи если вдруг возникнут вопросы всегда поможет! 🔥🤝👌",
    telegramLink: "https://t.me/carbook_in_phuket/2515",
    rating: 5,
  },
  {
    author: "Клиент",
    text: "Заказывали Хпандер 7 мест, так как две семьи, на 10 дней. Что-то с Хпандером не получилось, но тут же нашли замену исузу, крутой 7 местный. За те же деньги. Всё круто, оперативно, быстро решают вопросы!",
    telegramLink: "https://t.me/carbook_in_phuket/2336",
    rating: 5,
  },
  {
    author: "Клиент",
    text: "Брал Яриса 2023 года на 10 дней.👍 Откатались на ура 🙌",
    telegramLink: "https://t.me/carbook_in_phuket/2284",
    rating: 5,
  },
  {
    author: "Клиент",
    text: "2 раза уже у Марселя машины брал. Оба раза новые, без проблем, сервис, все четко👍",
    telegramLink: "https://t.me/carbook_in_phuket/2281",
    rating: 5,
  },
  {
    author: "Клиент",
    text: "2 месяца на xpander ездил благодаря этой группе 👍 все четко! 5 взрослых и 2 детей нормально, машина не маленькая))👍👌",
    telegramLink: "https://t.me/carbook_in_phuket/2280",
    rating: 5,
  },
];

export const ReviewsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // Состояние для отслеживания клика

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1 >= reviews.length ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const currentReview = reviews[currentIndex];

  return (
    // Добавлен id="reviews"
    <section id="reviews" className="py-20 bg-gradient-to-br from-ocean-light via-blue-50 to-white overflow-hidden">
      <div className="container mx-auto px-4">
        
        {/* --- 1. ЗАГОЛОВОК --- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12" 
        >
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-2 shadow-sm mb-6 border border-blue-100">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm uppercase tracking-wide text-primary">Отзывы клиентов</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight">
            Что говорят{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              наши клиенты
            </span>
          </h2>
          
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Мы гордимся каждым отзывом. Читайте реальные истории наших клиентов из Telegram-канала.
          </p>
        </motion.div>

        {/* --- 2. КОНТЕНТ (Сетка) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Левая колонка: Слайдер с отзывами */}
          <div className="flex flex-col justify-center">
            
            {/* Review Card Slider */}
            <div className="relative mb-10 min-h-[320px]"> 
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-3xl p-8 shadow-xl border border-blue-50 relative h-auto flex flex-col"
                >
                  <Quote className="absolute top-6 right-8 text-blue-100 w-12 h-12 rotate-180" />
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                       <img src={telegramIcon} alt="TG" className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="font-bold text-xl text-gray-900">{currentReview.author}</div>
                      <div className="flex gap-1">
                        {Array.from({ length: currentReview.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-lg text-gray-700 leading-relaxed italic">
                      &quot;{currentReview.text}&quot;
                    </p>
                  </div>

                  <div className="pt-6 mt-auto border-t border-gray-100">
                    <a
                      href={currentReview.telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:text-blue-700 font-semibold transition-colors"
                    >
                      Читать оригинал в Telegram
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-8">
              <button
                onClick={prevSlide}
                className="w-12 h-12 bg-white rounded-full shadow-md hover:shadow-lg hover:bg-primary hover:text-white transition-all flex items-center justify-center group"
              >
                <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              <div className="text-sm font-medium text-gray-400">
                {currentIndex + 1} / {reviews.length}
              </div>
              <button
                onClick={nextSlide}
                className="w-12 h-12 bg-white rounded-full shadow-md hover:shadow-lg hover:bg-primary hover:text-white transition-all flex items-center justify-center group"
              >
                <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            {/* Instagram Link */}
            <div className="flex justify-center lg:justify-start">
                <motion.a
                href="https://www.instagram.com/stories/highlights/18051917455385470/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 text-gray-600 hover:text-primary transition-colors group w-fit"
                >
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <img src={instagramIcon} alt="Instagram" className="w-6 h-6" />
                </div>
                <span className="font-semibold underline decoration-dotted underline-offset-4">Смотреть хайлайтс в Instagram</span>
                </motion.a>
            </div>
          </div>

          {/* Правая колонка: Видео */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative h-full flex items-center justify-center lg:justify-end"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-100/50 blur-3xl rounded-full -z-10" />

            <div className="relative group w-full max-w-[400px]">
              <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="relative overflow-hidden rounded-[2rem] bg-black aspect-[9/16] shadow-inner group">
                  
                  {/* --- УСЛОВНЫЙ РЕНДЕРИНГ: КАРТИНКА ИЛИ ВИДЕО --- */}
                  {!isVideoPlaying ? (
                    // 1. Показываем обложку и кнопку Play
                    <div 
                      className="w-full h-full relative cursor-pointer group"
                      onClick={() => setIsVideoPlaying(true)}
                    >
                      <img 
                        src={videoPosterImage} 
                        alt="Video Preview" 
                        className="w-full h-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                      />
                      {/* Затемнение поверх картинки */}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      
                      {/* Кнопка Play по центру */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-2xl transition-transform duration-300 group-hover:scale-110">
                           <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md">
                              <Play className="w-6 h-6 text-primary ml-1 fill-primary" />
                           </div>
                        </div>
                      </div>

                      {/* Бейдж "Видео-отзыв" */}
                      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                        <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          Видео-отзыв
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 2. Если нажали Play, подгружаем и запускаем видео
                    <video 
                      autoPlay
                      controls
                      className="w-full h-full object-cover"
                      playsInline
                    >
                      <source src={videoReviewFile} type="video/mp4" />
                      Ваш браузер не поддерживает видео.
                    </video>
                  )}
                  
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 -z-20 w-24 h-24 bg-yellow-400 rounded-full blur-2xl opacity-40"></div>
              <div className="absolute -top-6 -left-6 -z-20 w-32 h-32 bg-primary rounded-full blur-2xl opacity-30"></div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};