import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Car, Users, Calendar, DollarSign, TrendingUp, 
  TrendingDown, Clock, CheckCircle2, AlertCircle 
} from "lucide-react";

// Random metrics generator
const generateMetrics = () => ({
  totalCars: Math.floor(Math.random() * 30) + 10,
  activeRentals: Math.floor(Math.random() * 20) + 5,
  pendingBookings: Math.floor(Math.random() * 8) + 1,
  monthlyRevenue: Math.floor(Math.random() * 150000) + 50000,
  availableCars: Math.floor(Math.random() * 15) + 5,
  completedToday: Math.floor(Math.random() * 5) + 1,
  conversionRate: (Math.random() * 30 + 60).toFixed(1),
  avgRentalDays: (Math.random() * 3 + 2).toFixed(1),
});

const recentBookings = [
  { id: "BK-001", client: "Иван Петров", car: "Toyota Yaris 2024", dates: "15-18 апр", status: "confirmed", amount: 3600 },
  { id: "BK-002", client: "Мария Сидорова", car: "Honda Civic 2023", dates: "16-20 апр", status: "pending", amount: 6000 },
  { id: "BK-003", client: "Александр Ким", car: "Mazda CX-5 2024", dates: "14-16 апр", status: "completed", amount: 2400 },
  { id: "BK-004", client: "Елена Чан", car: "Toyota Fortuner 2024", dates: "17-22 апр", status: "confirmed", amount: 12000 },
  { id: "BK-005", client: "Дмитрий Ли", car: "Honda HR-V 2023", dates: "15-15 апр", status: "cancelled", amount: 1200 },
];

const topCars = [
  { name: "Toyota Yaris 2024", bookings: 24, revenue: 86400 },
  { name: "Honda Civic 2023", bookings: 18, revenue: 72000 },
  { name: "Mazda CX-5 2024", bookings: 15, revenue: 90000 },
  { name: "Toyota Fortuner 2024", bookings: 12, revenue: 144000 },
  { name: "Honda HR-V 2023", bookings: 10, revenue: 40000 },
];

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  pending: "bg-amber-500/10 text-amber-600 border-amber-200",
  completed: "bg-blue-500/10 text-blue-600 border-blue-200",
  cancelled: "bg-red-500/10 text-red-600 border-red-200",
};

export default function DashboardPage() {
  const [metrics] = useState(generateMetrics);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { 
      style: 'currency', 
      currency: 'THB',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <>
      <Helmet>
        <title>Dashboard | AR Park Admin</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">AR Park Dashboard</h1>
                <p className="text-slate-400 text-sm mt-0.5">Аналитика и статистика аренды</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                  ● Online
                </span>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p className="text-slate-400 text-xs">{new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Metrics Grid */}
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <MetricCard 
              icon={<Car className="w-5 h-5" />}
              label="Всего авто"
              value={metrics.totalCars}
              subtext="в парке"
              trend={+2}
              delay={0}
            />
            <MetricCard 
              icon={<CheckCircle2 className="w-5 h-5" />}
              label="Активные аренды"
              value={metrics.activeRentals}
              subtext="сейчас"
              trend={+5}
              delay={100}
            />
            <MetricCard 
              icon={<Clock className="w-5 h-5" />}
              label="Ожидают"
              value={metrics.pendingBookings}
              subtext="заявок"
              trend={-2}
              delay={200}
            />
            <MetricCard 
              icon={<DollarSign className="w-5 h-5" />}
              label="Доход за месяц"
              value={metrics.monthlyRevenue}
              subtext="THB"
              isCurrency
              trend={+12}
              delay={300}
            />
          </div>

          {/* Secondary Metrics */}
          <div className={`grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <SecondaryMetric label="Доступно" value={metrics.availableCars} icon={<Car className="w-4 h-4" />} color="text-emerald-400" />
            <SecondaryMetric label="Сегодня" value={metrics.completedToday} icon={<CheckCircle2 className="w-4 h-4" />} color="text-blue-400" />
            <SecondaryMetric label="Конверсия" value={`${metrics.conversionRate}%`} icon={<TrendingUp className="w-4 h-4" />} color="text-purple-400" />
            <SecondaryMetric label="Ср. дней" value={metrics.avgRentalDays} icon={<Calendar className="w-4 h-4" />} color="text-amber-400" />
            <SecondaryMetric label="Депозит" value={5000} icon={<DollarSign className="w-4 h-4" />} color="text-cyan-400" suffix="฿" />
            <SecondaryMetric label="Броней" value={89} icon={<Calendar className="w-4 h-4" />} color="text-pink-400" />
          </div>

          {/* Tables Section */}
          <div className={`grid lg:grid-cols-2 gap-6 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Recent Bookings */}
            <Card className="bg-slate-800/50 backdrop-blur border-slate-700/50">
              <CardHeader className="border-b border-slate-700/50 pb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Последние бронирования
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-700/50">
                  {recentBookings.map((booking, i) => (
                    <div 
                      key={booking.id} 
                      className="px-6 py-4 hover:bg-slate-700/30 transition-colors"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-xs font-mono">{booking.id}</span>
                          <span className="text-white font-medium">{booking.client}</span>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[booking.status]}`}>
                          {booking.status === 'confirmed' ? 'Подтверждено' : 
                           booking.status === 'pending' ? 'Ожидает' :
                           booking.status === 'completed' ? 'Завершено' : 'Отменено'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{booking.car}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-500">{booking.dates}</span>
                          <span className="text-emerald-400 font-medium">{formatCurrency(booking.amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Cars */}
            <Card className="bg-slate-800/50 backdrop-blur border-slate-700/50">
              <CardHeader className="border-b border-slate-700/50 pb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Популярные авто
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {topCars.map((car, i) => (
                    <div key={car.name} className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-300 text-sm font-medium">{car.name}</span>
                        <span className="text-emerald-400 text-sm font-medium">{formatCurrency(car.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${(car.bookings / topCars[0].bookings) * 100}%`,
                              animationDelay: `${i * 100}ms`
                            }}
                          />
                        </div>
                        <span className="text-slate-500 text-xs w-12 text-right">{car.bookings} броней</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className={`mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-700 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <QuickAction icon={<Car className="w-6 h-6" />} label="Добавить авто" color="from-blue-500 to-blue-600" />
            <QuickAction icon={<Calendar className="w-6 h-6" />} label="Новое бронирование" color="from-emerald-500 to-emerald-600" />
            <QuickAction icon={<Users className="w-6 h-6" />} label="Все клиенты" color="from-purple-500 to-purple-600" />
            <QuickAction icon={<AlertCircle className="w-6 h-6" />} label="Проблемы" color="from-amber-500 to-amber-600" />
          </div>
        </main>
      </div>
    </>
  );
}

function MetricCard({ icon, label, value, subtext, trend, delay, isCurrency }: any) {
  const isPositive = trend > 0;
  
  return (
    <Card className="bg-slate-800/50 backdrop-blur border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/50" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-slate-700/50 rounded-xl text-slate-300">
            {icon}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-slate-400 text-xs mb-1">{label}</p>
        <p className="text-white text-2xl font-bold tracking-tight">
          {isCurrency ? formatCurrency(value) : value}
        </p>
        <p className="text-slate-500 text-xs mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function SecondaryMetric({ label, value, icon, color, suffix = '' }: any) {
  return (
    <div className="bg-slate-800/30 backdrop-blur border border-slate-700/30 rounded-xl p-3 text-center">
      <div className={`mb-1.5 ${color}`}>{icon}</div>
      <p className="text-white font-bold text-lg">{value}{suffix}</p>
      <p className="text-slate-500 text-xs">{label}</p>
    </div>
  );
}

function QuickAction({ icon, label, color }: any) {
  return (
    <button className={`bg-gradient-to-r ${color} p-4 rounded-xl text-white font-medium flex flex-col items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-xl`}>
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}
