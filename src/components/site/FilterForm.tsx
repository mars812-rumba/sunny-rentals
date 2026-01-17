import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, CalendarDays, Car, Truck, Users, Bike } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger, DrawerFooter } from '@/components/ui/drawer';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { format, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface FilterFormProps {
  onFiltersChange: (filters: any) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onCompletionChange: (isComplete: boolean) => void;
}

const CalendarContent = ({ dateRange, setDateRange, onApply, onCancel, isMobile, t }) => (
  <>
    <div className="flex justify-center">
      <CalendarComponent
        mode="range"
        selected={dateRange}
        onSelect={setDateRange}
        disabled={(date) => date < startOfDay(new Date())}
        initialFocus
        numberOfMonths={isMobile ? 1 : 2}
        fromMonth={new Date()}
      />
    </div>
    <DrawerFooter className="pt-2 flex flex-col sm:flex-row sm:justify-center gap-2">
      <Button variant="outline" onClick={onCancel}>{t('cancel')}</Button>
      <Button onClick={onApply} disabled={!dateRange?.from || !dateRange?.to}>{t('select_dates')}</Button>
    </DrawerFooter>
  </>
);

const FilterForm = ({ 
  onFiltersChange, 
  selectedCategory, 
  onCategoryChange, 
  onCompletionChange 
}: FilterFormProps) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const allCategories = [
    { id: 'sedan', name: t('category_sedan'), icon: Car },
    { id: 'suv', name: t('category_suv'), icon: Truck },
    { id: 'compact', name: t('category_compact'), icon: Car },
    { id: '7s', name: t('category_7s'), icon: Users },
    { id: 'bikes', name: t('category_bikes'), icon: Bike },
  ];

  const carCategories = allCategories.filter(c => c.id !== 'bikes');
  const bikeCategory = allCategories.find(c => c.id === 'bikes');

  const locations = [
    { value: 'airport', label: t('location_airport'), price: 0 },
    { value: 'hotel', label: t('location_hotel'), price: 500 },
    { value: 'villa', label: t('location_villa'), price: 500 },
  ];

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [sameLocation, setSameLocation] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [progress, setProgress] = useState({ delivery: false, dates: false, category: false });

  useEffect(() => {
    if (sameLocation) setReturnLocation(pickupLocation);
  }, [pickupLocation, sameLocation]);

  useEffect(() => {
    const deliveryComplete = !!pickupLocation && (sameLocation || !!returnLocation);
    const datesComplete = !!(dateRange?.from && dateRange?.to);
    const categoryComplete = !!selectedCategory;
    const newProgress = { delivery: deliveryComplete, dates: datesComplete, category: categoryComplete };
    setProgress(newProgress);
    const allComplete = Object.values(newProgress).every(Boolean);
    onCompletionChange(allComplete);
    
    if (deliveryComplete && datesComplete) {
      onFiltersChange({
        startDate: dateRange.from,
        endDate: dateRange.to,
        pickupLocation,
        returnLocation,
        days: getDaysCount()
      });
    }
  }, [dateRange, pickupLocation, returnLocation, sameLocation, selectedCategory]);

  const handleApplyCalendar = () => setIsCalendarOpen(false);
  const handleCancelCalendar = () => setIsCalendarOpen(false);

  const getDaysCount = () => {
    if (dateRange?.from && dateRange?.to) {
      return Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  };

  const formatDateRange = () => {
    if (dateRange?.from && dateRange?.to) {
      const days = getDaysCount();
      return `${format(dateRange.from, 'd MMM', { locale: ru })} - ${format(dateRange.to, 'd MMM', { locale: ru })} • ${t('days_short', { days })}`;
    }
    return t('choose_dates');
  };

  const calendarTrigger = (
    <Button 
      variant="outline" 
      className={cn(
        "w-full justify-start text-left h-auto rounded-xl border-2 shadow-sm transition-all duration-200",
        dateRange?.from && dateRange?.to 
          ? "bg-green-50 border-green-400 text-gray-800 hover:bg-green-100 hover:border-green-500" 
          : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400",
        isMobile ? "p-3.5" : "p-4 text-base"
      )}
    >
      <CalendarDays className={cn("mr-3 flex-shrink-0", isMobile ? "h-5 w-5" : "h-6 w-6")} />
      <span className="truncate font-medium">{formatDateRange()}</span>
    </Button>
  );

  const calendarContentProps = { 
    dateRange, 
    setDateRange, 
    onApply: handleApplyCalendar, 
    onCancel: handleCancelCalendar, 
    isMobile, 
    t 
  };

  return (
    <div className="w-full">
      {/* Основная карточка */}
      <div className={cn(
        "bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden",
        isMobile ? "p-5" : "p-8"
      )}>
        <div className={cn("space-y-6", isMobile && "space-y-5")}>
          
          {/* Шаг 1: Доставка */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                "rounded-full flex items-center justify-center font-bold text-white transition-all",
                progress.delivery ? "bg-green-500" : "bg-gray-400",
                isMobile ? "w-7 h-7 text-sm" : "w-8 h-8 text-base"
              )}>
                1
              </div>
              <h3 className={cn(
                "font-bold text-gray-800",
                isMobile ? "text-base" : "text-lg"
              )}>
                {t('delivery_and_return')}
              </h3>
            </div>

            <div className="space-y-3">
              <Select value={pickupLocation} onValueChange={setPickupLocation}>
                <SelectTrigger 
                  className={cn(
                    "w-full rounded-xl border-2 shadow-sm transition-all duration-200",
                    pickupLocation 
                      ? "bg-green-50 border-green-400 text-gray-800 hover:bg-green-100 hover:border-green-500" 
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400",
                    isMobile ? "p-3.5 h-auto" : "p-4 h-auto text-base"
                  )}
                >
                  <div className="flex items-center truncate">
                    <MapPin className={cn("mr-3 flex-shrink-0", isMobile ? "h-5 w-5" : "h-6 w-6")} /> 
                    <SelectValue placeholder={t('pickup_location')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.value} value={loc.value} className="text-base">
                      {loc.label} ({loc.price > 0 ? `+${loc.price}฿` : t('free')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AnimatePresence>
                {!sameLocation && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }} 
                    className="overflow-hidden"
                  >
                    <Select value={returnLocation} onValueChange={setReturnLocation}>
                      <SelectTrigger 
                        className={cn(
                          "w-full rounded-xl border-2 shadow-sm transition-all duration-200",
                          returnLocation 
                            ? "bg-green-50 border-green-400 text-gray-800 hover:bg-green-100 hover:border-green-500" 
                            : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400",
                          isMobile ? "p-3.5 h-auto" : "p-4 h-auto text-base"
                        )}
                      >
                        <div className="flex items-center truncate">
                          <MapPin className={cn("mr-3 flex-shrink-0", isMobile ? "h-5 w-5" : "h-6 w-6")} /> 
                          <SelectValue placeholder={t('return_location')} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(loc => (
                          <SelectItem key={loc.value} value={loc.value} className="text-base">
                            {loc.label} ({loc.price > 0 ? `+${loc.price}฿` : t('free')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </AnimatePresence>

              <label className={cn(
                "flex items-center gap-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors p-3",
                isMobile ? "text-sm" : "text-base"
              )}>
                <Checkbox 
                  id="same-location" 
                  checked={sameLocation} 
                  onCheckedChange={(c) => setSameLocation(Boolean(c))} 
                  className="w-5 h-5"
                />
                <span className="text-gray-700 font-medium">{t('return_to_same_location')}</span>
              </label>
            </div>
          </div>

          {/* Шаг 2: Даты */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                "rounded-full flex items-center justify-center font-bold text-white transition-all",
                progress.dates ? "bg-green-500" : "bg-gray-400",
                isMobile ? "w-7 h-7 text-sm" : "w-8 h-8 text-base"
              )}>
                2
              </div>
              <h3 className={cn(
                "font-bold text-gray-800",
                isMobile ? "text-base" : "text-lg"
              )}>
                {t('rental_dates')}
              </h3>
            </div>

            {isMobile ? (
              <Drawer open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <DrawerTrigger asChild>{calendarTrigger}</DrawerTrigger>
                <DrawerContent><CalendarContent {...calendarContentProps} /></DrawerContent>
              </Drawer>
            ) : (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>{calendarTrigger}</PopoverTrigger>
                <PopoverContent className="w-auto p-0"><CalendarContent {...calendarContentProps} /></PopoverContent>
              </Popover>
            )}
          </div>

          {/* Разделитель */}
          <div className="border-t border-gray-200" />

          {/* Шаг 3: Категории */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className={cn(
                "rounded-full flex items-center justify-center font-bold text-white transition-all",
                progress.category ? "bg-green-500" : "bg-gray-400",
                isMobile ? "w-7 h-7 text-sm" : "w-8 h-8 text-base"
              )}>
                3
              </div>
              <h3 className={cn(
                "font-bold text-gray-800",
                isMobile ? "text-base" : "text-lg"
              )}>
                {t('choose_car_class')}
              </h3>
            </div>

            {isMobile ? (
              <div className="space-y-3">
                {/* 4 авто */}
                <div className="grid grid-cols-4 gap-2">
                  {carCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => onCategoryChange(cat.id)}
                        className={cn(
                          "flex flex-col items-center justify-center py-3.5 rounded-xl border-2 transition-all active:scale-95",
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                            : "bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                        )}
                      >
                        <Icon className={cn("w-8 h-8 mb-1", isSelected ? "text-white" : "text-blue-600")} />
                        <span className="text-[10px] font-bold leading-tight">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Байки */}
                {bikeCategory && (
                  <button
                    onClick={() => onCategoryChange(bikeCategory.id)}
                    className={cn(
                      "w-full py-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all active:scale-98",
                      selectedCategory === bikeCategory.id
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                        : "bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                    )}
                  >
                    <bikeCategory.icon
                      className={cn("w-9 h-9", selectedCategory === bikeCategory.id ? "text-white" : "text-blue-600")}
                    />
                    <span className="text-base font-bold">{bikeCategory.name}</span>
                  </button>
                )}
              </div>
            ) : (
              // Десктоп
              <div className="grid grid-cols-5 gap-3">
                {allCategories.map((category) => {
                  const isSelected = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => onCategoryChange(category.id)}
                      className={cn(
                        'rounded-xl text-center transition-all duration-200 border-2 transform active:scale-95 p-5',
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' 
                          : 'bg-white text-gray-800 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      )}
                    >
                      <category.icon 
                        className={cn(
                          "mx-auto mb-2 transition-all h-9 w-9", 
                          isSelected ? 'text-white' : 'text-blue-600'
                        )} 
                      />
                      <div className="text-sm font-bold">{category.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Индикаторы прогресса */}
          <div className="flex justify-center gap-2 pt-2">
            {Object.values(progress).map((complete, idx) => (
              <div 
                key={idx}
                className={cn(
                  "rounded-full transition-all duration-300", 
                  complete ? 'bg-green-500 scale-110' : 'bg-gray-300',
                  isMobile ? "w-2 h-2" : "w-2.5 h-2.5"
                )} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterForm;