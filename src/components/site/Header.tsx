import { useState } from "react";
import { Menu, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import logo from "@/assets/logo.png";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#why-us", label: "Преимущества" },
    { href: "#how-it-works", label: "Как работает" },
    { href: "#fleet", label: "Автопарк" },
    { href: "#reviews", label: "Отзывы" },
    { href: "#faq", label: "FAQ" },
    { href: "#contacts", label: "Контакты" },
  ];

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          // Сплошной цвет с матовостью и прозрачностью
          "bg-blue-950/60",
          "backdrop-blur-xl backdrop-saturate-150",
          "border-b border-white/10 shadow-xl"
        )}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Логотип */}
          <a href="/site" className="flex items-center gap-3 group">
            <img
              src={logo}
              alt="Sunny Rentals"
              className="h-9 w-auto transition-transform group-hover:scale-110"
            />
            <span className="font-black text-xl tracking-tight text-white drop-shadow-lg">
              Sunny Rentals
            </span>
          </a>

          {/* Десктопная навигация */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-white/90 hover:text-cyan-300 transition-all duration-200 hover:drop-shadow-cyan"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* Язык */}
            <button className="hidden md:flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-colors">
              RU
              <ChevronDown className="w-4 h-4 opacity-70" />
            </button>

            {/* Кнопка бронирования */}
            <a
              href="https://t.me/webapp_rent_bot"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "hidden md:inline-flex bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/30 border border-cyan-400/50"
              )}
            >
              Забронировать
            </a>

            {/* Мобильное меню */}
            <button
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden pt-20 bg-indigo-950/90 backdrop-blur-2xl backdrop-saturate-150"
        >
          <nav className="container mx-auto px-6 flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-bold text-white py-4 px-6 rounded-2xl hover:bg-white/10 hover:text-cyan-300 transition-all"
              >
                {link.label}
              </a>
            ))}

            <div className="border-t border-white/20 my-6" />

            <button className="flex items-center gap-3 text-lg font-medium text-white/90 py-4">
              Русский
              <ChevronDown className="w-5 h-5" />
            </button>

            <a
              href="https://t.me/webapp_rent_bot"
              className="mt-4 inline-flex justify-center items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xl font-bold rounded-full shadow-2xl"
              onClick={() => setMobileMenuOpen(false)}
            >
              Забронировать
            </a>
          </nav>
        </div>
      )}
    </>
  );
};

export default Header;