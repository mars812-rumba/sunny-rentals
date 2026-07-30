import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

import telegramIcon from "@/assets/icons/telegram_ico.webp";
import whatsappIcon from "@/assets/icons/wa_ico.webp";

export const StickyContactMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={menuRef}
      className="fixed bottom-5 right-4 z-[70] flex flex-col items-end sm:bottom-7 sm:right-7"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="sticky-contact-menu"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 72, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 48, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 310, damping: 28 }}
            className="mb-3 w-[min(330px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/60 bg-white/95 p-3 shadow-[0_24px_70px_rgba(8,42,61,0.28)] backdrop-blur-xl"
          >
            <div className="px-3 pb-3 pt-2">
              <p className="text-base font-black text-slate-900">Бронь и связь</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Выберите удобный способ
              </p>
            </div>

            <div className="grid gap-2">
              <a
                href="https://t.me/webapp_rent_bot"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="group flex min-h-14 items-center gap-3 rounded-2xl bg-[#229ED9] px-4 text-sm font-bold text-white transition hover:bg-[#168dcc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/16">
                  <img src={telegramIcon} alt="" className="h-6 w-6" />
                </span>
                Забронировать через Telegram
              </a>

              <a
                href="https://wa.me/66842039140"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="group flex min-h-14 items-center gap-3 rounded-2xl bg-[#25D366] px-4 text-sm font-bold text-white transition hover:bg-[#1fbd5b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/16">
                  <img src={whatsappIcon} alt="" className="h-6 w-6" />
                </span>
                Написать в WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        initial={prefersReducedMotion ? false : { opacity: 0, x: 110 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 190, damping: 20, delay: 0.35 }}
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-controls="sticky-contact-menu"
        aria-label={isOpen ? "Закрыть меню связи" : "Открыть меню бронирования"}
        className="group relative grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-white shadow-[0_16px_38px_rgba(8,35,50,0.38)] transition hover:-translate-y-0.5 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60 motion-reduce:transform-none"
      >
        {!isOpen && !prefersReducedMotion && (
          <>
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-sky-400/25 [animation-duration:2.4s]" />
            <span className="absolute -inset-1 -z-20 rounded-full bg-sky-400/20 blur-md" />
          </>
        )}
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#229ED9] shadow-inner shadow-white/15">
          {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </span>
      </motion.button>
    </div>
  );
};

export default StickyContactMenu;
