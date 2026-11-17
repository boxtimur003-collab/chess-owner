# Chess Owner — шахматы с чит-режимом для владельца

Next.js 15 + TypeScript + Firebase (Spark) + Vercel (Hobby). PWA для iPhone Safari.
Правила — `chess.js`; ИИ и подсказки — собственный alpha-beta движок в Web Worker.

## Что внутри

| Часть | Файлы |
|---|---|
| Лобби: вход/регистрация, гость, партия по коду, друзья, ИИ | `app/page.tsx`, `components/*Panel.tsx` |
| Партия онлайн (Firestore, 1 listener на документ) | `app/game/[id]/page.tsx`, `lib/games.ts` |
| Партия с ИИ (уровни 1–5) | `app/play/ai/page.tsx`, `lib/engine/*` |
| «О приложении» + 10 тапов | `app/about/page.tsx`, `components/TapGate.tsx` |
| Чит-меню (стрелка, оценка, top-10 ходов) | `components/CheatOverlay.tsx`, `lib/cheatSession.tsx` |
| Меню супер-овнера | `app/super/page.tsx` |
| Claims (Vercel API Route + Admin SDK) | `app/api/set-owner`, `app/api/cheat-gate`, `lib/admin.ts` |
| Rules и индексы | `firestore.rules`, `firestore.indexes.json` |

Cloud Functions и Firebase Storage **не используются**.

## 1. Firebase (план Spark)

1. [console.firebase.google.com](https://console.firebase.google.com) → создать проект (оставить план **Spark**).
2. **Authentication → Sign-in method**: включить **Email/Password** и **Anonymous**.
3. **Firestore Database** → Create database → **production mode** (любой регион).
4. **Project settings → General → Your apps → Web (`</>`)** → скопировать конфиг (`apiKey`, `authDomain`, `projectId`, `appId`).
5. **Project settings → Service accounts → Generate new private key** → получите `key.json`. Закодируйте:
   - macOS: `base64 -i key.json | tr -d '\n'`
   - Linux: `base64 -w0 key.json`

   Результат — значение `FIREBASE_SA_B64`. Сам `key.json` затем удалите с диска и не коммитьте.
6. **Authentication → Settings → Authorized domains**: после первого деплоя добавьте домен Vercel (`your-app.vercel.app`).

Rules и индексы (после того как узнаете свой UID, шаг 3 в разделе «Первая овнерка»):

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

Индекс `games: players (array-contains) + createdAt (desc)` нужен для списка «Мои партии». Без него лобби
покажет ошибку с прямой ссылкой на создание индекса в консоли. Правила можно также вставить вручную в
Firestore → Rules.

## 2. Vercel (Hobby)

1. Залейте репозиторий на GitHub.
2. Vercel → **Add New → Project** → импорт репозитория (Framework: Next.js определится сам).
3. **Environment Variables** (см. `.env.example`):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_SA_B64` — секрет, без префикса `NEXT_PUBLIC_`
   - `OWNER_SECRET` — длинная случайная строка (`openssl rand -base64 32`)
   - `SUPER_OWNER_UID` и `NEXT_PUBLIC_SUPER_OWNER_UID` — пока пустые, заполните на шаге ниже
4. **Deploy**.

Локально: `cp .env.example .env.local`, заполнить, `npm install`, `npm run dev`.
(`npm run build` без env упадёт на инициализации Firebase в браузерных страницах — это нормально, на Vercel env есть.)

## 3. Первая овнерка (курица и яйцо)

1. Откройте задеплоенный сайт, **зарегистрируйтесь** (email/пароль).
2. Firebase Console → Authentication → Users → скопируйте свой **UID**.
3. Подставьте UID:
   - Vercel env: `SUPER_OWNER_UID` и `NEXT_PUBLIC_SUPER_OWNER_UID`;
   - `firestore.rules` → `REPLACE_WITH_SUPER_OWNER_UID`, затем `firebase deploy --only firestore:rules`.
4. Vercel → Deployments → **Redeploy** (env читаются при сборке/старте).
5. Войдите под этим аккаунтом и откройте напрямую `/super` (страница пускает только супер-овнера по UID, остальных перенаправляет на главную). Введите свой UID и `OWNER_SECRET` → **Выдать**.
6. Снова 10 тапов в «О приложении»: теперь появится оверлей «Режим включён». В партиях на этом устройстве будут стрелка, оценка и top-10 ходов.

Выдача другому игроку: он сообщает UID (Firebase Console → Users) → вы в `/super` → «Выдать». Ему достаточно сделать 10 тапов (токен обновляется принудительно). Отзыв — кнопка «Забрать»: refresh-токены отзываются, и `cheat-gate` перестаёт его пускать сразу.

## 4. Установка PWA на iPhone

1. Откройте сайт в **Safari** (не в Chrome и не во встроенном браузере мессенджера).
2. «Поделиться» → **«На экран „Домой"»** → «Добавить».
3. Запускайте с иконки — полноэкранный режим.
4. **Войдите в аккаунт уже из установленного приложения**: у PWA на iOS отдельное хранилище, сессия Safari в него не переносится. Лобби показывает об этом баннер, пока приложение открыто не как PWA.

## 5. Лимиты бесплатных планов

**Firebase Spark:** Firestore 50 000 reads/день, 20 000 writes/день, 20 000 deletes/день, 1 GiB хранилища; Authentication — 50 000 MAU (email/password и anonymous входят в этот лимит); Cloud Functions недоступны (не используются).
**Vercel Hobby:** 100 GB Fast Data Transfer, 1 млн Function Invocations, 4 CPU-часа активного CPU.
Цифры лимитов взяты из вашего ТЗ; перед запуском сверьтесь с актуальными страницами Pricing — планы меняются.

### Как не превысить лимиты

- **1 listener = 1 документ партии** (`watchGame`). Никаких слушателей на коллекции.
- **Все list-запросы — с `limit()`**, и Rules это принуждают (`request.query.limit <= 20`): партии, друзья, приглашения, овнеры (≤ 50).
- **Списки загружаются разово** (при заходе в лобби + кнопка «Обновить»), а не realtime; «Ещё» — пагинация через `startAfter`.
- **Никакого Firebase Storage.** Аватарки — инициалы (`components/Avatar.tsx`).
- **Гости не пишут профиль** (экономия writes); профиль + код друга создаются только при регистрации.
- **Vercel:** функции вызываются только при 10 тапах (`cheat-gate`) и выдаче овнерок (`set-owner`). Игровой трафик идёт напрямую в Firebase.
- **Движок считает на устройстве** (Web Worker), на сервер ничего не уходит.

**Ожидаемая нагрузка.** Партия в ~80 ходов ≈ 83 writes (80 ходов + создание + присоединение + завершение) и ≈ 165 reads (по одному на каждое изменение для каждого из двух слушателей + начальные чтения). Отсюда **~240–250 партий в день** до упора в 20 000 writes (по reads запас чуть больше: ~300). Оценка консервативна. Для друзей это с большим запасом.

Мониторинг: Firebase Console → Firestore → **Usage**; Vercel → **Usage**. В `/super` есть счётчик вызовов `set-owner` с предупреждением.

## 6. Модель угроз (честно)

- Claim `owner` ставится **только** через `/api/set-owner` (Admin SDK) — клиент подделать его не может. Эндпоинт требует токен супер-овнера **и** секрет, на любую ошибку отвечает 404.
- `cheat-gate` проверяет claim на сервере и учитывает отзыв токенов. Но **сам движок и код чит-меню лежат в клиентском бандле**: технически подкованный пользователь может включить подсказки у себя через devtools. Гейт защищает *доступ к меню*, а не сам код. Для «доступ только друзьям» этого достаточно; полной защиты в клиентском приложении без серверных вычислений не бывает (серверный движок — это уже расходы CPU-часов Hobby).
- Состояние «чит включён» хранится только в памяти (не в Firestore/localStorage), соперник его не видит; перезапуск приложения выключает режим.
- Firestore Rules проверяют очерёдность хода, набор полей, `moveCount + 1` и права, но **не проверяют легальность хода** (без движка это невозможно). Игрок с devtools может записать нелегальный FEN. Для игры с друзьями приемлемо.
- Код приглашения = id документа (8 символов из 32 → 32⁸ вариантов), `get` разрешён любому вошедшему: безопасность держится на секретности кода.

## 7. Границы v1

Нет: таймера, чата, предложения ничьей, выбора фигуры при превращении (всегда ферзь), drag-and-drop (ходы тапами), push-уведомлений о приглашении (приглашения видны в лобби при заходе/«Обновить»), офлайн-режима/service worker (для установки PWA на iOS не нужен), вечного шаха/троекратного повторения в онлайн-партиях (авто-ничья только по правилам chess.js на текущем FEN).
Набор SVG-фигур базовый — замените пути в `components/Pieces.tsx` на открыто лицензированный сет для «премиального» вида.
