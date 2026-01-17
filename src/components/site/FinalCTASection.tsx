import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

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
              className={cn(buttonVariants({ size: "xl" }), "bg-white text-accent hover:bg-gray-100 shadow-lg")}
            >
              🚀 Открыть каталог в Telegram
            </a>
            <a
              href="/"
              className={cn(buttonVariants({ variant: "hero", size: "xl" }))}
            >
              📱 Выбрать на сайте
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
