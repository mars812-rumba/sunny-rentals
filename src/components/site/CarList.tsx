// src/components/CarList.tsx
import React from 'react';
import CarCard from './CarCard';

interface CarListProps {
  cars: any[];
  filters: any;
  onBooking: (car: any) => void;
  isSubmitting: boolean;
}

export const CarList = React.forwardRef<HTMLDivElement, CarListProps>(
  ({ cars, filters, onBooking, isSubmitting }, ref) => {
    const rentalDays = filters?.days || 0;

    return (
      <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {cars.length === 0 ? (
          // Если нет машин в выбранной категории
          <div className="col-span-full text-center py-12">
            <p className="text-xl text-gray-600">В выбранной категории нет доступных автомобилей</p>
          </div>
        ) : (
          // Показываем реальные машины
          cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              rentalDays={rentalDays}
              onBooking={onBooking}
              isSubmitting={isSubmitting}
            />
          ))
        )}
      </div>
    );
  }
);

export default CarList;