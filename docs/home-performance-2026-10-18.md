# Главная: загрузка hero и статических ресурсов

## Изменения в сайте

- Фон sunset: те же утверждённые изображения, механическое уменьшение и WebP quality 68. Мобильный 63 350 → 26 918 байт; desktop 75 154 байт. Исходники оставлены. Повторный экспорт: `node apps/marketing/scripts/prepare-hero-background.mjs`.
- Preload совпадает с CSS, разделён media-условием 700px и имеет `fetchPriority="high"`. Не загружаем обе версии сразу. Логотип больше не конкурирует с LCP через явный high-preload.
- Manrope v20 (variable 500–800) размещён локально: Latin, Cyrillic и Latin Extended. Сохранены family/weights, `font-display: swap` и unicode ranges. Только необходимые subset-файлы запрашиваются; RU предварительно загружает Latin+Cyrillic, EN только Latin.
- Шрифт получен из Google Fonts CSS API: `https://fonts.googleapis.com/css2?family=Manrope:wght@500..800&display=swap`. Файлы — `https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2` (Latin), `xn7gYHE41ni1AdIRggOxSuXd.woff2` (Cyrillic), `xn7gYHE41ni1AdIRggmxSuXd.woff2` (Latin Extended). Лицензия: `public/fonts/OFL-Manrope.txt`, upstream `https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt`.

## Подготовленная серверная часть — НЕ активирована

`deploy/nginx.public-performance.conf` подключается один раз **внутри существующего HTTPS server Sunny**, рядом с текущими location-блоками. Он добавляет:

- gzip level 6 для CSS/JS/JSON/SVG в `/_next/static/`, `Vary: Accept-Encoding`;
- годовой immutable-кеш только для хешированных Next-ресурсов;
- недельный кеш для `/fonts/`, `/images/atmosphere/` и `/logo.png.webp`;
- реальный 404 без долгого кеширования для отсутствующих ресурсов.

Не заменять весь server старым `deploy/nginx.sunny-rentals.online.conf`: он описывает прежнюю proxy-архитектуру. Не добавлять глобальный regex по расширениям: это может перехватить API/кабинеты/другие приложения. HTML, приватные данные, API и MP4 не получают immutable-кеш.

Для фотографий машин оператору дополнительно нужно добавить **`expires 7d;` в уже существующий `location /images_web/`**, не создавая второй одноимённый блок и сохранив его proxy_pass и заголовки. Без этого аудит кеша фотографий останется.

После отдельного согласования оператор делает резервную копию активного nginx-конфига, добавляет include на этот файл, проверяет `nginx -t` и только затем применяет reload. В этой задаче `/etc/nginx` не изменялся, reload/restart/deploy не выполнялись. Обычная публикация через `deploy.sh` не устанавливает этот include.

После применения проверить HTTP GET с `Accept-Encoding: gzip` для реального CSS и JS: `Content-Encoding: gzip`, `Vary: Accept-Encoding`, корректный MIME и `Cache-Control: public, max-age=31536000, immutable`. Запрос без gzip должен возвращать исходные байты; отсутствующий chunk — 404 без immutable. Проверить кеш фотографий отдельно. Откат серверной части — убрать только добавленный include и `expires`, пройти nginx -t и применить отдельным разрешённым действием.

Основание: [Nginx gzip](https://nginx.org/en/docs/http/ngx_http_gzip_module.html). Нужен именно gzip_types: по умолчанию сжимается text/html, но не CSS/JS.

## Проверки и границы результата

Выполнено: 37 Node-тестов, сборка Next в изолированной копии (171 страница), SEO-проверка 112 canonical URL, Chromium RU/EN × 320/390/1440 (6 успешных случаев). Скриншоты мобильной и desktop-версии просмотрены; локальные шрифты загружаются, выбирается только соответствующий viewport фон, даты и переключение отзывов работают. Артефакты: `.local/home-performance-qa/report.json` и четыре PNG рядом. CSS-разделение и фотографии автомобилей не изменялись.

`node --test tests/public-performance.test.mjs tests/home-hero.test.mjs tests/customer-reviews.test.mjs` — включает реальный изолированный nginx на случайном loopback-порту; production-сервис не трогает. Проверяются gzip/identity, Vary, кеш, 404, лицензия/локальность шрифта и parity ресурсов.

`scripts/check_home_performance.py EXPORT OUTPUT` — изолированный экспорт в Chromium, RU/EN × 320/390/1440: локальные шрифты, правильный единственный фон, отсутствие переполнения, работа дат и отзывов. Не измеряет production PageSpeed и не подменяет его локальными цифрами.

Исходный отчёт владельца: mobile 74, FCP 2.6s, LCP 4.5s, TBT 20ms, CLS 0.007. Проверка live-ответов до правок подтвердила: CSS 72 439 байт и JS 227 308 байт без Content-Encoding и Cache-Control. Пробное gzip6 этих байтов: 14 190 / 70 969 байт соответственно. Это потенциал сжатия, а не обещание нового LCP.

После публикации сайта **и отдельной активации серверной части** повторить mobile PSI несколько раз в одинаковых условиях. Массовое разделение global CSS, смена DPR-размеров автокарточек и удаление framework-полифилов в этот пакет не входят: это отдельные изменения с риском регрессий, вторичные после выявленного сетевого ограничения.
