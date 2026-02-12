import { createContext, useContext, useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface Car {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: string;
  class: string;
  color: string;
  available: boolean;
  photos: { main: string; gallery: string[] };
  pricing: any;
  quick_id: string;
  rating: number;
  updated_at?: string;
}

interface CarsContextType {
  cars: Car[];
  loading: boolean;
  refetchCars: () => Promise<void>;
}

const CarsContext = createContext<CarsContextType | undefined>(undefined);

export function CarsProvider({ children }: { children: React.ReactNode }) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

 const fetchCars = async () => {
  try {
    setLoading(true);
    const cacheBuster = new Date().getTime();
    const res = await fetch(`${API_URL}/api/cars?_=${cacheBuster}`); // ✅ ФИКС
    if (!res.ok) throw new Error("Failed to fetch cars");
    const data = await res.json();
    const carsList = Array.isArray(data.cars) ? data.cars : Object.values(data.cars || {});
    setCars(carsList);
  } catch (err) {
    console.error("Fetch cars error:", err);
    setCars([]); // ✅ Всегда возвращаем массив
  } finally {
    setLoading(false);
  }
};

  const refetchCars = async () => {
    await fetchCars(); // ← ГАРАНТИРОВАННО ОБНОВЛЯЕТ
  };

  // Загружаем при старте
  useEffect(() => {
    fetchCars();
  }, []);

  return (
    <CarsContext.Provider value={{ cars, loading, refetchCars }}>
      {children}
    </CarsContext.Provider>
  );
}

export const useCars = () => {
  const context = useContext(CarsContext);
  if (!context) throw new Error("useCars must be used within CarsProvider");
  return context;
};