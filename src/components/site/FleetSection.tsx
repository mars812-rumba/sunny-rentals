// src/components/site/FleetSection.tsx

import { useState, useEffect, useMemo } from "react";
import { useCars } from "@/contexts/CarsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import FilterForm from "@/components/site/FilterForm";
import { CarList } from "@/components/site/CarList";
import  CarListLoader  from "@/components/site/CarListLoader";
import  BookingModal  from "@/components/site/BookingModal";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function FleetSection() {
  const { cars, loading: carsLoading } = useCars();
  const { t } = useLanguage();
  const { toast } = useToast(); // ✅ Переместил ВНУТРЬ компонента

  // Filter states
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [returnToSameLocation, setReturnToSameLocation] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState('sedan');

  // Car states
  const [availableCars, setAvailableCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loading, setLoading] = useState(false);

  // Booking modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [bookingData, setBookingData] = useState(null);

  // Calculate rental days
  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  }, [startDate, endDate]);

  // Fetch available cars when filters change
  useEffect(() => {
    const fetchAvailableCars = async () => {
      if (!startDate || !endDate || !pickupLocation) {
        setAvailableCars(cars.filter(car => car.available));
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/available-cars`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            pickup_location: pickupLocation,
            return_location: returnToSameLocation ? pickupLocation : returnLocation,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableCars(data.available_cars || []);
        } else {
          setAvailableCars(cars.filter(car => car.available));
        }
      } catch (error) {
        console.error('Error fetching available cars:', error);
        setAvailableCars(cars.filter(car => car.available));
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableCars();
  }, [startDate, endDate, pickupLocation, returnLocation, returnToSameLocation, cars]);

  // Filter cars by category
  useEffect(() => {
    const filtered = availableCars.filter(car => {
      if (selectedCategory === 'all') return true;
      return car.class === selectedCategory;
    });
    setFilteredCars(filtered);
  }, [availableCars, selectedCategory]);

  // Handle filter changes
const handleFilterChange = (filterData) => {
  // Добавь проверку на undefined
  if (!filterData) return;
  
  setPickupLocation(filterData.pickupLocation || '');
  setReturnLocation(filterData.returnLocation || '');
  setReturnToSameLocation(filterData.returnToSameLocation ?? true);
  setStartDate(filterData.startDate);
  setEndDate(filterData.endDate);
};
  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // Handle book button click
  const handleBookClick = (car) => {
    if (!startDate || !endDate || !pickupLocation) {
      toast({
        title: t('toast_fill_filters'),
        variant: 'destructive',
      });
      return;
    }

    setSelectedCar(car);
    setBookingData({
      car,
      startDate,
      endDate,
      rentalDays,
      pickupLocation,
      returnLocation: returnToSameLocation ? pickupLocation : returnLocation,
    });
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCar(null);
    setBookingData(null);
  };

  const isLoading = carsLoading || loading;

  return (
    <section id="fleet" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Наш автопарк
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Более 50 проверенных автомобилей и байков
          </p>
        </div>

        {/* Filter Form */}
        <FilterForm
          onFiltersChange={handleFilterChange}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          onCompletionChange={(isComplete) => {}}
        />

        {/* Car List or Loader */}
        {isLoading ? (
          <CarListLoader />
        ) : (
          <>
            {/* Results count */}
            <div className="mb-6 text-center">
              <p className="text-gray-600">
                {t('found_cars', {
                  count: filteredCars.length,
                  category: t(`category_${selectedCategory}`),
                })}
              </p>
            </div>

            {/* Car List */}
            <CarList
              cars={filteredCars}
              rentalDays={rentalDays}
              onBookClick={handleBookClick}
            />

            {/* View All Button */}
            {filteredCars.length > 0 && (
              <div className="text-center mt-12">
                <a 
                  href="/"
                  className="inline-flex items-center px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition"
                >
                  Смотреть весь каталог
                </a>
              </div>
            )}
          </>
        )}

        {/* Booking Modal */}
        <BookingModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          car={selectedCar}
          bookingData={bookingData}
        />
      </div>
    </section>
  );
}