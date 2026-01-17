import { Car, Smartphone, Key, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

const steps = [
  {
    number: 1,
    title: "Выбираете автомобиль",
    description: "В Telegram боте или на сайте. Фильтруете по датам, месту получения и классу авто.",
    icon: Car,
  },
  {
    number: 2,
    title: "Бронируете в 2 клика",
    description: "Указываете паспорт и водительские права. Без предоплаты и лишних документов.",
    icon: Smartphone,
  },
  {
    number: 3,
    title: "Получаете ключи",
    description: "Бесплатная доставка в аэропорт.",
    icon: Key,
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container mx-auto px-4">
        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-center mb-12"
        >
          Как это работает
        </motion.h2>
        
        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.number}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="flex flex-col md:flex-row items-center gap-8 mb-12"
              >
                <div className="flex-shrink-0 w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {step.number}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-lg">
                    {step.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <step.icon className="w-24 h-24 text-primary" />
                </div>
              </motion.div>
              
              {index < steps.length - 1 && (
                <div className="flex justify-center mb-12">
                  <ArrowDown className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
     <br>
     </br>   
 <motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.7, type: "spring", stiffness: 90 }}
  className="text-center mt-16"
>
  <a
    href="#fleet"
    className="group inline-flex items-center gap-4 px-12 py-7 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-3xl md:text-4xl font-black uppercase tracking-wider rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
  >
    <span className="relative">
      ВЫБРАТЬ ТРАНСПОРТ
      <span className="absolute -bottom-1 left-0 w-full h-1 bg-white/40 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
    </span>
    
  </a>
</motion.div>
      </div>
    </section>
  );
};
