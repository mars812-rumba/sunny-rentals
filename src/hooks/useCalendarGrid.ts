import { useMemo, useState, useCallback } from 'react';
import { addDays, differenceInDays, startOfDay, subDays } from 'date-fns';
import { Booking } from '@/api/api';

const TOTAL_DAYS = 97; // 7 дней назад + 90 дней вперёд (3 месяца)

export const useCalendarGrid = (startDate: Date, bookings: Booking[], onCreateBooking: (carId: string, dateRange: { start: Date; end: Date }) => void) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionCarId, setSelectionCarId] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{carId: string, dayIndex: number} | null>(null);

  const actualStartDate = useMemo(() => subDays(startDate, 7), [startDate]);
  
  const dates = useMemo(() => {
    return Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(actualStartDate, i));
  }, [actualStartDate]);

  const bookingsByCarId = useMemo(() => {
    const map = new Map<string, Booking[]>();
    if (!bookings || !Array.isArray(bookings)) {
        return map;
    }
    bookings.forEach(booking => {
      const carId = booking.form_data.car.id;
      if (!map.has(carId)) map.set(carId, []);
      map.get(carId)!.push(booking);
    });
    return map;
  }, [bookings]);

  const getBookingPosition = (booking: Booking, dayWidth: number) => {
    const bookingStart = startOfDay(new Date(booking.form_data.dates.start));
    const bookingEnd = startOfDay(new Date(booking.form_data.dates.end));
    const viewStart = actualStartDate;
    const viewEnd = addDays(actualStartDate, TOTAL_DAYS - 1);

    if (bookingEnd < viewStart || bookingStart > viewEnd) return null;

    const startOffset = Math.max(0, differenceInDays(bookingStart, viewStart));
    const endOffset = Math.min(TOTAL_DAYS - 1, differenceInDays(bookingEnd, viewStart));
    
    const left = startOffset * dayWidth;
    const width = (endOffset - startOffset + 1) * dayWidth - 2;

    return { left, width };
  };

  const handleCellTouchStart = useCallback((carId: string, dayIndex: number, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectionCarId(carId);
    setSelectionStart(dayIndex);
    setSelectionEnd(dayIndex);
  }, []);

  const handleCellTouchMove = useCallback((dayIndex: number) => {
    if (isSelecting && selectionStart !== null) {
      setSelectionEnd(dayIndex);
    }
  }, [isSelecting, selectionStart]);

  const handleCellTouchEnd = useCallback(() => {
    if (isSelecting && selectionCarId && selectionStart !== null && selectionEnd !== null) {
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      onCreateBooking(selectionCarId, {
        start: dates[start],
        end: dates[end]
      });
      setTimeout(() => {
        setIsSelecting(false);
        setSelectionCarId(null);
        setSelectionStart(null);
        setSelectionEnd(null);
      }, 100);
      return;
    }
    setIsSelecting(false);
    setSelectionCarId(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionCarId, selectionStart, selectionEnd, dates, onCreateBooking]);

  const isInSelection = (carId: string, dayIndex: number) => {
    if (!isSelecting || selectionCarId !== carId || selectionStart === null || selectionEnd === null) {
      return false;
    }
    const min = Math.min(selectionStart, selectionEnd);
    const max = Math.max(selectionStart, selectionEnd);
    return dayIndex >= min && dayIndex <= max;
  };

  const phantomRange = useMemo(() => {
      if (!isSelecting || !selectionCarId || selectionStart === null || selectionEnd === null) return null;
      const min = Math.min(selectionStart, selectionEnd);
      const max = Math.max(selectionStart, selectionEnd);
      return { carId: selectionCarId, start: min, end: max };
  }, [isSelecting, selectionCarId, selectionStart, selectionEnd]);

  return {
      dates,
      actualStartDate,
      bookingsByCarId,
      isSelecting,
      selectionCarId,
      selectionStart,
      selectionEnd,
      hoveredCell,
      phantomRange,
      setHoveredCell,
      getBookingPosition,
      handleCellTouchStart,
      handleCellTouchMove,
      handleCellTouchEnd,
      isInSelection
  };
};