import { motion } from 'framer-motion';
import { Car, Shield, Clock, CreditCard, Sparkles } from 'lucide-react';

const CarTeaserPlaceholder = () => {
  const features = [
    { icon: Shield, title: 'Страховка включена', desc: 'Полное покрытие без доплат' },
    { icon: Clock, title: 'Поддержка 24/7', desc: 'Всегда на связи' },
    { icon: CreditCard, title: 'Без предоплаты', desc: 'Оплата при получении' },
    { icon: Sparkles, title: 'Чистые авто', desc: 'Полная мойка перед выдачей' },
  ];

  return (
    <div className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
          <Car className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Выберите параметры аренды
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Укажите даты, место доставки и категорию транспорта — мы покажем доступные варианты с актуальными ценами
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <feature.icon className="w-8 h-8 text-primary mx-auto mb-2" />
            <h4 className="font-semibold text-foreground text-sm mb-1">{feature.title}</h4>
            <p className="text-xs text-muted-foreground">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CarTeaserPlaceholder;
