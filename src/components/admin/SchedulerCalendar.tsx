import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { webpImagePath } from "../../../shared/webp-image";
import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Car, Booking } from '@/api/api';
import { cn } from '@/lib/utils';
import { CarFront } from 'lucide-react';
import { useCalendarGrid } from '@/hooks/useCalendarGrid';
import { schedulerInitialOffset } from '@/lib/scheduler-scroll';
import { parkBookingColors } from '@/lib/park-booking-colors';
import { dateLabel } from '@/lib/park-rental';
import { calendarModelLabel } from '@/lib/calendar-model-label';
import { observeTimetableViewport } from '@/lib/timetable-viewport';

// 🎨 Получить URL фото
const getPhotoUrl = (filename: string | null | undefined): string | null => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  
  const API_BASE = import.meta.env.VITE_API_URL || '';
  return `${API_BASE}/images_web/${webpImagePath(filename)}`;
};

interface SchedulerCalendarProps {
  cars: Car[];
  bookings: Booking[];
  startDate: Date;
  daysToShow: number;
  onDateChange: (date: Date) => void;
  onBookingClick: (booking: Booking) => void;
  onCreateBooking: (carId: string, dateRange: { start: Date; end: Date }) => void;
  selectedClass?: string;
  carOwnersMap?: Record<string, string>;
  isCompactMode?: boolean; // 🆕 Компактный режим
  readOnly?: boolean;
  exclusiveEnd?: boolean;
  renderCarPhoto?: (car: Car) => React.ReactNode;
  onCarClick?: (carId: string) => void;
  initialScrollDate?: Date;
  scrollResetKey?: number;
  onDayCellClick?: (carId: string, day: Date) => void;
  dayCellsDisabled?: boolean;
  pageScroll?: boolean;
}

const DAY_WIDTH = 24;
const HEADER_HEIGHT = 32;
const SIDEBAR_WIDTH = 60;

// 🆕 Динамическая высота строк
const getRowHeight = (isCompact: boolean) => isCompact ? 24 : 40;

// 🎨 Цвета для месяцев
const MONTH_COLORS: Record<number, string> = {
  0: '#f8f9fa', 1: '#f1f3f5', 2: '#e9ecef', 3: '#dee2e6',
  4: '#ced4da', 5: '#adb5bd', 6: '#ced4da', 7: '#dee2e6',
  8: '#e9ecef', 9: '#f1f3f5', 10: '#f8f9fa', 11: '#f1f3f5'
};

export function SchedulerCalendar({
  cars,
  bookings,
  startDate,
  daysToShow = 97,
  onBookingClick,
  onCreateBooking,
  carOwnersMap = {},
  isCompactMode = false, // 🆕 Дефолтное значение
  readOnly = false,
  exclusiveEnd = false,
  renderCarPhoto,
  onCarClick,
  initialScrollDate,
  scrollResetKey = 0,
  onDayCellClick,
  dayCellsDisabled = false,
  pageScroll = false,
}: SchedulerCalendarProps) {
  const { pt, dateLocale } = useParkLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const tap = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const focusedDays = useRef(new Map<string, number>());
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);
  const [selectedCarInfo, setSelectedCarInfo] = useState<{car: Car, owner: string | null} | null>(null);
  const [lastBookingTap, setLastBookingTap] = useState<{
    bookingId: string;
    timestamp: number;
  } | null>(null);
  const DOUBLE_TAP_DELAY = 300;

  // 🆕 Динамическая высота
  const CAR_ROW_HEIGHT = readOnly ? 48 : getRowHeight(isCompactMode);
  const sidebarWidth = pageScroll ? 72 : readOnly ? 120 : SIDEBAR_WIDTH;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!pageScroll || !sentinel) return;
    return observeTimetableViewport(sentinel);
  }, [pageScroll]);

  // Keep the legacy editable scheduler's existing 97-day window unchanged.
  const {
    dates,
    bookingsByCarId,
    phantomRange,
    hoveredCell,
    setHoveredCell,
    getBookingPosition,
    handleCellTouchStart,
    handleCellTouchMove,
    handleCellTouchEnd,
    isInSelection
  } = useCalendarGrid(startDate, bookings, onCreateBooking, exclusiveEnd, readOnly ? daysToShow : 97);

  useEffect(() => {
    if (scrollRef.current) {
      if (readOnly) {
        const offset = schedulerInitialOffset(dates, initialScrollDate, DAY_WIDTH);
        scrollRef.current.scrollLeft = offset;
        if (headerScrollRef.current) headerScrollRef.current.scrollLeft = offset;
        return;
      }
      const today = new Date();
      const todayIndex = dates.findIndex(date => isSameDay(date, today));
      
      if (todayIndex !== -1) {
        const scrollPosition = Math.max(0, (todayIndex - 5) * DAY_WIDTH);
        scrollRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [dates, readOnly, initialScrollDate, scrollResetKey]);

  const handleBookingClick = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (readOnly) { onBookingClick(booking); return; }
    const now = Date.now();
    if (lastBookingTap && lastBookingTap.bookingId === booking.booking_id 
        && (now - lastBookingTap.timestamp) < DOUBLE_TAP_DELAY) {
      onBookingClick(booking);
      setLastBookingTap(null);
    } else {
      setLastBookingTap({ bookingId: booking.booking_id, timestamp: now });
    }
  };

  const totalWidth = dates.length * DAY_WIDTH;

  const formatBookingBadge = (booking: Booking) => {
    const fd = booking.form_data;
    const start = new Date(fd.dates.start);
    const end = new Date(fd.dates.end);
    
    const startStr = readOnly && !pageScroll ? dateLabel(fd.dates.start.slice(0, 10), 'short') : `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth() + 1).padStart(2, '0')}`;
    const endStr = readOnly && !pageScroll ? dateLabel(fd.dates.end.slice(0, 10), 'short') : `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth() + 1).padStart(2, '0')}`;
    const pickupTime = fd.dates.pickupTime || format(start, 'HH:mm');
    
    const line1Parts = [];
    if (booking.status === 'blocked') line1Parts.push(readOnly && !pageScroll && fd.personalInfo?.notes?.trim() ? fd.personalInfo.notes.trim() : pt("Блокировка"));
    line1Parts.push(`${startStr}-${endStr}`);
    line1Parts.push(pickupTime);
    if (fd.locations?.pickupLocation) line1Parts.push(fd.locations.pickupLocation);
    line1Parts.push(fd.car.name || `${fd.car.brand} ${fd.car.model}`);
    
    const line2Parts = [];
    if (fd.contact?.name) line2Parts.push(fd.contact.name);
    if (fd.contact?.value) line2Parts.push(fd.contact.value);
    
    return {
      line1: line1Parts.join(' • '),
      line2: line2Parts.join(' • ')
    };
  };

  const dateHeader = (
    <>
        {/* Header dates */}
        <div className="sticky top-0 z-20 flex bg-white border-b border-gray-300 shadow-md">
          {/* Sidebar header */}
          <div
            className="sticky left-0 z-30 flex-shrink-0 border-r border-gray-300 px-1 flex items-center justify-center bg-white shadow-sm"
            style={{ width: sidebarWidth, height: HEADER_HEIGHT }}
          >
            <span className="text-[9px] font-bold text-gray-600">{pt("Авто")}</span>
          </div>

          {/* Date cells */}
          <div className="flex">
            {dates.map((date, i) => {
              const isToday = isSameDay(date, new Date());
              const isFirstOfMonth = date.getDate() === 1;

              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-200 border-r border-gray-300/30",
                    isToday && "bg-blue-100 font-bold"
                  )}
                  style={{
                    width: DAY_WIDTH,
                    height: HEADER_HEIGHT
                  }}
                >
                  {isFirstOfMonth && (
                    <span className="absolute top-0 text-[7px] font-bold text-orange-600">
                      {format(date, 'MMM', { locale: dateLocale })}
                    </span>
                  )}
                  <span className={cn(
                    "text-[8px] uppercase",
                    isToday ? "text-blue-700 font-bold" : "text-gray-500"
                  )}>
                    {format(date, 'EEEEEE', { locale: dateLocale })}
                  </span>
                  <span className={cn(
                    "text-[10px] font-semibold",
                    isToday ? "text-blue-700" : "text-gray-700"
                  )}>
                    {format(date, 'd')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

    </>
  );

 return (
  <div className={pageScroll ? 'relative min-h-[100dvh] bg-white' : readOnly ? 'relative' : 'relative h-full'} data-page-timetable={pageScroll || undefined}>
    {pageScroll && <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <div className="sticky top-0 z-40 bg-white" data-timetable-date-header>
        <div ref={headerScrollRef} className="overflow-hidden"><div style={{ width: totalWidth + sidebarWidth }}>{dateHeader}</div></div>
      </div>
    </>}
    <div
      ref={scrollRef}
      className={pageScroll ? 'overflow-x-auto' : 'overflow-x-auto overflow-y-auto'}
      style={{ height: pageScroll ? undefined : readOnly ? HEADER_HEIGHT + Math.max(cars.length, 1) * CAR_ROW_HEIGHT + 16 : 'calc(100vh - 60px)', maxHeight: readOnly && !pageScroll ? 'min(65vh, 520px)' : undefined }}
      onScroll={pageScroll ? event => { if (headerScrollRef.current) headerScrollRef.current.scrollLeft = event.currentTarget.scrollLeft; } : undefined}
      tabIndex={readOnly ? 0 : undefined}
      role={readOnly ? 'region' : undefined}
      aria-label={readOnly ? pt("Гант занятости, прокрутка по датам") : undefined}
      onPointerDownCapture={readOnly && onDayCellClick ? event => {
        tap.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop, moved: false };
      } : undefined}
      onPointerMoveCapture={readOnly && onDayCellClick ? event => {
        if (tap.current && Math.hypot(event.clientX - tap.current.x, event.clientY - tap.current.y) > 8) tap.current.moved = true;
      } : undefined}
      onPointerCancelCapture={readOnly && onDayCellClick ? () => { if (tap.current) tap.current.moved = true; } : undefined}
      onClickCapture={readOnly && onDayCellClick ? event => {
        const gesture = tap.current;
        if (event.detail !== 0 && gesture && (gesture.moved || Math.abs(event.currentTarget.scrollLeft - gesture.left) > 8 || Math.abs(event.currentTarget.scrollTop - gesture.top) > 8)) {
          event.preventDefault(); event.stopPropagation();
        }
      } : undefined}
      onMouseUp={() => handleCellTouchEnd()}
      onMouseLeave={() => handleCellTouchEnd()}
    >
      <div style={{ width: totalWidth + sidebarWidth }}>
        {!pageScroll && dateHeader}

        {/* Car rows */}
        {cars.map((car) => {
          const carBookings = bookingsByCarId.get(car.id) || [];
          const ownerBadge = carOwnersMap[car.id];
          const focusIndex = readOnly && onDayCellClick
            ? focusedDays.current.get(car.id) ?? Math.max(0, dates.findIndex(day => isSameDay(day, initialScrollDate || startDate)))
            : -1;

          return (
            <div
              key={car.id}
              className={cn(
                "flex border-b border-gray-300/30 transition-all duration-200"
              )}
              style={{ height: CAR_ROW_HEIGHT }}
            >
              {/* Sidebar */}
              <div
                className={cn(
                  "sticky left-0 z-10 flex-shrink-0 flex items-center px-1 border-r border-gray-300 bg-white shadow-sm",
                  !readOnly && "cursor-pointer hover:bg-gray-50 transition-all",
                  readOnly ? "flex-col justify-center" : isCompactMode ? "flex-row gap-1 py-0.5" : "flex-col justify-center py-0.5"
                )}
                style={{ width: sidebarWidth }}
                onClick={readOnly ? undefined : () => {
                  setSelectedCarInfo({ car, owner: ownerBadge || null });
                }}
              >
                {readOnly && onCarClick && <button type="button" onClick={event => { event.currentTarget.focus({ preventScroll: true }); onCarClick(car.id); }} aria-label={pt('Открыть автомобиль: {0}', [car.name])} className="absolute inset-0 z-10 cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700" />}
                {readOnly && <div className={pageScroll ? 'h-7 w-16 shrink-0 overflow-hidden rounded bg-slate-100' : 'h-7 w-20 shrink-0 overflow-hidden rounded bg-slate-100'}>
                  {renderCarPhoto ? renderCarPhoto(car) : <div className="grid h-full w-full place-items-center"><CarFront aria-hidden="true" className="h-4 w-4 text-slate-500" /></div>}
                </div>}
                {/* 🆕 Фото - показываем только если НЕ компактный режим */}
                {!readOnly && !isCompactMode && (
                  <div className="relative w-full aspect-video rounded overflow-hidden bg-gray-200">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: car.photos?.main ? `url(${getPhotoUrl(car.photos.main)})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                  </div>
                )}

                {/* Текст */}
                <div className={cn(
                  "w-full text-center",
                  isCompactMode ? "mt-0" : "mt-0.5"
                )}>
                  <div title={car.name} className={cn(
                    "font-bold text-gray-900 leading-none truncate",
                    pageScroll ? "text-[10px] leading-4" : readOnly ? "text-xs leading-4" : isCompactMode ? "text-[6px]" : "text-[7px]"
                  )}>
                    {pageScroll ? calendarModelLabel(car.name, car.model, car.brand) : readOnly ? car.name : `${car.brand} ${car.model}`}
                  </div>
                </div>
              </div>

              {/* Calendar cells */}
              <div className="flex-1 relative" style={{ height: CAR_ROW_HEIGHT }}>
                {/* Day cells */}
                <div className="absolute inset-0 flex">
                  {dates.map((date, i) => {
                    const monthBg = MONTH_COLORS[date.getMonth()];
                    const isToday = isSameDay(date, new Date());
                    const isSelected = isInSelection(car.id, i);
                    const isPhantomRangeInCell = phantomRange && car.id === phantomRange.carId && i >= phantomRange.start && i <= phantomRange.end;
                    const isHovered = !isSelected && !isPhantomRangeInCell && hoveredBooking === null && hoveredCell?.carId === car.id && hoveredCell?.dayIndex === i;

                    if (readOnly && onDayCellClick) {
                      const dayKey = format(date, 'yyyy-MM-dd');
                      return <button key={dayKey} type="button" data-compact-event data-day-index={i}
                        aria-label={pt('Ячейка календаря: {0}, {1}', [car.name, dateLabel(dayKey)])}
                        disabled={dayCellsDisabled} tabIndex={i === focusIndex ? 0 : -1}
                        className="shrink-0 cursor-pointer border-r border-gray-300/30 p-0 hover:brightness-95 active:brightness-90 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-default"
                        style={{ width: DAY_WIDTH, height: '100%', backgroundColor: isToday ? '#dbeafe' : monthBg }}
                        onFocus={event => {
                          focusedDays.current.set(car.id, i);
                          for (const sibling of event.currentTarget.parentElement?.children || []) {
                            if (sibling instanceof HTMLButtonElement) sibling.tabIndex = sibling === event.currentTarget ? 0 : -1;
                          }
                        }}
                        onKeyDown={event => {
                          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                          event.preventDefault();
                          const index = event.key === 'Home' ? 0 : event.key === 'End' ? dates.length - 1 : Math.max(0, Math.min(dates.length - 1, i + (event.key === 'ArrowLeft' ? -1 : 1)));
                          const next = event.currentTarget.parentElement?.children[index];
                          if (next instanceof HTMLButtonElement) next.focus();
                        }}
                        onClick={event => { event.currentTarget.focus({ preventScroll: true }); onDayCellClick(car.id, date); }} />;
                    }

                    return (
                      <div
                        key={i}
                        className={cn(
                          "transition-colors border-r border-gray-300/30",
                          isToday && "bg-blue-100/50",
                          isSelected && "bg-orange-300/50",
                          isPhantomRangeInCell && "bg-orange-200/50",
                          isHovered && "bg-orange-100/30"
                        )}
                        style={{
                          width: DAY_WIDTH,
                          height: '100%',
                          backgroundColor:
                            !isToday &&
                              !isSelected &&
                              !isPhantomRangeInCell &&
                              !isHovered
                              ? monthBg
                              : undefined,
                        }}
                        onMouseDown={readOnly ? undefined : (e) => handleCellTouchStart(car.id, i, e)}
                        onMouseUp={handleCellTouchEnd}
                        onMouseEnter={() => { handleCellTouchMove(i); setHoveredCell({ carId: car.id, dayIndex: i }); }}
                        onMouseLeave={() => setHoveredCell(null)}
                        onTouchStart={readOnly ? undefined : (e) => handleCellTouchStart(car.id, i, e)}
                        onTouchEnd={handleCellTouchEnd}
                      />
                    );
                  })}
                </div>

                {/* Booking bars */}
                <div className="absolute inset-0 pointer-events-none">
                  {carBookings.map((booking) => {
                    const position = getBookingPosition(booking, DAY_WIDTH);
                    if (!position) return null;

                    const badgeData = formatBookingBadge(booking);
                    // Color coding for new booking status system
                    const bgColor = readOnly && ['blocked', 'pre_booking', 'confirmed'].includes(booking.status)
                      ? booking.status === 'blocked' ? parkBookingColors.blocked.bar : booking.status === 'pre_booking' ? parkBookingColors.pending.bar : parkBookingColors.confirmed.bar
                      :
                      booking.status === 'blocked' ? '#e9d5ff' : booking.status === 'confirmed'
                        ? 'rgba(74, 227, 69, 0.9)'
                        : booking.status === 'rejected'
                          ? 'rgba(239, 68, 68, 0.15)'  // Очень прозрачный красный
                          : 'rgba(226, 221, 233, 0.89)';  // pre_booking - серый

                    return (
                      <div
  key={booking.booking_id}
  role={readOnly ? 'button' : undefined}
  tabIndex={readOnly ? 0 : undefined}
  title={readOnly ? `${badgeData.line1}\n${badgeData.line2}` : undefined}
  aria-label={readOnly ? `${booking.form_data.car.name}: ${dateLabel(booking.form_data.dates.start.slice(0, 10))} — ${dateLabel(booking.form_data.dates.end.slice(0, 10))}, ${booking.status === 'blocked' ? pt("Блокировка") : booking.status === 'pre_booking' ? pt("Ожидает подтверждения") : pt("Занято")}` : undefined}
  onKeyDown={readOnly ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onBookingClick(booking); } } : undefined}
  className={cn(
    "absolute top-[6px] bottom-[6px] pointer-events-auto cursor-pointer transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700",
    hoveredBooking === booking.booking_id && "ring-1 ring-blue-400 z-10"
  )}
  style={{
    left: position.left + 2,
    width: position.width - 4,
  }}


                        onClick={(e) => handleBookingClick(booking, e)}
                        onMouseEnter={() => setHoveredBooking(booking.booking_id)}
                        onMouseLeave={() => setHoveredBooking(null)}
                      >
                        <div className="relative h-full" style={{
                          backgroundColor: bgColor,
                          clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
                        }}>
                        {booking.status === 'pre_booking' && (
                          <div className={cn("absolute bottom-[1px] right-[6px] text-[6px] px-[2px] rounded-[1px] font-semibold uppercase pointer-events-none", readOnly ? parkBookingColors.pending.badge : 'bg-gray-400/70 text-white')}>
                            {pt("ПРЕДБРОНЬ")}</div>
                        )}
                        {booking.status === 'rejected' && (
                          <div className="absolute bottom-[1px] right-[6px] text-[6px] px-[2px] rounded-[1px] bg-red-500/30 text-red-600 font-semibold uppercase pointer-events-none">
                            {pt("ОТКЛОНЕН")}</div>
                        )}

                        <div className="px-0.5 pl-[8px] pr-[2px] h-full flex flex-col justify-center overflow-hidden leading-tight">
                          <div className={cn(
                            "font-semibold text-white-800 whitespace-nowrap overflow-hidden text-ellipsis",
                            pageScroll ? "text-[9px]" : readOnly ? "text-xs" : isCompactMode ? "text-[6px]" : "text-[7px]"
                          )}>
                            {badgeData.line1}
                          </div>

                          {!isCompactMode && (
                            <div className="text-[7px] font-medium text-white-700 whitespace-nowrap overflow-hidden text-ellipsis">
                              {badgeData.line2}
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Диалог с инфо о машине */}
      {selectedCarInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCarInfo(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Фото */}
            <div className="aspect-video rounded-xl overflow-hidden bg-gray-200 mb-4">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: selectedCarInfo.car.photos?.main
                    ? `url(${getPhotoUrl(selectedCarInfo.car.photos.main)})`
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            </div>

            {/* Инфо */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedCarInfo.car.brand} {selectedCarInfo.car.model}
                </h3>
                <p className="text-sm text-gray-600">{selectedCarInfo.car.year}</p>
              </div>

              {selectedCarInfo.owner && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                  <div>
                    <p className="text-xs text-gray-600">{pt("Владелец")}</p>
                    <p className="text-sm font-semibold text-purple-700">{selectedCarInfo.owner}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedCarInfo(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
              >
                {pt("Закрыть")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
