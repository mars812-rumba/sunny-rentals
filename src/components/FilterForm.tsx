import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger, DrawerFooter } from '@/components/ui/drawer';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { format, startOfDay, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import { useLanguage } from '@/contexts/LanguageContext';

// Category icons
import bikeIco from '@/assets/classes/bike_ico.png';
import sedanIco from '@/assets/classes/sedan_ico.png';
import compactIco from '@/assets/classes/compact_ico.png';
import suvIco from '@/assets/classes/suv_ico.png';
import seat7Ico from '@/assets/classes/7seat_ico.png';

interface FilterFormProps {
  onFiltersChange: (filters: any) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onCompletionChange?: (isComplete: boolean) => void;
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

  const allCategories = [
    { id: 'sedan', name: t('category_sedan'), image: sedanIco },
    { id: 'suv', name: t('category_suv'), image: suvIco },
    { id: 'compact', name: t('category_compact'), image: compactIco },
    { id: '7s', name: t('category_7s'), image: seat7Ico },
    { id: 'bikes', name: t('category_bikes'), image: bikeIco },
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
  const isMobile = useIsMobile();

  useEffect(() => {
    if (sameLocation) setReturnLocation(pickupLocation);
  }, [pickupLocation, sameLocation]);

  useEffect(() => {
    const deliveryComplete = !!pickupLocation && (sameLocation || !!returnLocation);
    const datesComplete = !!(dateRange?.from && dateRange?.to);
    const categoryComplete = !!selectedCategory;
    const newProgress = { delivery: deliveryComplete, dates: datesComplete, category: categoryComplete };
    setProgress(newProgress);
    onCompletionChange?.(Object.values(newProgress).every(Boolean));
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
      try {
        const from = dateRange.from instanceof Date ? dateRange.from : new Date(dateRange.from);
        const to = dateRange.to instanceof Date ? dateRange.to : new Date(dateRange.to);
        
        if (!isValid(from) || !isValid(to)) return 0;
        
        return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      } catch {
        return 0;
      }
    }
    return 0;
  };

  const formatDateRange = () => {
    if (!dateRange?.from || !dateRange?.to) return t('choose_dates');
    
    try {
      const from = dateRange.from instanceof Date ? dateRange.from : new Date(dateRange.from);
      const to = dateRange.to instanceof Date ? dateRange.to : new Date(dateRange.to);
      
      if (!isValid(from) || !isValid(to)) return t('choose_dates');
      
      const days = getDaysCount();
      return `${format(from, 'd MMM', { locale: ru })} - ${format(to, 'd MMM', { locale: ru })} • ${t('days_short', { days })}`;
    } catch (err) {
      console.error('Date format error:', err);
      return t('choose_dates');
    }
  };

  const calendarTrigger = (
    <Button 
      variant="outline" 
      className={cn(
        "w-full justify-start text-left h-auto p-3 rounded-xl border-2 shadow-sm transition-all duration-200",
        dateRange?.from && dateRange?.to 
          ? "bg-green-50 border-green-300 text-gray-800 hover:bg-green-100" 
          : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100",
        !isMobile && "text-base p-4"
      )}
    >
      <CalendarDays className={cn("mr-2", isMobile ? "h-4 w-4" : "h-5 w-5")} />
      <span className="truncate">{formatDateRange()}</span>
    </Button>
  );

  const calendarContentProps = { dateRange, setDateRange, onApply: handleApplyCalendar, onCancel: handleCancelCalendar, isMobile, t };

  return (
    <div className="space-y-4">
      <div className={isMobile 
        ? "bg-gradient-to-b from-white via-white to-gray-50/50 rounded-2xl p-4 shadow-lg"
        : "bg-white rounded-3xl p-8 shadow-2xl border border-gray-200"
      }>
        <div className={isMobile ? "space-y-4" : "space-y-6"}>
          <div>
            <p className={isMobile 
              ? "text-sm font-semibold mb-2 text-gray-700" 
              : "text-base font-bold mb-3 text-gray-800"}>{t('delivery_and_return')}</p>
            <Select value={pickupLocation} onValueChange={setPickupLocation}>
              <SelectTrigger 
                className={cn(
                  "w-full rounded-xl border-2 shadow-sm transition-all duration-200",
                  pickupLocation 
                    ? "bg-green-50 border-green-300 text-gray-800 hover:bg-green-100" 
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100",
                  isMobile ? "p-3 h-auto" : "p-4 h-auto text-base"
                )}
              >
                <div className="flex items-center truncate">
                  <MapPin className={cn("mr-2", isMobile ? "h-4 w-4" : "h-5 w-5")} /> 
                  <SelectValue placeholder={t('pickup_location')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.value} value={loc.value}>
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
                  className="overflow-hidden pt-3"
                >
                  <Select value={returnLocation} onValueChange={setReturnLocation}>
                    <SelectTrigger 
                      className={cn(
                        "w-full rounded-xl border-2 shadow-sm transition-all duration-200",
                        returnLocation 
                          ? "bg-green-50 border-green-300 text-gray-800 hover:bg-green-100" 
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100",
                        isMobile ? "p-3 h-auto" : "p-4 h-auto text-base"
                      )}
                    >
                      <div className="flex items-center truncate">
                        <MapPin className={cn("mr-2", isMobile ? "h-4 w-4" : "h-5 w-5")} /> 
                        <SelectValue placeholder={t('return_location')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label} ({loc.price > 0 ? `+${loc.price}฿` : t('free')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>
            
            <label className={cn(
              "flex items-center gap-3 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors duration-200",
              isMobile ? "p-2 mt-3" : "p-3 mt-4"
            )}>
              <Checkbox 
                id="same-location" 
                checked={sameLocation} 
                onCheckedChange={(c) => setSameLocation(Boolean(c))} 
              />
              <span className={isMobile ? "text-sm text-gray-600" : "text-base text-gray-700"}>{t('return_to_same_location')}</span>
            </label>
          </div>

          <div>
            <p className={isMobile 
              ? "text-sm font-semibold mb-2 text-gray-700" 
              : "text-base font-bold mb-3 text-gray-800"}>{t('rental_dates')}</p>
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

          <div className={cn("border-t border-gray-200", isMobile ? "my-4" : "my-6")} />

          <div>
            <p className={isMobile 
              ? "text-sm font-semibold mb-3 text-gray-700" 
              : "text-lg font-bold mb-4 text-gray-800"}>{t('choose_car_class')}</p>
            
            {isMobile ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {carCategories.map((category) => {
                    const isSelected = selectedCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => onCategoryChange(category.id)}
                        className={cn(
                          'rounded-xl text-center transition-all duration-200 border-2 h-full transform active:scale-95 flex-shrink-0',
                          isSelected 
                            ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30 scale-105' 
                            : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md',
                          "p-2"
                        )}
                      >
                        <img 
                          src={category.image} 
                          alt={category.name}
                          className="mx-auto mb-1 h-8 w-auto object-contain"
                        />
                        <div className="text-xs font-semibold">{category.name}</div>
                      </button>
                    );
                  })}
                </div>
                {bikeCategory && (() => {
                  const isSelected = selectedCategory === bikeCategory.id;
                  return (
                    <button
                      key={bikeCategory.id}
                      onClick={() => onCategoryChange(bikeCategory.id)}
                      className={cn(
                        'rounded-xl w-full text-center transition-all duration-200 border-2 h-full transform active:scale-95 flex items-center justify-center',
                        isSelected 
                          ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30 scale-105' 
                          : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md',
                        "p-2"
                      )}
                    >
                      <img 
                        src={bikeCategory.image} 
                        alt={bikeCategory.name}
                        className="mr-2 h-8 w-auto object-contain"
                      />
                      <div className="text-sm font-semibold">Скутеры и мотоциклы</div>
                    </button>
                  );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-4">
                {allCategories.map((category) => {
                  const isSelected = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => onCategoryChange(category.id)}
                      className={cn(
                        'rounded-xl text-center transition-all duration-200 border-2 h-full transform active:scale-95',
                        isSelected 
                          ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30 scale-105' 
                          : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md',
                        "p-4"
                      )}
                    >
                      <img 
                        src={category.image} 
                        alt={category.name}
                        className="mx-auto mb-1 h-10 w-auto object-contain"
                      />
                      <div className="text-sm font-bold">{category.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={cn("flex justify-center gap-3", isMobile ? "pt-2" : "pt-4")}>
            <div className={cn(
              "rounded-full transition-all duration-300", 
              progress.delivery ? 'bg-green-500 shadow-lg shadow-green-500/50 scale-110' : 'bg-gray-300',
              isMobile ? "w-2.5 h-2.5" : "w-3 h-3"
            )} />
            <div className={cn(
              "rounded-full transition-all duration-300", 
              progress.dates ? 'bg-green-500 shadow-lg shadow-green-500/50 scale-110' : 'bg-gray-300',
              isMobile ? "w-2.5 h-2.5" : "w-3 h-3"
            )} />
            <div className={cn(
              "rounded-full transition-all duration-300", 
              progress.category ? 'bg-green-500 shadow-lg shadow-green-500/50 scale-110' : 'bg-gray-300',
              isMobile ? "w-2.5 h-2.5" : "w-3 h-3"
            )} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterForm;