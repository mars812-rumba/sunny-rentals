import { parkText as pt } from '@/lib/park-locale';
import { parkBookingColors } from '@/lib/park-booking-colors';
import { useParkLocale } from '@/contexts/park-locale';
import React, { useMemo, useCallback, useEffect, memo, useState, useRef } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, addMonths, isSameMonth, isToday, isWeekend
} from 'date-fns';
import { ru } from 'date-fns/locale';
import useEmblaCarousel from 'embla-carousel-react';
import { LogisticsDate, Booking } from '@/api/api.ts'; 
import { cn } from '@/lib/utils';
import { DayDetailsModal } from './DayDetailsModal'; 
import { calendarBookingLanes, calendarDaySlots } from '@/lib/calendar-booking-lanes';
import { calendarModelLabel } from '@/lib/calendar-model-label';

interface DayEvent {
  type: 'pickup' | 'return' | 'rental';
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
  onCreateBooking?: (dateRange: { start: Date; end: Date }) => void;
  showOccupancy?: boolean;
  hideConfirmedOccupancy?: boolean;
  handoversOnly?: boolean;
}

const getMonthLetters = (date: Date, dateLocale: typeof ru) => {
  let name = format(date, dateLocale.code === 'ru' ? 'LLLL' : 'MMM', { locale: dateLocale }).toUpperCase();
  if (dateLocale.code === 'ru' && name === "СЕНТЯБРЬ") name = "СЕНТЯБР";
  return name.split('');
};

const MonthGrid = memo(({ 
  date, 
  eventsByDay, 
  onDayClick,
  onBadgeClick,
  showOccupancy = false,
  hideConfirmedOccupancy = false,
  handoversOnly = false
}: { 
  date: Date, 
  eventsByDay: Map<string, DayEvent[]>,
  onDayClick: (date: Date, events: DayEvent[], overflow?: boolean) => void,
  onBadgeClick: (event: DayEvent, e: React.MouseEvent) => void,
  showOccupancy?: boolean
  hideConfirmedOccupancy?: boolean
  handoversOnly?: boolean
}) => {
  const { pt, dateLocale } = useParkLocale();
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

  const laneLayout = useMemo(() => calendarBookingLanes(eventsByDay, days.map(day => format(day, 'yyyy-MM-dd'))), [eventsByDay, days]);

  const monthLetters = useMemo(() => getMonthLetters(date, dateLocale), [date, dateLocale]);
  const yearString = format(date, 'yyyy');
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="flex-[0_0_100%] w-full relative">
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

      <div className={cn("relative z-10 grid grid-flow-row auto-rows-fr divide-y border-t", showOccupancy ? "divide-dotted divide-slate-200/60 border-dotted border-slate-200/60" : "divide-gray-100 border-gray-100")}>
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className={cn("grid grid-cols-7 divide-x", showOccupancy ? "divide-dotted divide-slate-200/60" : "divide-gray-100")}>
            {week.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const events = eventsByDay.get(dayKey) || [];
              // Hide only visual occupancy badges; day details still receive all events.
              const visibleEvents = hideConfirmedOccupancy
                ? events.filter(event => event.type !== 'rental' || event.booking.status !== 'confirmed')
                : events;
              const isCurrentMonth = isSameMonth(day, date);
              const dayIsToday = isToday(day);
              const { slots, overflow } = showOccupancy && !handoversOnly
                ? calendarDaySlots(visibleEvents, laneLayout.lanes, Math.min(4, laneLayout.laneCount))
                : { slots: visibleEvents.slice(0, 4), overflow: visibleEvents.slice(4) };

              return (
                <div
                  key={dayKey}
                  data-calendar-day={dayKey}
                  className={cn(
                    "min-h-[100px] p-0.5 transition-colors cursor-pointer group focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700",
                    showOccupancy && dayIsToday ? 'bg-blue-50' : showOccupancy && isWeekend(day) ? 'bg-slate-100/40' : 'bg-transparent',
                    !(showOccupancy && dayIsToday) && (!isCurrentMonth ? "opacity-60" : "hover:bg-blue-60/50")
                  )}
                  onClick={() => onDayClick(day, events, false)}
                >
                  <div className="flex justify-between items-start mb-1">
                    {showOccupancy ? <button type="button" className={cn('min-h-11 w-full rounded-sm text-left px-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700', dayIsToday && 'font-bold text-blue-800')} aria-current={dayIsToday ? 'date' : undefined} aria-label={pt("{0}, событий: {1}", [format(day, 'd MMMM yyyy', { locale: dateLocale }), events.length])} onClick={event => { event.stopPropagation(); onDayClick(day, events); }}>{format(day, 'd')}</button> : <span className={cn(
                      "text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full transition-colors",
                      dayIsToday ? "bg-blue-600 text-white shadow-md" : isCurrentMonth ? "text-slate-500" : "text-gray-300"
                    )}>
                      {format(day, 'd')}
                    </span>}
                  </div>
                  
                  <div className={showOccupancy ? 'grid gap-0.5 font-sans' : 'space-y-0.5 overflow-hidden font-sans'}>
                    {slots.map((ev, idx) => {
                      if (!ev) return <div key={`empty-${idx}`} data-calendar-lane={idx} aria-hidden="true" className="h-5" />;
                      // Цвет в зависимости от статуса брони
                      const isPreBooking = ev.booking?.status === 'pre_booking';
                      const bgClass = handoversOnly
                        ? ev.type === 'pickup' ? parkBookingColors.pickup.badge : 'bg-orange-300 text-orange-950'
                        : showOccupancy
                        ? ev.type === 'rental'
                          ? ev.booking?.status === 'blocked' ? parkBookingColors.blocked.badge : isPreBooking ? parkBookingColors.pending.text : parkBookingColors.confirmed.text
                          : ev.booking?.status === 'blocked' ? parkBookingColors.blocked.badge : isPreBooking ? parkBookingColors.pending.badge : ev.type === 'pickup' ? parkBookingColors.pickup.badge : parkBookingColors.return.badge
                        : ev.booking?.status === 'blocked' ? 'bg-purple-100 text-purple-900' : isPreBooking
                        ? "bg-slate-200 text-slate-600"
                        : ev.type === 'pickup' 
                          ? "bg-green-400 text-green-900"
                          : ev.type === 'rental' ? "bg-blue-100 text-blue-900" : "bg-yellow-400 text-yellow-900";
                      
                      return (
                        <button type="button"
                          data-compact-event={showOccupancy ? true : undefined}
                          data-calendar-lane={showOccupancy ? idx : undefined}
                          data-calendar-booking={showOccupancy ? ev.booking_id : undefined}
                          data-plain-occupancy={showOccupancy && ev.type === 'rental' ? true : undefined}
                          key={idx}
                          className={cn(
                            showOccupancy ? "flex h-5 min-h-5 w-full items-center justify-center overflow-hidden px-0.5 py-0.5 text-[9px] leading-4 font-medium rounded hover:ring-1 hover:ring-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700" : "w-full h-[13px] px-1 text-[6px] font-medium cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all rounded-[2px] flex items-center justify-center",
                            bgClass
                          )}
                          aria-label={`${ev.booking?.status === 'blocked' ? pt("Блокировка") : ev.type === 'pickup' ? pt("Выдача") : ev.type === 'return' ? pt("Возврат") : pt("Занято")}: ${ev.carName}${showOccupancy && !handoversOnly && isPreBooking ? `, ${pt('Ожидает подтверждения')}` : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBadgeClick(ev, e);
                          }}
                          title={`${ev.booking?.status === 'blocked' ? pt('Блокировка') : ev.type === 'pickup' ? pt("Выдача") : ev.type === 'return' ? pt("Возврат") : pt("Занято")}: ${ev.carName}`}
                        >
                          <span className={showOccupancy ? 'block h-4 min-w-0 w-full truncate leading-4 tracking-tight' : 'block truncate tracking-tight'}>
                            {showOccupancy ? calendarModelLabel(ev.carName, ev.booking.form_data.car.model, ev.booking.form_data.car.brand) : ev.booking?.status === 'blocked' ? pt("Блок · {0}", [ev.carName]) : ev.carName}
                          </span>
                        </button>
                      );
                    })}
                    
                    {overflow.length > 0 && (
                      <button type="button"
                        className={showOccupancy ? "min-h-11 w-full text-xs font-semibold text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700" : "text-[7px] text-blue-500 font-bold pl-1 cursor-pointer hover:text-blue-700"}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          // Открыть popup только с теми бейджами которые не влезли
                          onDayClick(day, overflow, true);
                        }}
                      >
                        {pt("+ ещё")}{overflow.length}
                      </button>
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
  onCreateBooking,
  showOccupancy = false,
  hideConfirmedOccupancy = false,
  handoversOnly = false,
}: MonthCalendarViewProps) {
  const { pt, dateLocale } = useParkLocale();
  
  const [selectedDayData, setSelectedDayData] = useState<{
    isOpen: boolean;
    date: Date | null;
    events: DayEvent[];
  }>({ isOpen: false, date: null, events: [] });

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, startIndex: 1, duration: 30 });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    if (!logisticsData || !bookings) return map;

    logisticsData.forEach((item) => {
      // Ищем реальную бронь в массиве актуальных броней
      const fullBooking = bookings.find(b => b.booking_id === item.booking_id);

      // КРИТИЧЕСКИЙ МОМЕНТ: Если брони нет в списке активных, 
      // значит она удалена — игнорируем её для календаря
      if (!fullBooking) return; 

      // Фильтруем отмененные и отклоненные брони
      if (fullBooking.status === 'cancelled' || fullBooking.status === 'rejected') return;
      if (handoversOnly && fullBooking.status === 'blocked') return;

      const baseEvent = {
        carName: item.car_name,
        clientName: item.client_name,
        location: item.location || pt("Не указано"),
        booking_id: item.booking_id,
        booking: fullBooking,
        bookingStatus: fullBooking.status  // для определения цвета
      };

      const pDate = item.pickup_date ? new Date(item.pickup_date) : null;
      const rDate = item.return_date ? new Date(item.return_date) : null;

      if (!pDate || isNaN(pDate.getTime())) {
        // Пропускаем если нет pickup даты
      } else {
        const pKey = format(pDate, 'yyyy-MM-dd');
        if (!map.has(pKey)) map.set(pKey, []);
        map.get(pKey)!.push({ ...baseEvent, type: 'pickup', time: format(pDate, 'HH:mm') });
      }

      if (rDate && !isNaN(rDate.getTime())) {
        const rKey = format(rDate, 'yyyy-MM-dd');
        if (!map.has(rKey)) map.set(rKey, []);
        map.get(rKey)!.push({ ...baseEvent, location: item.return_location || baseEvent.location, type: 'return', time: format(rDate, 'HH:mm') });
      }
      if (showOccupancy && !handoversOnly && pDate && rDate && !isNaN(pDate.getTime()) && !isNaN(rDate.getTime())) {
        // Return day is not occupied; retain a separate return event on that day.
        for (let day = addDays(pDate, 1), count = 0; day < rDate && count < 365; day = addDays(day, 1), count++) {
          const key = format(day, 'yyyy-MM-dd');
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push({ ...baseEvent, type: 'rental', time: '' });
        }
      }
    });

    return map;
  }, [logisticsData, bookings, showOccupancy, handoversOnly, pt]);

  const handleInnerDayClick = useCallback((date: Date, events: DayEvent[], isOverflowClick = false) => {
    // Click on empty space - create booking immediately (только если не overflow click)
    if (onCreateBooking && !isOverflowClick) {
      onCreateBooking({ start: date, end: date });
    }
    if (onDayClick) onDayClick(date, events);
  }, [onDayClick, onCreateBooking]);

  const handleBadgeClick = useCallback((event: DayEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    // Click on badge - open booking for editing
    if (event.booking) {
      onBookingClick(event.booking);
    }
  }, [onBookingClick]);

  // Защита от двойного переключения
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = async () => {
      if (isAnimatingRef.current) return;
      const index = emblaApi.selectedScrollSnap();
      if (index === 0) {
        isAnimatingRef.current = true;
        onDateChange(addMonths(currentDate, -1));
        await emblaApi.scrollTo(1, true);
        isAnimatingRef.current = false;
      } else if (index === 2) {
        isAnimatingRef.current = true;
        onDateChange(addMonths(currentDate, 1));
        await emblaApi.scrollTo(1, true);
        isAnimatingRef.current = false;
      }
    };
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, currentDate, onDateChange]);

  return (
    <div className="bg-white min-h-[600px] w-full flex flex-col select-none overflow-hidden relative">
      <div className="grid grid-cols-7 bg-white relative z-20 pt-2 border-b border-gray-50 font-sans">
        {[
          { name: pt("Пн"), isWeekend: false },
          { name: pt("Вт"), isWeekend: false },
          { name: pt("Ср"), isWeekend: false },
          { name: pt("Чт"), isWeekend: false },
          { name: pt("Пт"), isWeekend: false },
          { name: pt("Сб"), isWeekend: true },
          { name: pt("Вс"), isWeekend: true }
        ].map((day, i) => (
          <div key={i} className={cn(
            "py-2 text-center text-[10px] font-bold uppercase",
            day.isWeekend ? showOccupancy ? "text-red-700" : "text-red-400" : "text-slate-500"
          )}>{day.name}</div>
        ))}
      </div>

      <div className="overflow-hidden flex-1 cursor-grab active:cursor-grabbing w-full" ref={emblaRef}>
        <div className="flex h-full">
          <MonthGrid date={addMonths(currentDate, -1)} eventsByDay={eventsByDay} onDayClick={handleInnerDayClick} onBadgeClick={handleBadgeClick} showOccupancy={showOccupancy} hideConfirmedOccupancy={hideConfirmedOccupancy} handoversOnly={handoversOnly} />
          <MonthGrid date={currentDate} eventsByDay={eventsByDay} onDayClick={handleInnerDayClick} onBadgeClick={handleBadgeClick} showOccupancy={showOccupancy} hideConfirmedOccupancy={hideConfirmedOccupancy} handoversOnly={handoversOnly} />
          <MonthGrid date={addMonths(currentDate, 1)} eventsByDay={eventsByDay} onDayClick={handleInnerDayClick} onBadgeClick={handleBadgeClick} showOccupancy={showOccupancy} hideConfirmedOccupancy={hideConfirmedOccupancy} handoversOnly={handoversOnly} />
        </div>
      </div>

      {!showOccupancy && <DayDetailsModal
        isOpen={selectedDayData.isOpen}
        onClose={() => setSelectedDayData(prev => ({ ...prev, isOpen: false }))}
        date={selectedDayData.date}
        events={selectedDayData.events}
        onBookingClick={(booking) => {
          onBookingClick(booking);
          setSelectedDayData(prev => ({ ...prev, isOpen: false }));
        }}
      />}
    </div>
  );
}
