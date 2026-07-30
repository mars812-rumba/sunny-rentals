import React, { useEffect, useCallback } from 'react';
import { Search, ArrowUp, CalendarDays, MapPin, Send, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import FilterForm from '@/components/FilterForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { addDays, isValid } from 'date-fns';
import { createTelegramHandoffLink } from '@/utils/telegramHandoff';

interface FilterResultsProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  showResults: boolean;
  setShowResults: (show: boolean) => void;
  filters: any;
  setFilters: (filters: any) => void;
}

export const FilterResults = ({
  selectedCategory,
  setSelectedCategory,
  showResults,
  setShowResults,
  filters,
  setFilters
}: FilterResultsProps) => {
    const { t, language } = useLanguage();
    const isMobile = useIsMobile();

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const durationParam = params.get('duration');
  const categoryParam = params.get('category');
  const pickupLocationParam = params.get('pickupLocation');
  const returnLocationParam = params.get('returnLocation');
  
  let newFilters = { ...filters }; // ✅ Начинаем с текущих фильтров
  let hasParams = false;

  if (durationParam) {
    const durationDays = parseInt(durationParam, 10);
    // ✅ Такая же валидация как в Index
    if (!isNaN(durationDays) && durationDays > 0) {
      const today = new Date();
      const endDate = addDays(today, durationDays);
      newFilters = { 
        ...newFilters, 
        startDate: today, 
        endDate: endDate, 
        days: durationDays 
      };
      hasParams = true;
    }
  }
  
  if (pickupLocationParam) { 
    newFilters = { ...newFilters, pickupLocation: pickupLocationParam };
    hasParams = true; 
  }
  
  if (returnLocationParam) { 
    newFilters = { ...newFilters, returnLocation: returnLocationParam };
    hasParams = true; 
  }
  
  // ✅ Применяем изменения только если были параметры
  if (hasParams) {
    setFilters(newFilters);
    setShowResults(true);
  }
  
  if (categoryParam) {
    setSelectedCategory(categoryParam);
  }
  
  if (hasParams || categoryParam) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}, []); // ✅ Пустой массив зависимостей
    
      const categories = [
        { id: 'sedan', name: t('category_sedan') },
        { id: 'suv', name: t('category_suv') },
        { id: 'compact', name: t('category_compact') },
        { id: '7s', name: t('category_7s') },
        { id: 'bikes', name: t('bikes') },
      ];
    
      const handleFiltersChange = useCallback((newFilters: any) => {
        setFilters(newFilters);
        if (selectedCategory && newFilters.startDate && newFilters.pickupLocation) {
          setShowResults(true);
        }
      }, [selectedCategory]);
    
      const handleCategoryChange = useCallback((category: string) => {
        setSelectedCategory(category);
        if (filters.startDate && filters.pickupLocation) {
          setShowResults(true);
        }
      }, [filters]);
    
      const hasCompleteHandoff = Boolean(
        selectedCategory &&
        filters.startDate instanceof Date &&
        filters.endDate instanceof Date &&
        isValid(filters.startDate) &&
        isValid(filters.endDate) &&
        filters.pickupLocation &&
        filters.returnLocation
      );

      const telegramLink = hasCompleteHandoff
        ? createTelegramHandoffLink({
            category: selectedCategory,
            startDate: filters.startDate,
            endDate: filters.endDate,
            pickupLocation: filters.pickupLocation,
            returnLocation: filters.returnLocation,
          })
        : 'https://t.me/webapp_rent_bot';

      const categoryName = categories.find((category) => category.id === selectedCategory)?.name;

   return (
    <>


      {/* Mobile Filter Section */}
      {isMobile && (
        <section id="fleet" className="bg-background py-8 -mt-6 relative z-20 rounded-t-3xl shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Подобрать транспорт
              </h2>
            </div>
            <FilterForm
              onFiltersChange={handleFiltersChange}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        </section>
      )}

      {/* Results Section */}
      <section className="py-12 lg:py-16 bg-blue/30">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {!showResults ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                  <ArrowUp className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {language === 'ru' ? 'Выберите параметры аренды' : 'Select rental parameters'}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {language === 'ru' 
                    ? 'Укажите даты, место доставки и категорию — покажем доступные варианты' 
                    : 'Select dates, delivery location and category — we will show available options'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-xl shadow-sky-950/10"
              >
                <div className="bg-gradient-to-br from-sky-600 to-blue-700 px-6 py-8 text-white md:px-10">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                    <ShieldCheck className="h-4 w-4" />
                    Авторизация через Telegram
                  </div>
                  <h2 className="text-2xl font-black md:text-3xl">
                    Варианты готовы к подбору
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
                    Откройте Telegram WebApp — мы подтвердим профиль и покажем доступный транспорт
                    по выбранным параметрам.
                  </p>
                </div>

                <div className="space-y-5 p-6 md:p-10">
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <Search className="mb-2 h-5 w-5 text-sky-600" />
                      <div className="font-bold text-slate-900">{categoryName || selectedCategory}</div>
                      <div className="mt-1 text-xs text-slate-500">категория</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <CalendarDays className="mb-2 h-5 w-5 text-sky-600" />
                      <div className="font-bold text-slate-900">
                        {filters.startDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        {' — '}
                        {filters.endDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{filters.days} дней</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <MapPin className="mb-2 h-5 w-5 text-sky-600" />
                      <div className="font-bold capitalize text-slate-900">{filters.pickupLocation}</div>
                      <div className="mt-1 text-xs text-slate-500">место выдачи</div>
                    </div>
                  </div>

                  <a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#229ED9] px-5 text-base font-black text-white shadow-lg shadow-sky-600/25 transition hover:-translate-y-0.5 hover:bg-[#168dcc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/50"
                  >
                    Показать варианты в Telegram
                    <Send className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </a>

                  <p className="text-center text-xs leading-relaxed text-slate-500">
                    Telegram передаст только подтверждённый ID профиля. Бронь появится в CRM после
                    вашего подтверждения в WebApp.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

// Экспорт компонента формы для использования в HeroSection
export const DesktopFilterForm = ({
  selectedCategory,
  onCategoryChange,
  filters,
  onFiltersChange,
}: {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  filters: any;
  onFiltersChange: (filters: any) => void;
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/20 p-6 lg:p-8 border border-white/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl lg:text-2xl font-bold text-foreground">
          Подобрать транспорт
        </h2>
      </div>
      <FilterForm
        onFiltersChange={onFiltersChange}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
      />
    </div>
  );
};

export default FilterResults;
