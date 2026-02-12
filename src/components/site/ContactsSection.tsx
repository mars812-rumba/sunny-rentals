import { motion } from "framer-motion";
import { ExternalLink, Clock } from "lucide-react";

// Импорт иконок
import waIcon from "@/assets/icons/wa_ico.png";
import botIcon from "@/assets/icons/bot_ico.png";
import channelIcon from "@/assets/icons/tgk_ico.png";
import telegramIcon from "@/assets/icons/telegram_ico.png";
import instagramIcon from "@/assets/icons/instagram_ico.png";

const contacts = [
  {
    title: "Бронирование (Бот)",
    subtitle: "Моментальный подбор авто",
    value: "@webapp_rent_bot",
    link: "https://t.me/webapp_rent_bot",
    icon: botIcon,
    badge: "24/7",
    primary: true,
  },
  {
    title: "Личная поддержка",
    subtitle: "Марсель",
    value: "@marseloid",
    link: "https://t.me/marseloid",
    icon: telegramIcon,
    online: true,
  },
  {
    title: "WhatsApp",
    subtitle: "Звонки и чат",
    value: "+66 84 203 9140",
    link: "https://wa.me/66842039140",
    icon: waIcon,
  },
  {
    title: "Наш канал",
    subtitle: "Новости и отзывы",
    value: "Sunny Rentals Channel",
    link: "https://t.me/carbook_in_phuket",
    icon: channelIcon,
  },
  {
    title: "Instagram",
    subtitle: "Фото авто и сторис",
    value: "@sunny.rentals.phuket",
    link: "https://instagram.com/sunny.rentals.phuket",
    icon: instagramIcon,
  },
];

export const ContactsSection = () => {
  return (
    <section id="contacts" className="py-24 bg-gradient-to-b from-white to-blue-50/50 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/30 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-1.5 shadow-sm mb-6 text-sm font-medium text-gray-500">
            <Clock className="w-4 h-4 text-green-500" />
            <span>Среднее время ответа — 5 минут</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            Свяжитесь с нами
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Выберите удобный способ связи. Мы поможем с выбором, ответим на вопросы и организуем доставку авто.
          </p>
        </motion.div>
        
        <div className="flex flex-wrap justify-center gap-6 max-w-7xl mx-auto">
          {contacts.map((contact, index) => (
            <motion.div // <--- ИЗМЕНЕНО: теперь это div, а не a
              key={contact.value}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`
                group relative flex flex-col items-center p-8 rounded-[2rem] transition-all duration-300
                border hover:-translate-y-2 hover:shadow-xl w-full sm:w-80 cursor-default
                ${contact.primary 
                  ? "bg-white border-blue-200 shadow-blue-100 ring-4 ring-blue-50" 
                  : "bg-white border-gray-100 shadow-sm"
                }
              `}
            >
              {/* Верхний цветной градиент при наведении (эффект остался) */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-blue-400 to-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center rounded-t-2xl" />

              {/* Индикатор Online */}
              {contact.online && (
                <span className="absolute top-6 right-6 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}

              {/* Бейдж 24/7 */}
              {contact.badge && (
                <span className="absolute top-6 right-6 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                  {contact.badge}
                </span>
              )}

              {/* Иконка */}
              <div className="mb-6 relative">
                 <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${contact.primary ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <img src={contact.icon} alt={contact.title} className="w-12 h-12 object-contain" />
                 </div>
              </div>

              {/* Текст */}
              <h3 className="text-xl font-bold text-gray-900 mb-1">{contact.title}</h3>
              <p className="text-gray-500 font-medium mb-4">{contact.subtitle}</p>
              
              {/* Кнопка-ссылка внизу */}
              <div className="mt-auto pt-4 border-t border-gray-50 w-full text-center">
                 <a // <--- ИЗМЕНЕНО: Ссылка теперь только здесь
                    href={contact.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                        inline-flex items-center gap-2 font-semibold text-sm transition-colors py-2 px-4 rounded-full hover:bg-gray-50
                        ${contact.primary ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}
                    `}
                 >
                    Перейти
                    <ExternalLink className="w-4 h-4" />
                 </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};