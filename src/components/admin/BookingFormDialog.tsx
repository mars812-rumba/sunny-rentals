import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, parse, eachDayOfInterval } from 'date-fns';
import { Settings2, MapPinned, Trash2, X, Car as CarIcon, Search, Copy,Plus, Contact2, User as UserIcon, Clock, ChevronRight,  Receipt, Check, Filter, Camera } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// API и утилиты
import { PICKUP_LOCATIONS, generateTimeOptions, submitBooking } from '@/api/api';

// --- УТИЛИТЫ СЕЗОННОСТИ ---
const getSeason = (date: Date): 'high_season' | 'low_season' => {
  const month = date.getMonth(); // 0 - Январь, 10 - Ноябрь
  // High Season: Ноябрь (10) - Апрель (3)
  return (month >= 10 || month <= 3) ? 'high_season' : 'low_season';
};

const getPriceTierKey = (days: number): string => {
  if (days >= 30) return 'price_30';
  if (days >= 15) return 'price_15_29';
  if (days >= 7) return 'price_7_14';
  return 'price_1_6';
};

const getPhotoUrl = (filename: string | null | undefined): string => {
  if (!filename) return '';
  if (filename.startsWith('http')) return filename;
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${API_BASE}/images_web/${filename}`;
};

interface BookingFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number | string;
  userName?: string;
  userContact?: string;
  initialDateRange?: { start: Date; end: Date };
  carId?: string;
  booking?: any;
  onSuccess: () => void;
}

// ... (все импорты остаются прежними)

export function BookingFormDialog({
  isOpen, onClose, userId, userName, userContact, 
  initialDateRange, carId, booking, onSuccess 
}: BookingFormDialogProps) {
  
  const isEditing = !!booking;
  
  // Data State
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [carOwnerMap, setCarOwnerMap] = useState<Record<string, string>>({});
  const [owners, setOwners] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // UI State
  const [selectedTab, setSelectedTab] = useState<'fleet' | 'manual'>('fleet');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  
  // Editable Pricing State
  const [manualRental, setManualRental] = useState<string>('');
  const [manualDelivery, setManualDelivery] = useState<string>('');
  const [manualDeposit, setManualDeposit] = useState<string>('');

  // Form State
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 3));
  const [pickupTime, setPickupTime] = useState('13:00');
  const [returnTime, setReturnTime] = useState('13:00');
  const [pickupLocation, setPickupLocation] = useState('airport');
  const [returnLocation, setReturnLocation] = useState('airport');
  const [pickupAddress, setPickupAddress] = useState('');
  const [returnAddress, setReturnAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [contactType, setContactType] = useState<'telegram' | 'whatsapp' | 'phone'>('telegram');
  const [manualData, setManualData] = useState({ name: '', brand: '', model: '', year: '', dailyRate: '', deposit: '5000' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeOptions = useMemo(() => generateTimeOptions(), []);

  // 1. Загрузка справочников
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const [vRes, oRes, mRes] = await Promise.all([
            fetch('/api/fleet'), fetch('/api/car-owners'), fetch('/api/car-owners-map')
          ]);
          const vData = await vRes.json();
          setVehicles(Object.values(vData.vehicles || {}));
          setOwners((await oRes.json()).owners || []);
          setCarOwnerMap(await mRes.json() || {});
        } catch (e) {
          console.error("Data load error", e);
        } finally { setLoadingData(false); }
      };
      fetchData();
    }
  }, [isOpen]);

  // 2. ИСПРАВЛЕННАЯ ЛОГИКА ИНИЦИАЛИЗАЦИИ
  useEffect(() => {
    if (isOpen) {
      if (booking) {
        const fd = booking.form_data;
        const bCarId = fd.car?.id || '';
        
        // Определяем вкладку на основе ID
        const isManual = bCarId.startsWith('manual_');
        setSelectedTab(isManual ? 'manual' : 'fleet');
        
        if (!isManual) {
          setSelectedVehicleId(bCarId);
        }

        setStartDate(new Date(fd.dates.start));
        setEndDate(new Date(fd.dates.end));
        setCustomerName(fd.contact.name || '');
        setCustomerContact(fd.contact.value || '');
        setContactType(fd.contact.type || 'telegram');
        setPickupLocation(fd.locations?.pickupLocation || 'airport');
        setReturnLocation(fd.locations?.returnLocation || 'airport');
        setPickupAddress(fd.locations?.pickupAddress || '');
        setReturnAddress(fd.locations?.returnAddress || '');
        
        // Initialize manual pricing fields
        setManualRental(fd.pricing?.totalRental?.toString() || '');
        setManualDelivery(fd.pricing?.totalDelivery?.toString() || '');
        setManualDeposit(fd.pricing?.deposit?.toString() || '');
        
        // Всегда заполняем manualData для корректного отображения и редактирования
        setManualData({
          name: fd.car.name || '',
          brand: fd.car.brand || '',
          model: fd.car.model || '',
          year: fd.car.year || '',
          dailyRate: (fd.pricing?.dailyRate || 0).toString(),
          deposit: (fd.pricing?.deposit || 5000).toString()
        });
      } else {
        // Логика для новой брони
        if (carId) { 
          setSelectedVehicleId(carId); 
          setSelectedTab('fleet'); 
        }
        if (initialDateRange) { 
          setStartDate(initialDateRange.start); 
          setEndDate(initialDateRange.end); 
        }
        if (userName) setCustomerName(userName);
        if (userContact) setCustomerContact(userContact);
        
        // Reset manual pricing fields
        setManualRental('');
        setManualDelivery('');
        setManualDeposit('');
      }
    }
  }, [isOpen, booking, carId]);

  // 3. РАСЧЕТ СТОИМОСТИ (С защитой от пустых значений)
  const pricing = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    const diffTime = endDate.getTime() - startDate.getTime();
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    let calcRental = 0;
    let calcDeposit = 5000;
    let avgDailyRate = 0;

    if (selectedTab === 'fleet') {
      const v = vehicles.find(vec => vec.id === selectedVehicleId);
      if (v && v.pricing) {
        calcDeposit = v.pricing.deposit || 5000;
        const tierKey = getPriceTierKey(days);
        
        try {
          const dayInterval = eachDayOfInterval({ start: startDate, end: endDate });
          const activeDays = dayInterval.length > 1 ? dayInterval.slice(0, -1) : dayInterval;

          activeDays.forEach(day => {
            const season = getSeason(day);
            const dailyPrice = v.pricing[season]?.[tierKey] || v.pricing['low_season']?.[tierKey] || 0;
            calcRental += dailyPrice;
          });
          avgDailyRate = Math.round(calcRental / days);
        } catch (e) {
          calcRental = 0;
        }
      }
    } else {
      avgDailyRate = parseInt(manualData.dailyRate) || 0;
      calcRental = avgDailyRate * days;
      calcDeposit = parseInt(manualData.deposit) || 5000;
    }

    const baseDelivery = (pickupLocation === 'airport' ? 0 : 500) + (returnLocation === 'airport' ? 0 : 500);

    const finalRental = manualRental !== '' ? parseInt(manualRental) : calcRental;
    const finalDelivery = manualDelivery !== '' ? parseInt(manualDelivery) : baseDelivery;
    const finalDeposit = manualDeposit !== '' ? parseInt(manualDeposit) : calcDeposit;

    return {
      days, 
      dailyRate: avgDailyRate, 
      deposit: finalDeposit, 
      totalRental: finalRental,
      totalDelivery: finalDelivery,
      grandTotal: (finalRental || 0) + finalDelivery
    };
  }, [startDate, endDate, selectedVehicleId, selectedTab, manualData, pickupLocation, returnLocation, vehicles, manualRental, manualDelivery, manualDeposit]);
  
const currentCarName = useMemo(() => {
  if (selectedTab === 'fleet') {
    const v = vehicles.find(vec => vec.id === selectedVehicleId);
    return v ? v.name : 'Авто не выбрано';
  }
  return manualData.name || 'Введено вручную';
}, [selectedTab, selectedVehicleId, vehicles, manualData.name]);
  const copyToClipboard = () => {
    if (!pricing) return;
    const vehicle = selectedTab === 'fleet' ? vehicles.find(v => v.id === selectedVehicleId) : null;
    const carName = vehicle ? vehicle.name : manualData.name;
    const text = `
🚗 *Бронирование авто:* ${carName}
📅 *Даты:* ${format(startDate!, 'dd.MM')} - ${format(endDate!, 'dd.MM')} (${pricing.days} дн.)
💰 *Аренда:* ${pricing.totalRental} ฿
🚚 *Доставка:* ${pricing.totalDelivery} ฿
💵 *Депозит:* ${pricing.deposit} ฿
__________________
✅ *ИТОГО:* ${pricing.grandTotal} ฿
    `.trim();
    navigator.clipboard.writeText(text);
    toast.success("Данные скопированы для клиента");
  };

  const handleSubmit = async () => {
    if (!pricing || pricing.dailyRate === 0) {
      toast.error("Данные не полны");
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = parse(pickupTime, 'HH:mm', startDate!);
      const endDateTime = parse(returnTime, 'HH:mm', endDate!);
      const v = selectedTab === 'fleet' ? vehicles.find(vec => vec.id === selectedVehicleId) : null;
      const cId = isEditing && booking?.form_data?.car?.id ? booking.form_data.car.id : (selectedTab === 'fleet' ? v?.id : `manual_${Date.now()}`);

      const formDataForApi = {
        car: {
          id: String(cId),
          name: String(selectedTab === 'fleet' ? v?.name : manualData.name),
          brand: String(selectedTab === 'fleet' ? v?.brand : (manualData.brand || "")),
          model: String(selectedTab === 'fleet' ? v?.model : (manualData.model || "")),
          year: String(selectedTab === 'fleet' ? v?.year : (manualData.year || "")),
          color: String(selectedTab === 'fleet' ? (v?.color || "") : "")
        },
        dates: {
          start: startDateTime.toISOString(), end: endDateTime.toISOString(), days: Math.round(pricing.days)
        },
        locations: {
          pickupLocation: String(pickupLocation), returnLocation: String(returnLocation),
          pickupAddress: String(pickupAddress || ""), returnAddress: String(returnAddress || "")
        },
        pricing: {
          dailyRate: Math.round(pricing.dailyRate), totalRental: Math.round(pricing.totalRental),
          deposit: Math.round(pricing.deposit), deliveryPickup: Math.round(pickupLocation === 'airport' ? 0 : 500),
          deliveryReturn: Math.round(returnLocation === 'airport' ? 0 : 500), totalDelivery: Math.round(pricing.totalDelivery),
          grandTotal: Math.round(pricing.grandTotal)
        },
        contact: {
          value: String(customerContact), type: String(contactType), name: String(customerName || ""),
          phone: contactType === 'phone' ? String(customerContact) : ""
        },
        timestamp: new Date().toISOString()
      };

      const bId = booking?.booking_id || booking?.id || null;
      await submitBooking(formDataForApi as any, bId);

      toast.success(isEditing ? "Обновлено" : "Создано");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!booking?.booking_id || !confirm(`Удалить бронь?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.booking_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Ошибка API");
      toast.success("Удалено");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Все' },
    { id: 'compact', label: 'Compact' },
    { id: 'sedan', label: 'Sedan' },
    { id: 'SUV', label: 'SUV' },
    { id: '7s', label: '7 seats' },
    { id: 'bikes', label: 'Bikes' }
  ];

  return (

// ... (импорты и утилиты остаются прежними)
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-[100vw] w-screen h-screen m-0 rounded-none p-0 bg-[#f8fafc] overflow-hidden flex flex-col border-none">
    
    {/* 1. HEADER */}
    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-[#f8b515] p-2 rounded-xl text-white shadow-lg shadow-orange-100">
          <CarIcon size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 leading-none">
            {isEditing ? 'Правка бронирования' : 'Новое бронирование'}
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Phuket Management Terminal</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
        <X size={20} />
      </Button>
    </div>

    {/* 2. ОСНОВНОЙ КОНТЕНТ (СКРОЛЛ-ЗОНА) */}
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* GRID START */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* --- ЛЕВАЯ КОЛОНКА: ТРАНСПОРТ --- */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 size={18} className="text-[#f8b515]" />
              <h3 className="font-black uppercase text-xs text-slate-700 tracking-wider">Выбор транспорта</h3>
            </div>

            <Tabs value={selectedTab} onValueChange={(v: any) => setSelectedTab(v)} className="w-full">
              <TabsList className="bg-slate-100 p-1 rounded-xl w-full mb-4">
                <TabsTrigger value="fleet" className="flex-1 font-black uppercase text-[10px] rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#f8b515] data-[state=active]:shadow-sm">Автопарк</TabsTrigger>
                <TabsTrigger value="manual" className="flex-1 font-black uppercase text-[10px] rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#f8b515] data-[state=active]:shadow-sm">Вручную</TabsTrigger>
              </TabsList>

              <TabsContent value="fleet" className="space-y-4 mt-0">
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border",
                        categoryFilter === cat.id ? "bg-[#f8b515] border-[#f8b515] text-white shadow-md" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                    <Input placeholder="ПОИСК..." className="pl-9 font-bold uppercase text-[10px] h-10 rounded-xl bg-slate-50 border-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger className="h-10 text-[10px] font-bold rounded-xl bg-slate-50 border-none"><SelectValue placeholder="ВЛАДЕЛЕЦ" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="text-[10px] font-bold">ВСЕ</SelectItem>
                      {owners.map(o => <SelectItem key={o.id} value={o.id} className="text-[10px] font-bold">{o.name.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {vehicles.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) && (categoryFilter === 'all' || v.class === categoryFilter)).map(v => (
                    <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={cn("p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 bg-white", selectedVehicleId === v.id ? "border-[#f8b515] bg-orange-50/20 shadow-sm" : "border-slate-50 hover:border-slate-100")}>
                      <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                        <div className="w-full h-full" style={{ backgroundImage: `url(${getPhotoUrl(v.photos?.main)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[11px] uppercase text-slate-700 truncate leading-none mb-1">{v.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Owner: {carOwnerMap[v.id] || 'Sunny'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900 leading-none">{v.pricing?.low_season?.price_1_6 || 0}฿</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-3 mt-0">
                <Input placeholder="МАРКА И МОДЕЛЬ" className="font-bold h-12 rounded-xl bg-slate-50 border-none" value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="ЦЕНА" className="font-bold h-12 rounded-xl bg-slate-50 border-none" value={manualData.dailyRate} onChange={e => setManualData({...manualData, dailyRate: e.target.value})} />
                  <Input placeholder="ЗАЛОГ" className="font-bold h-12 rounded-xl bg-slate-50 border-none" value={manualData.deposit} onChange={e => setManualData({...manualData, deposit: e.target.value})} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* --- ПРАВАЯ КОЛОНКА: ЛОГИСТИКА, КЛИЕНТ И ЧЕК --- */}
          <div className="space-y-6">
            
            {/* БЛОК ЛОГИСТИКИ */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPinned size={18} className="text-blue-500" />
                <h3 className="font-black uppercase text-xs text-slate-700 tracking-wider">Логистика</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Старт</label>
                  <Popover>
                    <PopoverTrigger asChild><Button variant="outline" className="w-full text-[11px] font-black h-10 rounded-xl bg-slate-50 border-none shadow-sm">{startDate ? format(startDate, 'dd.MM.yyyy') : '---'}</Button></PopoverTrigger>
                    <PopoverContent className="p-0 border-none shadow-2xl rounded-2xl"><CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
                  </Popover>
                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger className="h-10 text-[11px] font-black rounded-xl bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                    <SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t} className="font-bold text-[11px]">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Конец</label>
                  <Popover>
                    <PopoverTrigger asChild><Button variant="outline" className="w-full text-[11px] font-black h-10 rounded-xl bg-slate-50 border-none shadow-sm">{endDate ? format(endDate, 'dd.MM.yyyy') : '---'}</Button></PopoverTrigger>
                    <PopoverContent className="p-0 border-none shadow-2xl rounded-2xl"><CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
                  </Popover>
                  <Select value={returnTime} onValueChange={setReturnTime}>
                    <SelectTrigger className="h-10 text-[11px] font-black rounded-xl bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                    <SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t} className="font-bold text-[11px]">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="space-y-2">
                    <Select value={pickupLocation} onValueChange={setPickupLocation}>
                      <SelectTrigger className="font-black uppercase text-[9px] h-9 rounded-lg bg-white border-none shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{PICKUP_LOCATIONS.map(l => <SelectItem key={l.id} value={l.id} className="text-[9px] font-black uppercase">{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="АДРЕС ВЫДАЧИ" className="text-[10px] font-bold h-9 rounded-lg bg-white border-none shadow-sm px-3" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <Select value={returnLocation} onValueChange={setReturnLocation}>
                      <SelectTrigger className="font-black uppercase text-[9px] h-9 rounded-lg bg-white border-none shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{PICKUP_LOCATIONS.map(l => <SelectItem key={l.id} value={l.id} className="text-[9px] font-black uppercase">{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="АДРЕС ВОЗВРАТА" className="text-[10px] font-bold h-9 rounded-lg bg-white border-none shadow-sm px-3" value={returnAddress} onChange={e => setReturnAddress(e.target.value)} />
                 </div>
              </div>
            </div>

            {/* БЛОК КЛИЕНТА */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Contact2 size={18} className="text-green-500" />
                <h3 className="font-black uppercase text-xs text-slate-700 tracking-wider">Клиент</h3>
              </div>
              <div className="space-y-3">
                <Input placeholder="ФИО КЛИЕНТА" className="font-black uppercase text-[11px] h-11 px-4 rounded-xl bg-slate-50 border-none" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <div className="flex gap-2">
                  <Select value={contactType} onValueChange={(v: any) => setContactType(v)}>
                    <SelectTrigger className="w-[100px] font-black text-[10px] h-11 rounded-xl bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="telegram">TG</SelectItem><SelectItem value="whatsapp">WA</SelectItem><SelectItem value="phone">PH</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="КОНТАКТ" className="flex-1 font-bold text-[11px] h-11 rounded-xl bg-slate-50 border-none" value={customerContact} onChange={e => setCustomerContact(e.target.value)} />
                </div>
              </div>
            </div>

            {/* РАСЧЕТ СТОИМОСТИ (Light Violet Glass Style) */}
            <div className="p-6 bg-violet-100/40 backdrop-blur-md rounded-[32px] border border-violet-200/50 relative overflow-hidden shadow-sm">
              <div className="absolute top-4 right-4">
                <Button variant="ghost" size="icon" onClick={copyToClipboard} className="text-violet-400 hover:text-violet-600 hover:bg-violet-200/50 rounded-full h-8 w-8">
                  <Copy size={16} />
                </Button>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center text-white shadow-md shadow-violet-200">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-violet-400 leading-none mb-1">Детализация чека</h3>
                  <p className="text-[11px] font-bold text-violet-600 uppercase tracking-tight">{pricing?.days} ДНЕЙ АРЕНДЫ</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Авто */}
                <div className="flex items-end gap-2 group">
                  <span className="text-[10px] font-black uppercase text-violet-400/80 whitespace-nowrap">Авто</span>
                  <div className="flex-1 border-b border-dotted border-violet-300 mb-1 opacity-50" />
                  <span className="text-xs font-black text-violet-900 uppercase truncate max-w-[180px]">
                    {selectedTab === 'fleet' ? vehicles.find(v => v.id === selectedVehicleId)?.name : manualData.name || '---'}
                  </span>
                </div>
                {/* Аренда */}
                <div className="flex items-end gap-2">
                  <span className="text-[10px] font-black uppercase text-violet-400/80 whitespace-nowrap">Аренда</span>
                  <div className="flex-1 border-b border-dotted border-violet-300 mb-1 opacity-50" />
                  <div className="flex items-center text-violet-900">
                    <input className="bg-transparent text-right font-black text-xs w-20 outline-none focus:text-violet-600" value={pricing?.totalRental} onChange={(e) => setManualRental(e.target.value)} />
                    <span className="text-[10px] font-bold ml-1">฿</span>
                  </div>
                </div>
                {/* Доставка */}
                <div className="flex items-end gap-2">
                  <span className="text-[10px] font-black uppercase text-violet-400/80 whitespace-nowrap">Доставка</span>
                  <div className="flex-1 border-b border-dotted border-violet-300 mb-1 opacity-50" />
                  <div className="flex items-center text-violet-900">
                    <input className="bg-transparent text-right font-black text-xs w-20 outline-none focus:text-violet-600" value={pricing?.totalDelivery} onChange={(e) => setManualDelivery(e.target.value)} />
                    <span className="text-[10px] font-bold ml-1">฿</span>
                  </div>
                </div>
                {/* Депозит */}
                <div className="flex items-end gap-2">
                  <span className="text-[10px] font-black uppercase text-violet-400/80 whitespace-nowrap">Депозит</span>
                  <div className="flex-1 border-b border-dotted border-violet-300 mb-1 opacity-50" />
                  <div className="flex items-center text-green-600">
                    <input className="bg-transparent text-right font-black text-xs w-20 outline-none focus:text-green-700" value={pricing?.deposit} onChange={(e) => setManualDeposit(e.target.value)} />
                    <span className="text-[10px] font-bold ml-1">฿</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-violet-200/60 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-violet-500 uppercase mb-1">Итого к оплате</p>
                    <p className="text-4xl font-black tracking-tighter text-violet-950">
                      {pricing?.grandTotal.toLocaleString()} <span className="text-xl font-black text-violet-400">฿</span>
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-600 border-none font-black text-[9px] mb-2 px-2 py-0.5">READY</Badge>
                </div>
              </div>
            </div>

          </div> {/* CLOSE RIGHT COLUMN */}
        </div> {/* CLOSE GRID */}

        {/* 3. КНОПКИ ДЕЙСТВИЯ (ВНЕ СЕТКИ) */}
        <div className="mt-8 flex gap-3 max-w-4xl mx-auto w-full">
          {isEditing && (
            <Button variant="outline" size="lg" className="h-14 px-6 border border-red-100 text-red-500 hover:bg-red-50 rounded-2xl" disabled={isDeleting} onClick={handleDelete}>
              <Trash2 size={20} />
            </Button>
          )}
          <Button 
            className="flex-1 h-14 bg-[#f8b515] hover:bg-orange-500 text-white text-base font-black rounded-2xl shadow-lg shadow-orange-100 transition-all active:scale-[0.98]" 
            disabled={isSubmitting} 
            onClick={handleSubmit}
          >
            {isSubmitting ? '...' : isEditing ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'СОЗДАТЬ БРОНИРОВАНИЕ'}
          </Button>
        </div>
        
        <div className="h-6" />
      </div> {/* CLOSE MAX-WIDTH-CONTAINER */}
    </div> {/* CLOSE FLEX-1 (MAIN SCROLL) */}
  </DialogContent>
</Dialog>
  );
}
