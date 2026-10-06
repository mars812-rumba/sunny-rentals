import type { Locale } from "@/lib/i18n";
import { rentalPolicy, policyCopy } from "@/content/rental-policy";

// Editorial A answers come from the October content audit.
// B statements retain only owner-confirmed published terms (see rental-policy).
const answers = {
  "H1": {
    "status": "A",
    "ru": {
      "question": "Как узнать полную стоимость аренды на мои даты?",
      "answer": "Выберите транспорт, даты и время получения и возврата. Сравнивайте стоимость за весь период, а не только минимальную ставку за сутки. Депозит показывается отдельно; к аренде могут добавляться доставка и согласованные услуги. Перед подтверждением проверьте все суммы в заявке."
    },
    "en": {
      "question": "How do I find the full rental cost for my dates?",
      "answer": "Choose a vehicle and the pick-up and return dates and times. Compare the total for the whole period, not just the lowest daily rate. The deposit is separate; delivery and agreed extras may add to the rental. Check every amount in the request before confirmation."
    }
  },
  "H2": {
    "status": "B",
    "ru": {
      "question": "Я получу именно машину с фотографий?",
      "answer": "В каталоге Sunny Rentals показаны конкретные автомобили и скутеры. Выбранный вариант сохраняется при переходе к оформлению, а доступность на ваши даты подтверждает менеджер. Просмотр карточки или переход в Telegram ещё не закрепляет транспорт за вами."
    },
    "en": {
      "question": "Will I receive the vehicle shown in the photos?",
      "answer": "Sunny Rentals lists specific cars and scooters. Your selection is kept when you continue to booking, and a manager confirms availability for your dates. Viewing a card or opening Telegram does not reserve the vehicle."
    }
  },
  "H3": {
    "status": "A",
    "ru": {
      "question": "Депозит и страховая франшиза — одна сумма?",
      "answer": "Нет. Депозит — обеспечение по договору аренды, а франшиза — часть расходов при покрываемом страховом случае. Они могут различаться. Размер депозита не означает, что любая ответственность автоматически ограничена этой суммой. Смотрите оба значения в условиях выбранного автомобиля."
    },
    "en": {
      "question": "Are the deposit and insurance excess the same amount?",
      "answer": "No. The deposit is security under the rental agreement; the excess is your contribution to costs for a covered insurance claim. They can differ. A deposit does not automatically limit all liability to that amount. Check both values for the selected vehicle."
    }
  },
  "H4": {
    "status": "B",
    "ru": {
      "question": "Можно получить автомобиль в аэропорту или у отеля?",
      "answer": "Да. Доставка в аэропорт Пхукета бесплатна, а к отелю или вилле по городу — {cityPrice} бат в одну сторону. Получение и возврат в городе оплачиваются отдельно. Выберите обе точки; время встречи и итоговую стоимость согласуйте до подтверждения аренды."
    },
    "en": {
      "question": "Can I collect the car at the airport or my hotel?",
      "answer": "Delivery at Phuket Airport is {airportPrice} THB; city delivery to a hotel or villa is {cityPrice} THB each way. City collection and return are charged separately. Select both locations and agree the meeting time and total charges before confirming."
    }
  },
  "H5": {
    "status": "B",
    "ru": {
      "question": "Можно заказать автомобиль с детским креслом?",
      "answer": "Да, кресло предоставляется бесплатно по запросу. Сообщите возраст, рост и вес ребёнка заранее: нужно подтвердить подходящий тип кресла и его наличие вместе с автомобилем. Бесплатное кресло не означает, что любой тип всегда доступен."
    },
    "en": {
      "question": "Can I request a car with a child seat?",
      "answer": "A child seat is free on request. Share the child's age, height and weight in advance so the seat type and availability can be confirmed with the car. A free seat does not mean every type is always available."
    }
  },
  "H6": {
    "status": "A",
    "ru": {
      "question": "Что выбрать для поездки: машину или скутер?",
      "answer": "Сравните количество пассажиров, багаж, маршруты и водительский опыт. Автомобиль удобнее для поездок с чемоданами и детским креслом. Скутер требует навыка управления мотоциклом и документов нужной категории. Условия страхования автомобиля нельзя переносить на байк — они описаны отдельно."
    },
    "en": {
      "question": "Should I choose a car or a scooter?",
      "answer": "Compare passengers, luggage, routes and driving experience. A car is more practical for suitcases and child seats. A scooter requires motorcycle riding skills and the appropriate licence. Car insurance terms cannot be applied to a scooter; check them separately."
    }
  },
  "T1": {
    "status": "A",
    "ru": {
      "question": "Когда автомобиль считается забронированным?",
      "answer": "Выбор машины на сайте и открытие Telegram — этапы оформления заявки. Доступность и детали аренды подтверждает менеджер. До оплаты получите подтверждение конкретного транспорта, дат, мест передачи и финансовых условий; порядок предоплаты определяется условиями бронирования."
    },
    "en": {
      "question": "When is the vehicle considered booked?",
      "answer": "Choosing a vehicle and opening Telegram are steps in submitting a request. A manager confirms availability and rental details. Before paying, obtain confirmation of the vehicle, dates, handover points and financial terms. Any advance payment follows the booking terms."
    }
  },
  "T2": {
    "status": "A",
    "ru": {
      "question": "Что проверить при получении автомобиля?",
      "answer": "Сверьте выбранную машину и договор, осмотрите кузов, стёкла, колёса и салон. Зафиксируйте имеющиеся повреждения, уровень топлива и комплектность на фото или видео и в акте передачи. Проверьте согласованное оборудование и сохраните контакт для связи во время аренды."
    },
    "en": {
      "question": "What should I check when collecting a car?",
      "answer": "Match the vehicle and agreement, then inspect bodywork, glass, wheels and interior. Record existing damage, fuel level and equipment in photos or video and the handover record. Check agreed extras and save the contact you can use during the rental."
    }
  },
  "T3": {
    "status": "A",
    "ru": {
      "question": "Можно передать управление другому человеку?",
      "answer": "Не считайте это автоматически разрешённым. До поездки проверьте правила дополнительного водителя, его документы и необходимость включения в договор. Разрешение основного арендатора само по себе не подтверждает страховое покрытие второго водителя."
    },
    "en": {
      "question": "Can another person drive the car?",
      "answer": "Do not assume this is permitted. Check additional-driver rules, documents and whether the person must be named in the agreement before the trip. The main renter's permission alone does not establish insurance cover for another driver."
    }
  },
  "D1": {
    "status": "B",
    "ru": {
      "question": "Где узнать размер залога за конкретную машину?",
      "answer": "Депозит указан в карточке выбранного транспорта отдельно от аренды. У разных машин и скутеров суммы различаются, поэтому ориентируйтесь на конкретный вариант, а не только на название модели или класса."
    },
    "en": {
      "question": "Where can I find the deposit for a specific vehicle?",
      "answer": "The deposit is shown on the selected vehicle's card separately from the rental. Amounts vary between cars and scooters, so use the specific option rather than just the model or category."
    }
  },
  "D2": {
    "status": "A",
    "ru": {
      "question": "Депозит включён в цену за сутки?",
      "answer": "Нет. Цена аренды и депозит показываются отдельно. При подготовке бюджета учитывайте стоимость всего периода, согласованные услуги и сумму депозита. Не складывайте их в «цену аренды», если нужно сравнить тарифы разных машин."
    },
    "en": {
      "question": "Is the deposit included in the daily rate?",
      "answer": "No. Rental and deposit are shown separately. Budget for the whole rental period, agreed extras and the deposit. Do not count the deposit as rental price when comparing vehicle rates."
    }
  },
  "D3": {
    "status": "A",
    "ru": {
      "question": "Может ли франшиза быть больше депозита?",
      "answer": "Да, эти суммы выполняют разные функции и могут не совпадать. Например, небольшой депозит не означает такую же максимальную ответственность при повреждении. До подтверждения аренды посмотрите франшизу и исключения из покрытия именно своего автомобиля."
    },
    "en": {
      "question": "Can the insurance excess be higher than the deposit?",
      "answer": "Yes. The amounts serve different purposes and need not match. A small deposit does not mean the same maximum liability for damage. Check the selected car's excess and exclusions before confirmation."
    }
  },
  "I1": {
    "status": "A",
    "ru": {
      "question": "Страховка класса 1 означает, что любой ремонт бесплатный?",
      "answer": "Нет. Название класса само по себе не отвечает на вопрос о ваших расходах. Важны условия конкретного полиса и договора: покрываемые события, франшиза, исключения и порядок оформления. До аренды проверьте отдельно повреждения без второго участника, парковочные царапины и другие ограничения."
    },
    "en": {
      "question": "Does Class 1 insurance mean every repair is free?",
      "answer": "No. The class name alone does not tell you what you must pay. The specific policy and agreement determine covered events, excess, exclusions and reporting procedures. Check damage without another identified party, parking scratches and other limitations separately."
    }
  },
  "I2": {
    "status": "A",
    "ru": {
      "question": "Чем покрытие автомобиля отличается от туристической страховки?",
      "answer": "Это разные договоры. Покрытие арендованного транспорта и расходов при его повреждении не заменяет медицинскую страховку путешественника. Для поездок на скутере отдельно проверьте у своего страховщика требования к категории прав, объёму двигателя и покрытию водителя и пассажира."
    },
    "en": {
      "question": "How is vehicle cover different from travel insurance?",
      "answer": "They are separate agreements. Cover for a rental vehicle and its damage does not replace a traveller's medical insurance. For scooter trips, check your insurer's licence-category, engine-size and driver and passenger coverage requirements."
    }
  },
  "I3": {
    "status": "A",
    "ru": {
      "question": "Можно ли сразу отремонтировать повреждение самостоятельно?",
      "answer": "Сначала сообщите о происшествии по контакту, указанному в договоре, и согласуйте дальнейшие действия. Самостоятельный ремонт до фиксации повреждений может осложнить разбор ситуации. При травмах или непосредственной опасности приоритет — экстренная помощь и указания соответствующих служб."
    },
    "en": {
      "question": "Can I repair damage myself straight away?",
      "answer": "First report the incident using the contact in your agreement and agree the next steps. Repairing damage before it is recorded can complicate the case. If someone is injured or in immediate danger, emergency assistance takes priority."
    }
  },
  "L1": {
    "status": "B",
    "ru": {
      "question": "Сколько стоит доставка автомобиля к отелю или вилле?",
      "answer": "Доставка по городу стоит {cityPrice} бат в одну сторону. Городские получение и возврат оплачиваются отдельно. Перед подтверждением сообщите название объекта и точку на карте, а также место возврата, чтобы согласовать итоговую сумму."
    },
    "en": {
      "question": "How much is delivery to a hotel or villa?",
      "answer": "City delivery costs {cityPrice} THB each way. City collection and return are charged separately. Provide the property name, map pin and return location before confirmation to agree the total charge."
    }
  },
  "L2": {
    "status": "A",
    "ru": {
      "question": "Можно получить машину в одном месте, а вернуть в другом?",
      "answer": "Укажите оба места при оформлении. Разные точки и время передачи нужно согласовать до подтверждения аренды. Если планы изменились, сначала получите подтверждение новой точки и стоимости, а затем меняйте маршрут возврата."
    },
    "en": {
      "question": "Can I collect in one place and return somewhere else?",
      "answer": "Enter both locations when requesting the rental. Agree different meeting points and times before confirmation. If plans change, obtain confirmation of the new point and cost before changing your return route."
    }
  },
  "L3": {
    "status": "A",
    "ru": {
      "question": "Что сообщить для доставки?",
      "answer": "Нужны даты и время, выбранный транспорт, название отеля или виллы и точка на карте. Для аэропорта добавьте номер рейса и терминал, если он известен. Контакт для связи должен работать после прилёта."
    },
    "en": {
      "question": "What details are needed for delivery?",
      "answer": "Provide dates and times, the selected vehicle, property name and a map pin. For the airport, add your flight number and terminal if known. Your contact method should work after arrival."
    }
  },
  "A1": {
    "status": "B",
    "ru": {
      "question": "Есть ли плата за доставку автомобиля в аэропорт Пхукета?",
      "answer": "На сайте Sunny Rentals доставка в аэропорт указана как бесплатная — {airportPrice} бат. Конкретное время и место встречи подтверждаются отдельно. При ночном прилёте заранее проверьте доступность передачи в нужный час."
    },
    "en": {
      "question": "Is there a charge for delivery to Phuket Airport?",
      "answer": "Sunny Rentals publishes airport delivery at {airportPrice} THB. The meeting time and point are confirmed separately. For a night arrival, check whether handover is possible at your requested time in advance."
    }
  },
  "A2": {
    "status": "A",
    "ru": {
      "question": "Где именно встречаться после прилёта?",
      "answer": "Точку встречи согласует менеджер после проверки заявки. Укажите номер рейса и терминал, сохраните подтверждение и контакт до вылета. Не ориентируйтесь на случайную стойку проката: место передачи вашей машины должно быть указано в сообщении о встрече."
    },
    "en": {
      "question": "Where should I meet after landing?",
      "answer": "A manager agrees the meeting point after checking your request. Provide your flight number and terminal, and save the confirmation and contact before departure. Use the meeting point in your confirmation rather than an unrelated rental desk."
    }
  },
  "A3": {
    "status": "A",
    "ru": {
      "question": "Что делать, если рейс задержали или перенесли?",
      "answer": "Сообщите номер рейса и новое время прибытия по контакту бронирования. Получите подтверждение нового времени передачи. Задержка рейса не означает автоматически, что изменились начало аренды, график сотрудника или условия ожидания."
    },
    "en": {
      "question": "What if my flight is delayed or rescheduled?",
      "answer": "Send the flight number and new arrival time to your booking contact. Obtain confirmation of the revised handover time. A delay does not automatically change the rental start, staff schedule or waiting terms."
    }
  },
  "A4": {
    "status": "A",
    "ru": {
      "question": "Как выбрать машину для поездки из аэропорта с чемоданами?",
      "answer": "Считайте одновременно пассажиров, детские кресла, чемоданы и коляску. Семь посадочных мест не гарантируют вместительный багажник при занятом третьем ряде. Для точного выбора нужны фотографии багажника выбранной машины и размеры вашего багажа."
    },
    "en": {
      "question": "How do I choose an airport car for passengers and suitcases?",
      "answer": "Count passengers, child seats, suitcases and a pushchair together. Seven seats do not guarantee a large luggage area with the third row in use. For a precise choice, compare photos of the selected car's boot with your luggage dimensions."
    }
  },
  "S1": {
    "status": "B",
    "ru": {
      "question": "Можно взять машину на один день?",
      "answer": "В тарифах есть диапазон 1–6 дней, но минимальный срок конкретной машины подтверждается отдельно. Укажите нужные даты и время: наличие строки тарифа ещё не гарантирует выдачу любого автомобиля на сутки."
    },
    "en": {
      "question": "Can I rent a car for one day?",
      "answer": "Rates include a 1–6 day tier, but the minimum term is confirmed for the specific vehicle. Provide dates and times; a rate tier alone does not guarantee that every car can be rented for a day."
    }
  },
  "S2": {
    "status": "B",
    "ru": {
      "question": "Ставка за неделю отличается от цены на один день?",
      "answer": "В каталоге предусмотрены диапазоны 1–6, 7–14, 15–29 и 30+ дней. У выбранной машины ставки могут совпадать или различаться. Для сравнения используйте итог за ваши даты с учётом сезона, а не рекламную минимальную ставку."
    },
    "en": {
      "question": "Does a weekly rate differ from a one-day rate?",
      "answer": "The catalogue has 1–6, 7–14, 15–29 and 30+ day tiers. Rates may be the same or different for the selected vehicle. Compare the total for your dates and season rather than the advertised lowest daily rate."
    }
  },
  "S3": {
    "status": "A",
    "ru": {
      "question": "Почему для короткой аренды важно указать время возврата?",
      "answer": "Получение утром и сдача вечером следующего дня могут выходить за одни расчётные сутки. Правило дополнительных часов нужно проверить до брони. Не рассчитывайте, что календарные даты без времени всегда соответствуют одному и тому же количеству оплачиваемых дней."
    },
    "en": {
      "question": "Why does return time matter for a short rental?",
      "answer": "Collecting in the morning and returning the next evening can exceed one rental day. Check additional-hour rules before booking. Calendar dates without times do not always represent the same number of chargeable days."
    }
  },
  "M1": {
    "status": "B",
    "ru": {
      "question": "Месячный тариф — это цена за календарный месяц?",
      "answer": "В опубликованной сетке Sunny Rentals используется диапазон 30+ дней. Стоимость рассчитывается по фактическому периоду и сезону. Для 28, 30 или 31 дня укажите точные даты — не переносите сумму одного примера на другой срок."
    },
    "en": {
      "question": "Is a monthly rate for a calendar month?",
      "answer": "Sunny Rentals uses a 30+ day rate tier. The amount follows the actual rental period and season. Enter exact dates for 28, 30 or 31 days rather than applying one example total to another period."
    }
  },
  "M2": {
    "status": "B",
    "ru": {
      "question": "Что будет с ценой, если аренда захватывает два сезона?",
      "answer": "По опубликованному описанию расчёт учитывает сезонные ставки дней аренды. Поэтому минимальная ставка низкого сезона не обязательно действует на весь период. Проверяйте итог на выбранные даты перед подтверждением."
    },
    "en": {
      "question": "What happens if my rental crosses two seasons?",
      "answer": "The published calculation applies seasonal rates to the rental days. The lowest low-season rate may not apply to the entire period. Check the total for your chosen dates before confirmation."
    }
  },
  "M3": {
    "status": "A",
    "ru": {
      "question": "Можно ли продлить аренду той же машины?",
      "answer": "Продление нужно согласовать до окончания текущего срока: после вас на машину может быть другая заявка. Уточните доступность, новые даты и стоимость. Не считайте ставку первоначальной аренды автоматически действующей на любое продление."
    },
    "en": {
      "question": "Can I extend the same car's rental?",
      "answer": "Agree an extension before the current rental ends; another request may follow yours. Check availability, the new dates and cost. Do not assume the original rate automatically applies to every extension."
    }
  },
  "M4": {
    "status": "A",
    "ru": {
      "question": "Что уточнить перед арендой на несколько месяцев?",
      "answer": "Кроме общей цены и депозита, проверьте график оплаты, пробег, территорию поездок, обслуживание и помощь при поломке. Отдельно согласуйте продление и досрочный возврат. Эти условия должны быть понятны до передачи автомобиля."
    },
    "en": {
      "question": "What should I check for a rental lasting several months?",
      "answer": "Besides the total and deposit, check payment timing, mileage, permitted areas, servicing and breakdown help. Agree extensions and early returns separately. These terms should be clear before handover."
    }
  },
  "C1": {
    "status": "B",
    "ru": {
      "question": "Сколько стоит детское кресло?",
      "answer": "Для автомобилей Sunny Rentals кресло предоставляется бесплатно по запросу. Закажите его заранее вместе с машиной и подтвердите подходящий тип и наличие на ваши даты."
    },
    "en": {
      "question": "How much does a child seat cost?",
      "answer": "A child seat for a Sunny Rentals car is free on request. Request it with the vehicle in advance and confirm the correct type and availability for your dates."
    }
  },
  "C2": {
    "status": "A",
    "ru": {
      "question": "Какие данные нужны, чтобы подобрать кресло?",
      "answer": "Сообщите возраст, рост и вес ребёнка. Кресло выбирают по ограничениям его производителя и совместимости с автомобилем; одного возраста недостаточно. До выдачи подтвердите конкретный тип кресла и способ крепления."
    },
    "en": {
      "question": "What details help select a child seat?",
      "answer": "Provide the child's age, height and weight. Selection depends on the manufacturer's limits and compatibility with the car; age alone is not enough. Confirm the seat type and fitting method before collection."
    }
  },
  "C3": {
    "status": "A",
    "ru": {
      "question": "Можно ли установить два детских кресла?",
      "answer": "Это зависит от выбранного автомобиля, кресел и размещения остальных пассажиров. Нужно проверить крепления и доступное место на конкретных сиденьях. Укажите состав семьи и багаж заранее; количество мест в описании автомобиля само по себе не гарантирует удобную установку двух кресел."
    },
    "en": {
      "question": "Can I fit two child seats?",
      "answer": "This depends on the vehicle, seats and other passengers. The specific seats, attachment points and available space need checking. Share your family and luggage details in advance; the listed seat count does not guarantee a suitable two-seat arrangement."
    }
  },
  "C4": {
    "status": "A",
    "ru": {
      "question": "Как учесть коляску при выборе автомобиля?",
      "answer": "Сообщите размеры коляски в сложенном виде и количество чемоданов. Сравнивайте багажник при том положении сидений, в котором будете ехать. Фотография пустого салона или большой объём со сложенными сиденьями не показывает вместимость с пассажирами."
    },
    "en": {
      "question": "How should I account for a pushchair?",
      "answer": "Provide its folded dimensions and your suitcase count. Compare the luggage area with the seats arranged as you will use them. An empty interior photo or capacity with seats folded does not show available space with passengers."
    }
  },
  "K1": {
    "status": "A",
    "ru": {
      "question": "Подойдёт ли компактный автомобиль для семьи?",
      "answer": "Решение зависит от числа пассажиров, кресел и багажа. Для ежедневных поездок и для встречи в аэропорту загрузка может сильно различаться. Проверьте именно выбранный кузов, задний ряд и багажник, а не только название класса."
    },
    "en": {
      "question": "Is a compact car suitable for a family?",
      "answer": "It depends on passengers, child seats and luggage. Daily trips and an airport transfer may need very different loading. Check the selected body style, rear seats and boot rather than relying on the category name."
    }
  },
  "K2": {
    "status": "A",
    "ru": {
      "question": "Сколько чемоданов помещается в компактную машину?",
      "answer": "Единого количества для всего класса нет: чемоданы отличаются размерами, а машины — формой багажника. Сверьте размеры багажа с фотографиями выбранного варианта. Если задние сиденья заняты, не учитывайте объём, который появляется после их складывания."
    },
    "en": {
      "question": "How many suitcases fit in a compact car?",
      "answer": "There is no single number for the category: suitcase dimensions and boot shapes differ. Compare your luggage dimensions with photos of the selected car. If the rear seats are occupied, do not include space gained by folding them."
    }
  },
  "K3": {
    "status": "A",
    "ru": {
      "question": "Чем могут отличаться две машины одной модели?",
      "answer": "Годом, кузовом, комплектацией, состоянием и условиями аренды. У вариантов могут быть разные фотографии, тарифы и депозит. Перед подтверждением проверьте конкретный автомобиль и нужное оборудование, а не только название модели."
    },
    "en": {
      "question": "How can two cars of the same model differ?",
      "answer": "By year, body style, equipment, condition and rental terms. Options can have different photos, rates and deposits. Check the specific vehicle and required equipment before confirmation rather than relying only on the model name."
    }
  },
  "E1": {
    "status": "A",
    "ru": {
      "question": "Чем седан отличается от компактного автомобиля при выборе для поездки?",
      "answer": "Сравните пространство заднего ряда, багажник и габариты конкретных машин. Название класса не гарантирует, что любая крупная коляска войдёт: важны размер проёма и форма багажника. Для семьи полезнее фото салона и загрузки, чем общее обещание комфорта."
    },
    "en": {
      "question": "How does a sedan compare with a compact car?",
      "answer": "Compare rear-seat space, boot and dimensions of the specific vehicles. A category name does not guarantee a large pushchair will fit; the opening and boot shape matter. Interior and loading photos are more useful than a general comfort claim."
    }
  },
  "E2": {
    "status": "A",
    "ru": {
      "question": "Есть ли в выбранном седане CarPlay, камера или другие опции?",
      "answer": "Комплектация зависит от конкретного автомобиля и года. Проверяйте нужные опции в его характеристиках и подтверждении аренды. Не переносите список оборудования из обзора другой комплектации на машину из каталога."
    },
    "en": {
      "question": "Does this sedan have CarPlay, a camera or other equipment?",
      "answer": "Equipment depends on the specific vehicle and year. Check required options in its specifications and rental confirmation. Do not apply a review of another trim level to the catalogue vehicle."
    }
  },
  "E3": {
    "status": "B",
    "ru": {
      "question": "У всех седанов одинаковая франшиза?",
      "answer": "Нет. На сайте для стандартных седанов и BMW указаны разные условия. Точное значение смотрите у выбранного автомобиля. Вместе с франшизой проверьте депозит и исключения из покрытия."
    },
    "en": {
      "question": "Do all sedans have the same insurance excess?",
      "answer": "No. The published terms distinguish standard sedans and BMW vehicles. Check the specific car's value together with its deposit and coverage exclusions."
    }
  },
  "V1": {
    "status": "A",
    "ru": {
      "question": "Любой SUV рассчитан на семь человек?",
      "answer": "Нет. В классе встречаются разные конфигурации салона. Смотрите число мест конкретного автомобиля и фотографии рядов сидений. Если едут семь человек, дополнительно проверьте размещение багажа при разложенном третьем ряде."
    },
    "en": {
      "question": "Does every SUV seat seven people?",
      "answer": "No. Seating configurations differ. Check the specific vehicle's seat count and row photos. For seven passengers, also check luggage space with the third row raised."
    }
  },
  "V2": {
    "status": "A",
    "ru": {
      "question": "SUV означает полный привод и разрешение на бездорожье?",
      "answer": "Нет. Тип привода определяется комплектацией, а допустимые маршруты — условиями договора. Высокая посадка не является разрешением на бездорожье, затопленные участки или любые поездки за пределы согласованной территории."
    },
    "en": {
      "question": "Does SUV mean four-wheel drive and permission to go off-road?",
      "answer": "No. Drive type depends on the trim; permitted routes depend on the agreement. A higher seating position does not permit off-road driving, flooded roads or trips outside the agreed area."
    }
  },
  "V3": {
    "status": "A",
    "ru": {
      "question": "Большой SUV всегда удобнее для семьи с багажом?",
      "answer": "Не обязательно: важны конфигурация сидений, доступ к креслам и багажник при занятых местах. Сравните реальные фотографии нескольких машин под свой состав семьи. Не выбирайте только по внешним габаритам."
    },
    "en": {
      "question": "Is a large SUV always better for a family with luggage?",
      "answer": "Not necessarily. Seat configuration, access to child seats and boot space with seats occupied matter. Compare photos of several vehicles for your group rather than choosing by exterior size alone."
    }
  },
  "G1": {
    "status": "A",
    "ru": {
      "question": "Поместятся ли семь человек и семь чемоданов?",
      "answer": "Семь мест означают количество посадочных мест, а не гарантированный объём багажа. При использовании третьего ряда багажник может быть значительно меньше. До брони нужно проверить количество и размеры чемоданов на конкретной модели."
    },
    "en": {
      "question": "Will seven people and seven suitcases fit?",
      "answer": "Seven seats indicate passenger capacity, not guaranteed luggage space. Using the third row can substantially reduce the boot. Check suitcase counts and dimensions against the specific model before booking."
    }
  },
  "G2": {
    "status": "A",
    "ru": {
      "question": "Почему на фотографиях одной машины багажник выглядит по-разному?",
      "answer": "Объём меняется при складывании третьего и второго рядов. Для поездки всей группой нужны фотографии с разложенными используемыми сиденьями. Фото грузового пространства без пассажиров не подходит для оценки полной загрузки."
    },
    "en": {
      "question": "Why does the same car's boot look different in photos?",
      "answer": "Space changes when the second and third rows are folded. For a full group, use photos with the required seats raised. Cargo-space photos without passengers cannot show full-group luggage capacity."
    }
  },
  "G3": {
    "status": "A",
    "ru": {
      "question": "Можно поставить детское кресло в третий ряд?",
      "answer": "Не определяйте это только по числу мест. Возможность установки зависит от автомобиля, конкретного места и инструкции кресла. До брони согласуйте расположение кресел и доступ остальных пассажиров; универсального обещания для всех семиместных машин нет."
    },
    "en": {
      "question": "Can a child seat go in the third row?",
      "answer": "Seat count alone cannot answer this. Suitability depends on the vehicle, seat position and child-seat instructions. Agree child-seat placement and passenger access before booking; there is no universal promise for all seven-seat cars."
    }
  },
  "G4": {
    "status": "A",
    "ru": {
      "question": "Что сообщить для подбора машины на большую компанию?",
      "answer": "Количество взрослых и детей, параметры детей для кресел, число и размеры чемоданов, наличие коляски и предполагаемые поездки. Это помогает проверить, подходит ли одна машина по посадке и багажу одновременно."
    },
    "en": {
      "question": "What details help select a car for a large group?",
      "answer": "Share adult and child counts, children's measurements for child seats, suitcase counts and dimensions, any pushchair and intended trips. This helps check whether one car fits both passengers and luggage."
    }
  },
  "B1": {
    "status": "A",
    "ru": {
      "question": "Достаточно ли автомобильной категории для скутера?",
      "answer": "Не считайте автомобильную категорию разрешением на управление мотоциклом. Нужны действительные в Таиланде документы с подходящим допуском к выбранному транспорту. Правила выдачи проката не заменяют требования к законному управлению."
    },
    "en": {
      "question": "Is a car licence sufficient for a scooter?",
      "answer": "Do not treat a car licence as permission to ride a motorcycle. You need documents valid in Thailand with the appropriate entitlement for the selected vehicle. Rental handover rules do not replace legal driving requirements. Check documentation and insurance terms before riding."
    }
  },
  "B2": {
    "status": "A",
    "ru": {
      "question": "Как выбирать между NMAX, PCX и более крупным максискутером?",
      "answer": "Сравните посадку, массу, высоту сиденья, оборудование и свой опыт. Наличие ABS, кофра и других опций нужно проверять у конкретного экземпляра. Больший объём двигателя сам по себе не делает транспорт подходящим начинающему водителю."
    },
    "en": {
      "question": "How do I choose between NMAX, PCX and a larger maxi scooter?",
      "answer": "Compare riding position, weight, seat height, equipment and your experience. Check ABS, a top box and other options for the specific vehicle. A larger engine alone does not make a bike suitable for a beginner."
    }
  },
  "B3": {
    "status": "A",
    "ru": {
      "question": "Есть ли шлемы и кофр в комплекте аренды?",
      "answer": "Комплектность нужно проверить у выбранного байка до подтверждения. Уточните количество и размеры шлемов, наличие кофра и другого согласованного оборудования. Фотография одного варианта модели не подтверждает комплектацию всех остальных."
    },
    "en": {
      "question": "Are helmets and a top box included?",
      "answer": "Check equipment for the selected bike before confirmation. Ask about helmet numbers and sizes, a top box and other agreed accessories. Photos of one model variant do not establish equipment for all others."
    }
  },
  "B4": {
    "status": "A",
    "ru": {
      "question": "Можно ли получить скутер в аэропорту с большим чемоданом?",
      "answer": "Место выдачи не решает вопрос перевозки багажа. До брони оцените, сможете ли безопасно разместить вещи; для крупного чемодана может понадобиться отдельная перевозка. Не рассчитывайте перевозить его способом, который мешает управлению."
    },
    "en": {
      "question": "Can I collect a scooter at the airport with a large suitcase?",
      "answer": "The collection point does not solve luggage transport. Before booking, assess whether you can carry your belongings safely; a large suitcase may need separate transport. Do not plan to carry it in a way that interferes with riding."
    }
  },
  "D4": {
    status: "B",
    ru: { question: "Когда возвращается депозит за автомобиль?", answer: policyCopy("ru").depositReturn },
    en: { question: "When is the car's security deposit returned?", answer: policyCopy("en").depositReturn },
  },
  "T4": {
    status: "B",
    ru: { question: "Какая предоплата за авто и что происходит при отмене?", answer: policyCopy("ru").carBooking },
    en: { question: "What is the car booking advance and what happens if I cancel?", answer: policyCopy("en").carBooking },
  },
  "L4": {
    status: "B",
    ru: { question: "Сколько стоит доставка и возврат в городе?", answer: policyCopy("ru").delivery },
    en: { question: "What do city delivery and return cost?", answer: policyCopy("en").delivery },
  }
} as const;

export type FaqId = keyof typeof answers;
export const pageFaqIds: Record<string, FaqId[]> = {
  home: ["H1", "H2", "H3", "H4", "H5", "H6"],
  "rental-terms": ["T1", "T2", "T3", "T4", "D4"],
  deposit: ["D1", "D2", "D3", "D4", "T4"],
  insurance: ["I1", "I2", "I3"],
  delivery: ["L1", "L2", "L3", "L4"],
  "phuket-airport-car-rental": ["A1", "A2", "A3", "A4"],
  "short-term-car-rental-phuket": ["S1", "S2", "S3", "T4"],
  "long-term-car-rental-phuket": ["M1", "M2", "M3", "M4", "T4", "D4"],
  "car-rental-with-child-seat-phuket": ["C1", "C2", "C3", "C4"],
  "compact-car-rental-phuket": ["K1", "K2", "K3"],
  "sedan-rental-phuket": ["E1", "E2", "E3"],
  "suv-rental-phuket": ["V1", "V2", "V3"],
  "seven-seat-car-rental-phuket": ["G1", "G2", "G3", "G4"],
  "scooter-rental-phuket": ["B1", "B2", "B3", "B4"],
  faq: ["H1", "T1", "D4", "T4", "I1", "L4"],
};

export function getAuditFaq(ids: FaqId[], locale: Locale) {
  return ids.map((id) => {
    const answer = answers[id][locale];
    return {
      question: answer.question,
      answer: answer.answer
        .replaceAll("{airportPrice}", String(rentalPolicy.delivery.airport))
        .replaceAll("{cityPrice}", String(rentalPolicy.delivery.city)),
    };
  });
}
export const getPageFaq = (slug: string, locale: Locale) =>
  getAuditFaq(pageFaqIds[slug] ?? [], locale);
