import React from 'react';
import CarCard from './CarCard';

interface CarListProps {
  cars: any[];
  filters: any;
  onBooking: (car: any) => void;
  isSubmitting: boolean;
}

export const CarList = React.forwardRef<HTMLDivElement, CarListProps>(({ cars, filters, onBooking, isSubmitting }, ref) => {
  const rentalDays = filters.days;
  
  if (cars.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8">
        Автомобили по вашему запросу не найдены.
      </div>
    );
  }
  
  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} rentalDays={rentalDays} onBooking={onBooking} isSubmitting={isSubmitting} />
      ))}
    </div>
  );
});

export default CarList;
