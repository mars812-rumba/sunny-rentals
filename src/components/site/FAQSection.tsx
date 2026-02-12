import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Какие документы нужны для аренды?",
    answer: "Только 2 документа: паспорт и водительские права. Международные права (IDP) НЕ требуются для граждан России, США и большинства других стран.",
  },
  {
    question: "Нужны ли МВУ(IDP) для аренды?",
    answer: `Зависит от страны:<br/>
    • 🇷🇺 Россия: НЕ нужны<br/>
    • 🇺🇸 США: НЕ нужны<br/>
    • 🇬🇧 UK: Нужны IDP<br/>
    • 🇮🇳 Индия: Нужны IDP<br/><br/>`,
  },
  {
    question: "Какая предоплата нужна?",
    answer: "Никакой! Оплата только при получении автомобиля наличными или картой.",
  },
  {
    question: "Как работает депозит?",
    answer: "Депозит 5,000-10,000฿ передаете нам (не владельцу) при получении авто. Возврат 100% при возврате авто без повреждений. Мы документируем состояние авто фото/видео при выдаче и возврате.",
  },
  {
    question: "Можно ли ездить в другие провинции?",
    answer: "Да, в стоимость аренды входят: Пхукет, Краби и Пхангна. Самуи и Панган необходимо согласование",
  },
  {
    question: "Что делать при ДТП?",
    answer: "Сразу звоните в нашу поддержку 24/7. Мы поможем со всем: консультация на русском, помощь с полицией, организация эвакуатора. Все авто застрахованы 1 класса.",
  },
];

export const FAQSection = () => {
  return (
    <section id="faq" className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-center mb-12"
        >
          Частые вопросы
        </motion.h2>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                // Изменили отступы: px-4 для мобильных, md:px-6 для ПК
                className="bg-card rounded-xl px-4 md:px-6 border-0"
              >
                <AccordionTrigger 
                  // Изменили шрифт: text-sm для мобильных, md:text-lg для ПК
                  // text-left гарантирует выравнивание слева
                  className="text-sm md:text-lg font-semibold hover:no-underline text-left py-4"
                >
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm md:text-base">
                  <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};