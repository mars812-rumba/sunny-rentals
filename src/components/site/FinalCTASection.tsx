import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import telegramIcon from "@/assets/icons/telegram_ico.webp";
import whatsappIcon from "@/assets/icons/wa_ico.webp";

export const FinalCTASection = () => {
  return (
    <section className="py-20 bg-dark-blue text-white">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Готовы забронировать авто?
          </h2>
          <p className="text-xl md:text-2xl opacity-90 mb-10">
            От 600฿/день • Без предоплаты • 2 документа
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
            <a
              href="https://t.me/webapp_rent_bot"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "xl" }), "gap-2 bg-[#229ED9] text-white hover:bg-[#168dcc] shadow-lg")}
            >
              <img src={telegramIcon} alt="" className="h-6 w-6" />
              Забронировать через Telegram
            </a>
            <a
              href="https://wa.me/66842039140"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "xl" }), "gap-2 bg-[#25D366] text-white hover:bg-[#1fbd5b] shadow-lg")}
            >
              <img src={whatsappIcon} alt="" className="h-6 w-6" />
              Написать в WhatsApp
            </a>
          </div>
          
          <p className="mt-8 text-sm opacity-75">
            Бронирование занимает 2 минуты
          </p>
        </motion.div>
      </div>
    </section>
  );
};
