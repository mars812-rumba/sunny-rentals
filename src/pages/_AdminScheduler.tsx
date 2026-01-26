import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfDay } from 'date-fns';
import { Calendar, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SchedulerCalendar } from '@/components/admin/SchedulerCalendar';
import { BookingFormModal } from '@/components/admin/BookingFormModal';
import { fetchCars, fetchBookings, Car, Booking, fetchCarOwners } from '@/api/api';

const CAR_CLASSES = [
  { id: 'all', name: 'Все' },
  { id: 'compact', name: 'Компакт' },
  { id: 'sedan', name: 'Седан' },
  { id: 'suv', name: 'SUV' },
  { id: '7s', name: '7 мест' },
  { id: 'bikes', name: 'Байки' },
];

export default function AdminScheduler() {
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [daysToShow, setDaysToShow] = useState(30);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [initialDateRange, setInitialDateRange] = useState<{ start: Date; end: Date } | undefined>();

  // ✅ Двойной клик для создания броней
  const [lastTap, setLastTap] = useState<{
    type: 'create';
    id: string;
    timestamp: number;
  } | null>(null);
  
  const DOUBLE_TAP_DELAY = 300;

  const [carOwnersMap, setCarOwnersMap] = useState<Record<string, string>>({});

  // Fetch data
  const { data: cars = [], isLoading: carsLoading, refetch: refetchCars } = useQuery({
    queryKey: ['admin-cars'],
    queryFn: () => fetchCars(),
  });

  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => fetchBookings(),
  });

  // Fetch car owners map
  useEffect(() => {
    fetchCarOwners().then(setCarOwnersMap);
  }, []);

  // Filter cars
  const filteredCars = cars.filter(car => {
    if (selectedClass === 'all') return true;
    return car.class === selectedClass;
  });

  // ✅ Handle booking click - двойной клик обработан в SchedulerCalendar
  const handleBookingClick = (booking: Booking) => {
    const car = cars.find(c => c.id === booking.form_data.car.id);
    if (!car) return;

    setSelectedCar(car);
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  // ✅ ТОЛЬКО двойной клик открывает модалку создания
  const handleCreateBooking = (carId: string, dateRange: { start: Date; end: Date }) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return;

    const now = Date.now();
    const tapId = `create-${carId}-${dateRange.start.getTime()}`;

    // Двойной клик
    if (lastTap && lastTap.id === tapId && (now - lastTap.timestamp) < DOUBLE_TAP_DELAY) {
      // Второй клик - открываем модалку
      setSelectedCar(car);
      setSelectedBooking(null);
      setInitialDateRange(undefined);
      setTimeout(() => {
        setInitialDateRange(dateRange);
        setIsModalOpen(true);
      }, 0);
      setLastTap(null);
    } else {
      // Первый клик - ничего не делаем, просто сохраняем
      setLastTap({ type: 'create', id: tapId, timestamp: now });
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCar(null);
    setSelectedBooking(null);
    setInitialDateRange(undefined);
  };

  // Handle booking success
  const handleBookingSuccess = () => {
    refetchBookings();
    refetchCars();
  };

  // Adjust days based on screen
  useEffect(() => {
    const updateDaysToShow = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDaysToShow(14);
      } else {
        setDaysToShow(30);
      }
    };

    updateDaysToShow();
    window.addEventListener('resize', updateDaysToShow);
    return () => window.removeEventListener('resize', updateDaysToShow);
  }, []);

  const isLoading = carsLoading || bookingsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-800">Календарь</span>
            <span className="text-[9px] text-gray-500">(2x click)</span>
          </div>
          
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-28 h-8 text-xs bg-white border-gray-200 text-gray-800">
              <Filter className="h-3 w-3 mr-1 opacity-50" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {CAR_CLASSES.map(cls => (
                <SelectItem key={cls.id} value={cls.id} className="text-xs text-gray-800">
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar */}
      <main className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <SchedulerCalendar
            cars={filteredCars}
            bookings={bookings}
            startDate={startDate}
            daysToShow={daysToShow}
            onDateChange={setStartDate}
            onBookingClick={handleBookingClick}
            onCreateBooking={handleCreateBooking}
            selectedClass={selectedClass}
            carOwnersMap={carOwnersMap}
          />
        )}
      </main>

      {/* Booking Modal - СВЕТЛАЯ (оригинальная) */}
      <BookingFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        car={selectedCar}
        booking={selectedBooking}
        initialDateRange={initialDateRange}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
}