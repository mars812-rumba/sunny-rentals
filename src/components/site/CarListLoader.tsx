import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext'; // Import useLanguage

interface CarListLoaderProps {
  onLoadingComplete: () => void;
  compact?: boolean;
}

// LOADER_TEXTS will now use translation keys
const LOADER_TEXT_KEYS = [
  'loader_searching_cars',
  'loader_checking_availability',
  'loader_calculating_prices',
  'loader_done'
];

const TOTAL_DURATION = 2400; // ms

const CarListLoader = ({ onLoadingComplete, compact = false }: CarListLoaderProps) => {
  const { t } = useLanguage(); // Initialize t
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const textInterval = setInterval(() => {
      setTextIndex(prevIndex => {
        if (prevIndex < LOADER_TEXT_KEYS.length - 1) { // Use LOADER_TEXT_KEYS
          return prevIndex + 1;
        }
        clearInterval(textInterval);
        return prevIndex;
      });
    }, TOTAL_DURATION / LOADER_TEXT_KEYS.length); // Use LOADER_TEXT_KEYS

    const overallTimeout = setTimeout(() => {
      onLoadingComplete();
    }, TOTAL_DURATION);

    return () => {
      clearInterval(textInterval);
      clearTimeout(overallTimeout);
    };
  }, [onLoadingComplete]);

  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-2xl",
      compact
        ? "p-3 bg-white/10 backdrop-blur-sm text-white"
        : "p-6 mt-6 bg-white/50"
    )}>
      <div className="animate-icon-rotate">
        <Search
          className={cn(compact ? "text-white/80" : "text-blue-500")}
          size={compact ? 28 : 40}
        />
      </div>
     
      <div className={cn("w-full", compact ? "max-w-xs my-2" : "max-w-sm my-3")}>
        <div className={cn(
          "w-full rounded-full h-1.5 overflow-hidden",
          compact ? "bg-white/20" : "bg-gray-200"
        )}>
          <div className="relative bg-gradient-to-r from-green-400 to-blue-500 h-1.5 rounded-full animate-fill-bar">
             <span className="absolute top-0 left-0 h-full w-1/4 bg-white/50 blur-sm animate-shine-effect" />
          </div>
        </div>
      </div>
     
      <p className={cn(
        "font-medium",
        compact ? "text-xs text-white/90" : "text-base text-gray-600"
      )}>
        {t(LOADER_TEXT_KEYS[textIndex])} {/* Use t() with LOADER_TEXT_KEYS */}
      </p>
    </div>
  );
};

export default CarListLoader;