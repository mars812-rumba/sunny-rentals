// src/components/site/ScrollToFleetButton.tsx
import React from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ScrollToFleetButton = () => {
  const scrollToFleet = () => {
    const fleetSection = document.getElementById('fleet');
    if (fleetSection) {
      fleetSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <button
      onClick={scrollToFleet}
      className={cn(
        "fixed bottom-10 right-8 z-40",
        "px-3.5 py-2.5 rounded-xl",
        // Оранжевое матовое стекло
        "bg-green-600/50 backdrop-blur-xl",
        "border border-green-400/30",
        // Тени
        "shadow-[0_8px_24px_rgba(234,88,12,0.35)]",
        // Текст
        "text-white font-semibold",
        "flex flex-col items-center gap-0.5",
        // Ховер
        "hover:bg-green-600/70",
        "hover:border-green-300/50",
        "hover:shadow-[0_12px_32px_rgba(234,88,12,0.45)]",
        "hover:scale-110 active:scale-95",
        // Анимация
        "transition-all duration-300 ease-out",
        "animate-pulse"
      )}
      aria-label="Вернуться к фильтрам"
    >
      <ChevronUp className="w-4 h-4" />
      <span className="text-[10px] leading-tight whitespace-nowrap">Рассчитать стоимость</span>
    </button>
  );
};