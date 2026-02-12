import React from 'react';
// Импортируем логотип.
// Если файла еще нет, можно временно использовать основной логотип или закомментировать импорт
import footerLogo from "@/assets/footer_logo.png"; 

// Если файл assets/footer/logo.png еще не создан, раскомментируйте строчку ниже, чтобы использовать заглушку:
// const footerLogo = "https://placehold.co/200x50/111827/ffffff?text=Sunny+Rentals"; 

export const Footer = () => {
  const companyLinks = [
    { href: "#why-us", label: "О нас" },
    { href: "#reviews", label: "Отзывы" },
    { href: "#faq", label: "FAQ" },
    { href: "#contacts", label: "Контакты" },
  ];

  // Секцию "Услуги" убрали по запросу

  const contactLinks = [
    { href: "https://t.me/webapp_rent_bot", label: "Telegram бот" },
    { href: "https://t.me/carbook_in_phuket", label: "Telegram канал" },
    { href: "https://instagram.com/sunny.rentals.phuket", label: "Instagram" },
    { href: "https://wa.me/66842039140", label: "WhatsApp" }, // Заменили Email на WA
  ];

  return (
    <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
      <div className="container mx-auto px-4">
        {/* Изменили сетку: на мобильном 2 колонки, на десктопе 3 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
          
          {/* Column 1: Brand */}
          {/* col-span-2 на мобильном делает этот блок во всю ширину */}
          <div className="col-span-2 md:col-span-1 flex flex-col items-start">
            <div className="flex items-center gap-3 mb-4">
              {/* Логотип */}
              <img 
                src={footerLogo} 
                alt="Sunny Rentals Logo" 
                className="h-10 w-auto object-contain" 
              />
              <span className="font-bold text-xl tracking-tight">Sunny Rentals</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Сервис-агрегатор аренды автомобилей на Пхукете с проверенными партнёрами. Честные цены и поддержка 24/7.
            </p>
          </div>
          
          {/* Column 2: Navigation */}
          <div className="md:pl-10">
            <h4 className="font-bold text-lg mb-6 text-gray-100">Компания</h4>
            <ul className="space-y-3 text-sm">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 hover:opacity-100 transition-opacity"></span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 3: Contacts */}
          <div>
            <h4 className="font-bold text-lg mb-6 text-gray-100">Связь с нами</h4>
            <ul className="space-y-3 text-sm">
              {contactLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 hover:translate-x-1 duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <div>
            © 2025 Sunny Rentals • Все права защищены
          </div>
          <div>
            sunny-rentals.online
          </div>
        </div>
      </div>
    </footer>
  );
};