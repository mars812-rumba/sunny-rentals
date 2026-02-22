import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, Calendar, CreditCard, Check, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import useEmblaCarousel from 'embla-carousel-react';

// Определение сезона
const determineSeason = (date: Date) => {
  const month = date.getMonth() + 1;
  if (month === 12 || month === 1 || month === 2) {
    return 'high_season';
  }
  return 'low_season';
};

// Получение цены за период
const getPriceForPeriod = (pricing: any, days: number, startDate: Date) => {
  if (!pricing) return 0;
  const season = determineSeason(startDate);
  const seasonPrices = pricing[season];
  if (!seasonPrices) return 0;
  
  if (days >= 30) return seasonPrices.price_30 || 0;
  if (days >= 15) return seasonPrices.price_15_29 || 0;
  if (days >= 7) return seasonPrices.price_7_14 || 0;
  return seasonPrices.price_1_6 || 0;
};

// URL для API
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface CarData {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  class: string;
  photos: {
    main: string;
    gallery: string[];
  };
  specs: {
    fuel: string;
    engine: string;
    power: string;
    transmission: string;
  };
  pricing: {
    low_season: {
      price_1_6: number;
      price_7_14: number;
      price_15_29: number;
      price_30: number;
    };
    high_season: {
      price_1_6: number;
      price_7_14: number;
      price_15_29: number;
      price_30: number;
    };
    deposit: number;
  };
}

export default function OfferPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const carId = searchParams.get("car");
  const startDateStr = searchParams.get("start");
  const endDateStr = searchParams.get("end");
  // Админ если есть ?admin=true или есть токен в localStorage
  const isAdmin = searchParams.get("admin") === "true" || !!localStorage.getItem('authToken');
  
  const [car, setCar] = useState<CarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Embla carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  
  // Редактируемые поля (только для админа)
  const [totalRental, setTotalRental] = useState("");
  const [totalDelivery, setTotalDelivery] = useState("");
  const [deposit, setDeposit] = useState("");
  
  // Вычисляемые значения
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;
  
  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, differenceInDays(endDate, startDate));
  }, [startDate, endDate]);
  
  const basePricePerDay = useMemo(() => {
    if (!car?.pricing || !startDate || days === 0) return 0;
    return getPriceForPeriod(car.pricing, days, startDate);
  }, [car, startDate, days]);
  
  const baseTotalRental = useMemo(() => {
    return basePricePerDay * days;
  }, [basePricePerDay, days]);
  
  const baseDeposit = car?.pricing?.deposit || 5000;
  
  // Инициализация полей при загрузке
  useEffect(() => {
    if (baseTotalRental > 0 && !totalRental) {
      setTotalRental(baseTotalRental.toString());
    }
    if (!totalDelivery) {
      setTotalDelivery("0"); // Аэропорт по умолчанию
    }
    if (!deposit) {
      setDeposit(baseDeposit.toString());
    }
  }, [baseTotalRental, baseDeposit]);
  
  // Загрузка данных авто
  useEffect(() => {
    const fetchCar = async () => {
      if (!carId) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API_URL}/api/cars`);
        const data = await res.json();
        const cars = data.cars || {};
        
        // Ищем авто по ключу или по car.id / quick_id
        let carData = cars[carId];
        
        if (!carData) {
          // Ищем по всем ключам
          for (const key of Object.keys(cars)) {
            const c = cars[key];
            if (c.id === carId || c.quick_id === carId || c.id === carId?.replace(/-/g, '_')) {
              carData = c;
              break;
            }
          }
        }
        
        if (carData) {
          setCar(carData);
        } else {
          console.error("Авто не найдено:", carId, "доступные ключи:", Object.keys(cars).slice(0, 5));
        }
      } catch (error) {
        console.error("Ошибка загрузки авто:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCar();
  }, [carId]);
  
  // Расчёт цены за день при изменении итоговой аренды
  const handleRentalChange = (value: string) => {
    setTotalRental(value);
  };
  
  const pricePerDay = useMemo(() => {
    if (!totalRental || days === 0) return 0;
    const rental = parseInt(totalRental) || 0;
    return Math.round(rental / days);
  }, [totalRental, days]);
  
  const grandTotal = useMemo(() => {
    const rental = parseInt(totalRental) || 0;
    const delivery = parseInt(totalDelivery) || 0;
    return rental + delivery;
  }, [totalRental, totalDelivery]);
  
  // Копировать ссылку
  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Ссылка скопирована!");
  };
  
  // Подтвердить (создать предбронь)
  const handleConfirm = async () => {
    setSubmitting(true);
    
    // Имитация создания предброни
    const offerData = {
      car_id: carId,
      car_name: car?.name,
      start_date: startDateStr,
      end_date: endDateStr,
      days,
      price_per_day: pricePerDay,
      total_rental: parseInt(totalRental) || 0,
      total_delivery: parseInt(totalDelivery) || 0,
      deposit: parseInt(deposit) || 0,
      grand_total: grandTotal,
      created_at: new Date().toISOString(),
    };
    
    console.log("Создаём предбронь:", offerData);
    
    // Пока просто показываем уведомление
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Предбронь создана!");
    navigate(-1); // Возврат назад
    setSubmitting(false);
  };
  
  // Форматирование цены
  const formatPrice = (price: number) => {
    return price.toLocaleString() + " ฿";
  };
  
  // Получение URL изображения
  const getImageUrl = (path: string) => {
    if (!path) return "/placeholder.svg";
    if (path.startsWith("http")) return path;
    return `${API_URL}/images_web/${path}`;
  };
  
  // Все фото для галереи
  const allPhotos = useMemo(() => {
    if (!car?.photos) return [];
    const photos = [];
    if (car.photos.main) photos.push(car.photos.main);
    if (car.photos.gallery) {
      car.photos.gallery.forEach((p: string) => {
        if (p !== car.photos.main) photos.push(p);
      });
    }
    return photos;
  }, [car]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!car) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Авто не найдено</p>
        <Button onClick={() => navigate(-1)}>Назад</Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Фото галерея */}
      <div className="relative">
        <div className="overflow-hidden h-64" ref={emblaRef}>
          <div className="flex">
            {allPhotos.length > 0 ? (
              allPhotos.map((photo: string, index: number) => (
                <div key={index} className="flex-[0_0_100%] min-w-0">
                  <img
                    src={getImageUrl(photo)}
                    alt={`${car.name} ${index + 1}`}
                    className="w-full h-64 object-cover"
                  />
                </div>
              ))
            ) : (
              <div className="flex-[0_0_100%] h-64 bg-gray-300 flex items-center justify-center">
                <span className="text-gray-500">Нет фото</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Навигация галереи */}
        {allPhotos.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
              onClick={() => emblaApi?.scrollPrev()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
              onClick={() => emblaApi?.scrollNext()}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            {/* Индикаторы */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
              {allPhotos.map((_: any, index: number) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === 0 ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 left-4 rounded-full"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Badge className="absolute top-4 right-4">
          {car.class === "compact" ? "Компакт" : 
           car.class === "sedan" ? "Седан" : 
           car.class === "suv" ? "Кроссовер" : car.class}
        </Badge>
      </div>
      
      {/* Информация об авто */}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{car.brand} {car.model}</h1>
          <p className="text-gray-500">{car.year} • {car.color}</p>
        </div>
        
        {/* Характеристики */}
        <Card>
          <CardContent className="p-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Двигатель:</span>
              <span className="font-medium">{car.specs?.engine || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Мощность:</span>
              <span className="font-medium">{car.specs?.power || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Топливо:</span>
              <span className="font-medium">{car.specs?.fuel || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">КПП:</span>
              <span className="font-medium">{car.specs?.transmission || "—"}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Даты */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Период аренды</span>
            </div>
            <div className="flex justify-between text-center">
              <div>
                <p className="text-xs text-gray-500">Получение</p>
                <p className="font-bold">
                  {startDate ? format(startDate, "dd MMM yyyy", { locale: ru }) : "—"}
                </p>
              </div>
              <div className="text-gray-400">→</div>
              <div>
                <p className="text-xs text-gray-500">Возврат</p>
                <p className="font-bold">
                  {endDate ? format(endDate, "dd MMM yyyy", { locale: ru }) : "—"}
                </p>
              </div>
              <div className="bg-blue-100 px-3 py-1 rounded-full">
                <span className="text-sm font-bold text-blue-700">{days} дн.</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Стоимость */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <span className="font-semibold">Стоимость</span>
            </div>
            
            {/* Цена за день */}
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Цена за день ({days} дн.)</span>
              <span className="font-bold">{formatPrice(pricePerDay)}</span>
            </div>
            
            {/* Итоговая аренда */}
            <div className="space-y-1">
              <Label>Итоговая аренда</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={totalRental}
                  onChange={(e) => handleRentalChange(e.target.value)}
                  className="pr-16"
                  readOnly={!isAdmin}
                  disabled={!isAdmin}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">฿</span>
              </div>
            </div>
            
            {/* Доставка */}
            <div className="space-y-1">
              <Label>Доставка</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={totalDelivery === "0" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTotalDelivery("0")}
                  disabled={!isAdmin}
                >
                  Аэропорт (0 ฿)
                </Button>
                <Button
                  variant={totalDelivery === "500" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTotalDelivery("500")}
                  disabled={!isAdmin}
                >
                  Город (500 ฿)
                </Button>
              </div>
              <Input
                type="number"
                value={totalDelivery}
                onChange={(e) => setTotalDelivery(e.target.value)}
                className="mt-2"
                placeholder="Или своё значение"
                readOnly={!isAdmin}
                disabled={!isAdmin}
              />
            </div>
            
            {/* Депозит */}
            <div className="space-y-1">
              <Label>Депозит</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="pr-16"
                  readOnly={!isAdmin}
                  disabled={!isAdmin}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">฿</span>
              </div>
            </div>
            
            {/* Итого */}
            <div className="bg-green-50 rounded-lg p-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800">Итого к оплате</span>
                <span className="text-2xl font-bold text-green-700">
                  {formatPrice(grandTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Кнопки */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyLink} className="flex-1">
            <Copy className="h-4 w-4 mr-2" />
            Копировать
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Создание...
              </span>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Подтвердить
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}