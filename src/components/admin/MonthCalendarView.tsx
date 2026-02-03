import React, { useMemo, useCallback, useEffect, memo, useState } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, addMonths, isSameMonth, isToday 
} from 'date-fns';
import { ru } from 'date-fns/locale';
import useEmblaCarousel from 'embla-carousel-react';
import { LogisticsDate, Booking } from '@/api/api.ts'; 
import { cn } from '@/lib/utils';
import { DayDetailsModal } from './DayDetailsModal'; 

interface DayEvent {
  type: 'pickup' | 'return';
  time: string;
  carName: string;
  clientName: string;
  location: string;
  booking_id: string;
  booking: Booking;
}

interface MonthCalendarViewProps {
  currentDate: Date;
  bookings: Booking[];
  logisticsData: LogisticsDate[];
  onDateChange: (date: Date) => void;
  onBookingClick: (booking: Booking) => void;
  onDayClick?: (date: Date, events: DayEvent[]) => void;
}

const getMonthLetters = (date: Date) => {
  let name = format(date, 'LLLL', { locale: ru }).toUpperCase();
  if (name === 'СЕНТЯБРЬ') name = 'СЕНТЯБР'; 
  return name.split('');
};

const MonthGrid = memo(({ 
  date, 
  eventsByDay, 
  onDayClick 
}: { 
  date: Date, 
  eventsByDay: Map<string, DayEvent[]>,
  onDayClick: (date: Date, events: DayEvent[]) => void 
}) => {
  const days = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(monthStart);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const res = [];
    let d = start;
    while (d <= end) { res.push(d); d = addDays(d, 1); }
    return res;
  }, [date]);

  const monthLetters = useMemo(() => getMonthLetters(date), [date]);
  const yearString = format(date, 'yyyy');
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="flex-[0_0_100%] min-w-0 relative">
      {/* ФОНОВАЯ ПОДЛОЖКА */}
      <div className="absolute inset-0 pointer-events-none select-none flex flex-col">
        <div className="h-[100px]" />
        <div className="h-[100px] flex items-center justify-center">
          <div className="flex justify-center items-center gap-4 px-4 text-slate-200/40 text-3xl font-black tracking-[0.2em] uppercase italic">
            {monthLetters.map((char, i) => <span key={i}>{char}</span>)}
          </div>
        </div>
        <div className="h-[100px] flex items-center justify-center text-slate-100/50 text-6xl font-black tracking-tighter italic">
          {yearString}
        </div>
      </div>

      <div className="relative z-10 grid grid-flow-row auto-rows-fr divide-y divide-gray-100 border-t border-gray-100">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 divide-x divide-gray-100">
            {week.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const events = eventsByDay.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, date);
              const dayIsToday = isToday(day);

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "min-h-[100px] p-1.5 transition-colors cursor-pointer group bg-transparent",
                    !isCurrentMonth ? "opacity-20" : "hover:bg-blue-50/10"
                  )}
                  onClick={() => onDayClick(day, events)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                      "text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full transition-colors",
                      dayIsToday ? "bg-blue-600 text-white shadow-md" : isCurrentMonth ? "text-slate-500" : "text-gray-300"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="space-y-0.5 overflow-hidden font-sans">
                    {events.slice(0, 5).map((ev, idx) => {
                      const showTime = ev.time && ev.time !== "00:00" && ev.time !== "04:00" ;
                      return (
                        <div 
                          key={idx}
                          className={cn(
                            "px-1 py-0.5 rounded-[4px] text-[5px] font-bold truncate border shadow-sm flex justify-between items-center gap-1",
                            ev.type === 'pickup' 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          )}
                        >
                          <span className="truncate flex-1 uppercase tracking-tighter">
                            {ev.carName}
                          </span>
                          {showTime && (
                            <span className="opacity-60 text-[6px] font-medium flex-shrink-0">
                              {ev.time}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {events.length > 5 && (
                      <div className="text-[7px] text-slate-400 font-bold pl-1 uppercase tracking-tighter">
                        + ещё {events.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export function MonthCalendarView({
  currentDate,
  bookings,
  logisticsData,
  onDateChange,
  onBookingClick,
  onDayClick,
}: MonthCalendarViewProps) {
  
  const [selectedDayData, setSelectedDayData] = useState<{
    isOpen: boolean;
    date: Date | null;
    events: DayEvent[];
  }>({ isOpen: false, date: null, events: [] });

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, startIndex: 1, duration: 30 });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    
    if (!logisticsData || logisticsData.length === 0) return map;

    logisticsData.forEach((item) => {
      const pDate = new Date(item.pickup_date);
      const rDate = new Date(item.return_date);

      if (isNaN(pDate.getTime())) return;

      const fullBooking = bookings?.find(b => b.booking_id === item.booking_id);

      const baseEvent = {
        carName: item.car_name,
        clientName: item.client_name,
        location: item.location || 'Не указано',
        booking_id: item.booking_id,
        booking: fullBooking || ({
          booking_id: item.booking_id,
          form_data: {
            client_name: item.client_name,
            car: { model: item.car_name },
            locations: { pickupLocation: item.location }
          }
        } as any)
      };

      const pKey = format(pDate, 'yyyy-MM-dd');
      const rKey = format(rDate, 'yyyy-MM-dd');

      if (!map.has(pKey)) map.set(pKey, []);
      map.get(pKey)!.push({ ...baseEvent, type: 'pickup', time: format(pDate, 'HH:mm') });

      if (!map.has(rKey)) map.set(rKey, []);
      map.get(rKey)!.push({ ...baseEvent, type: 'return', time: format(rDate, 'HH:mm') });
    });

    return map;
  }, [logisticsData, bookings]);

  const handleInnerDayClick = useCallback((date: Date, events: DayEvent[]) => {
    setSelectedDayData({ isOpen: true, date, events });
    if (onDayClick) onDayClick(date, events);
  }, [onDayClick]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      if (index === 0) {
        onDateChange(addMonths(currentDate, -1));
        emblaApi.scrollTo(1, false);
      } else if (index === 2) {
        onDateChange(addMonths(currentDate, 1));
        emblaApi.scrollTo(1, false);
      }
    };
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, currentDate, onDateChange]);

  return (
    <div className="bg-white min-h-[600px] flex flex-col select-none overflow-hidden relative">
      <div className="grid grid-cols-7 bg-white relative z-20 pt-2 border-b border-gray-50 font-sans">
        {['П', 'В', 'С', 'Ч', 'П', 'С', 'В'].map((day, i) => (
          <div key={i} className="py-2 text-center text-[10px] font-bold text-gray-300 uppercase">{day}</div>
        ))}
      </div>

      <div className="overflow-hidden flex-1 cursor-grab active:cursor-grabbing" ref={emblaRef}>
        <div className="flex h-full">
          <MonthGrid date={addMonths(currentDate, -1)} eventsByDay={eventsByDay} onDayClick={handleInnerDayClick} />
          <MonthGrid date={currentDate} eventsByDay={eventsByDay} onDayClick={handleInnerDayClick} />
          <MonthGrid date={addMonths(currentDate, 1)} eventsByDay={eventsByDay} onDayClick={handleInnerDayClick} />
        </div>
      </div>

      <DayDetailsModal 
        isOpen={selectedDayData.isOpen}
        onClose={() => setSelectedDayData(prev => ({ ...prev, isOpen: false }))}
        date={selectedDayData.date}
        events={selectedDayData.events}
        onBookingClick={(booking) => {
          onBookingClick(booking);
          setSelectedDayData(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}