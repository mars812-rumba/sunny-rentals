import { Bot, Zap, Database, Clock, Sparkles, Send } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

const botFeatures = [
  {
    icon: Database,
    title: "Живая база",
    description: "Синхронизация с автопарком в реальном времени"
  },
  {
    icon: Clock,
    title: "Работает 24/7",
    description: "Мгновенные ответы даже ночью, без выходных"
  },
  {
    icon: Sparkles,
    title: "ИИ-подбор",
    description: "Поможет найти идеальный вариант под ваш бюджет"
  },
  {
    icon: Zap,
    title: "Быстро",
    description: "Бронирование в 3 клика без долгих переписок"
  }
];

export const TelegramPromoSection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-primary to-blue-700 text-white overflow-hidden relative">
      {/* Декоративные круги на фоне */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Header Block */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 mb-8 shadow-lg">
              <Bot className="w-5 h-5 text-blue-200 animate-pulse" />
              <span className="font-semibold text-sm tracking-wide text-blue-100 uppercase">AI Booking System</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Бронируйте авто через <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-white">
                умного Telegram-бота
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-blue-100/90 mb-12 max-w-2xl mx-auto leading-relaxed">
              Наш бот с ИИ-ассистентом подключен к базе напрямую. Он подберет машину или байк за минуту, проверит наличие и оформит заявку.
            </p>
          </motion.div>
          
          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12"
          >
            {botFeatures.map((feature, index) => (
              <div 
                key={feature.title} 
                className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 group text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-blue-100/80 leading-snug">
                  {feature.description}
                </p>
              </div>
            ))}
          </motion.div>
          
          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <a 
              href="https://t.me/webapp_rent_bot/" // Замените на ссылку самого бота, если она отличается от канала
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "xl" }), 
                "bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 shadow-xl hover:shadow-2xl transition-all px-8 py-6 rounded-full text-lg font-bold gap-3"
              )}
            >
              <Send className="w-5 h-5" />
              Запустить бота
            </a>
            <p className="mt-4 text-sm text-white/60">
              Нажмите, чтобы открыть в Telegram
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
};