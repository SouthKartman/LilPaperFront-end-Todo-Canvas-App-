# 📖 Architecture Documentation for Canvas Todo App

🏗️ Простая модульная архитектура для Canvas Todo приложения
Это приложение использует Feature-Sliced Design (FSD) архитектуру - современный подход к организации React-приложений, который делает код понятным, масштабируемым и поддерживаемым.

## Структура проекта

```bash
src/
├── app/                    # 🏠 Ядро приложения
│   ├── providers/         # Провайдеры (Redux, DnD, Themes)
│   ├── styles/            # Глобальные стили
│   └── App.tsx            # Корневой компонент
├── entities/              # 🏢 Бизнес-сущности
│   └── todo/              # Сущность "Задача"
│       ├── model/         # Типы и модели данных
│       ├── lib/           # Утилиты для работы с сущностью
│       └── ui/            # Базовые UI компоненты сущности
├── features/              # 🎯 Пользовательские сценарии
│   ├── todo-nodes/        # Работа с нодами-задачами
│   ├── canvas-dnd/        # Drag & Drop на холсте
│   ├── canvas-toolbar/    # Панель инструментов
│   ├── properties-panel/  # Панель свойств
│   ├── canvas-viewport/   # Зум и панорамирование
│   ├── node-creations/    # Создание Todo Task
│   ├── todo-form/         # Форма создания Todo Task
│   └── selection/         # Выделение элементов
│   └── storage/           # UI компанент статистики для хранилища (сохранения)
├── widgets/               # 🧩 Независимые UI блоки
│   ├── workspace-layout/  # Макет рабочей области
│   └── canvas-workspace/  # Холст для работы
├── processes/             # 🔄 Сложные бизнес-процессы
│   └── canvas-actions/    # Комплексные действия с холстом
└── shared/                # 🤝 Общий переиспользуемый код
    ├── api/               # HTTP клиент и API
    │   └── storage/
    │       └── jsonStorage/
    ├── lib/               # Утилиты и хелперы
    ├── ui/                # Общие UI компоненты
    │   └── kit/
    │   └── icons/ 
    └── config/            # Конфигурации приложения
```

## Наполнение проекта

```bash
    src/
├── 📂 app/                    # 🏠 ЯДРО ПРИЛОЖЕНИЯ (настройки и запуск)
│   ├── 📂 providers/         # 🔌 ПРОВОДКА (обертки для библиотек)
│   │   ├── StoreProvider/    # 🗃️ Redux хранилище данных
│   │   ├── ThemeProvider/    # 🎨 Темы (светлая/темная)
│   │   └── DndProvider/      # 🖱️ Настройки Drag & Drop
│   ├── 📂 styles/            # 🖌️ ГЛОБАЛЬНЫЕ СТИЛИ
│   │   ├── global.css        # 🌍 Основные стили всего приложения
│   │   └── variables.css     # 🎯 CSS переменные (цвета, шрифты)
│   └── App.tsx              # 🚪 ВХОДНАЯ ДВЕРЬ (главный компонент)
│
├── 📂 entities/              # 🏢 СУЩНОСТИ (что есть в приложении)
│   └── 📂 todo/              # 📝 СУЩНОСТЬ "ЗАДАЧА"
│       ├── 📂 model/         # 📊 МОДЕЛЬ ДАННЫХ
│       │   ├── types.ts      # 📐 ТИПЫ TypeScript (описание задачи)
│       │   └── api.ts        # 🌐 API запросы к серверу
│       ├── 📂 lib/           # 🧰 ИНСТРУМЕНТЫ ДЛЯ ЗАДАЧ
│       │   └── todoUtils.ts  # ⚙️ Функции для работы с задачами
│       └── 📂 ui/            # 👁️ БАЗОВЫЙ ВИД ЗАДАЧИ
│           └── TodoCard/     # 🎴 Карточка задачи (минимум стилей)
│
├── 📂 features/              # 🎯 ФИЧИ (что можно делать)
│   ├── 📂 todo-nodes/        # 🎯 НОДЫ-ЗАДАЧИ НА ХОЛСТЕ
│   │   ├── 📂 lib/           # 🧠 ЛОГИКА
│   │   │   └── useTodoNode.ts     # 🪝 Хук для работы с нодой
│   │   │   └── todoNodeHelpers.ts # 🔧 Вспомогательные функции
│   │   ├── 📂 model/         # 💾 ДАННЫЕ И СОСТОЯНИЕ
│   │   │   ├── types.ts      # 📐 Типы для нод
│   │   │   ├── slice.ts      # 🗃️ Redux slice (хранилище)
│   │   │   └── selectors.ts  # 🔍 Функции для получения данных
│   │   └── 📂 ui/            # 👁️ ИНТЕРФЕЙС
│   │       ├── TodoNode/     # 🎴 Компонент ноды
│   │       ├── TodoForm/     # 📝 Форма создания/редактирования
│   │       └── TodoList/     # 📋 Список нод (если понадобится)
│   ├── 📂 nodes-creations/   # 🎯 НОДЫ-ЗАДАЧИ НА ХОЛСТЕ
│   │   ├── 📂 lib/           # 🧠 ЛОГИКА
│   │   │   ├── contextMenuHelpers.ts  # 🪝 Хук для работы с меню пунктами
│   │   │   └── useContextMenu  # 🔧 Работа функций контекстного меню
│   │   ├── 📂 model/         # 💾 ДАННЫЕ И СОСТОЯНИЕ
│   │   │   ├── types.ts      # 📐 Типы для нод
│   │   │   ├── slice.ts      # 🗃️ Redux slice (хранилище)
│   │   │   └── selectors.ts  # 🔍 Функции для получения данных
│   │   └── 📂 ui/            # 👁️ ИНТЕРФЕЙС
│   │       ├── СontextMenu/  # 🎴 Компонент ноды
│   │       ├── MenuDivider/  # 📝 Форма создания/редактирования
│   │       └── MenuItem/     # 📋 Список нод (если понадобится)
│   ├── 📂 todo-form/         # 🎯 Форма для создания Ноды
│   │   ├── 📂 lib/           # 🧠 ЛОГИКА
│   │   │   └── useTodoForm.ts     # 🪝 Хук для работы с формой
│   │   ├── 📂 model/         # 💾 ДАННЫЕ И СОСТОЯНИЕ
│   │   │   ├── types.ts      # 📐 Типы для нод
│   │   │   └── slice.ts      # 🗃️ Redux slice (хранилище)
│   │   └── 📂 ui/            # 👁️ ИНТЕРФЕЙС
│   │       ├── QuickTodoForm/     # 🎴 Быстрая форма создания
│   │       ├── TodoForm/     # 📝 Форма создания/редактирования
│   │       └── TodoFormModal/     # 📋 Форма (если понадобится)
│   ├── 📂 storage/         # 🎯 Форма для просмотра функции автосохранения
│   │   └── 📂 ui/            # 👁️ ИНТЕРФЕЙС
│   │       └── StorageMeneger/     # 🎴 Форма сохранений
│   ├── 📂 canvas-dnd/        # 🖱️ ПЕРЕТАСКИВАНИЕ (Drag & Drop)
│   │   ├── lib/useCanvasDnd.ts    # 🧠 Логика перетаскивания
│   │   ├── model/slice.ts         # 💾 Состояние DnD
│   │   └── ui/DragPreview.tsx     # 👁️ Препью при перетаскивании
│   │
│   ├── 📂 canvas-toolbar/    # 🛠️ ПАНЕЛЬ ИНСТРУМЕНТОВ
│   │   ├── lib/useToolbar.ts      # 🧠 Логика тулбара
│   │   ├── model/slice.ts         # 💾 Состояние инструментов
│   │   └── ui/Toolbar.tsx         # 👁️ Компонент тулбара
│   │
│   ├── 📂 properties-panel/  # ⚙️ ПАНЕЛЬ СВОЙСТВ
│   │   ├── lib/useProperties.ts   # 🧠 Логика панели
│   │   ├── model/types.ts         # 📐 Типы свойств
│   │   └── ui/PropertiesPanel.tsx # 👁️ Компонент панели
│   │
│   ├── 📂 canvas-viewport/   # 🔍 ЗУМ И ПАНОРАМИРОВАНИЕ
│   │   ├── lib/useCanvasViewport.ts # 🧠 Логика зума
│   │   └── ui/ZoomControls.tsx     # 👁️ Кнопки управления
│   │
│   └── 📂 selection/         # ☑️ ВЫДЕЛЕНИЕ ЭЛЕМЕНТОВ
│       ├── lib/useSelection.ts     # 🧠 Логика выделения
│       ├── model/slice.ts          # 💾 Состояние выделения
│       └── ui/SelectionBox.tsx     # 👁️ Рамка выделения
│
├── 📂 widgets/               # 🧩 ГОТОВЫЕ БЛОКИ (комнаты)
│   ├── 📂 workspace-layout/  # 📐 МАКЕТ РАБОЧЕЙ ОБЛАСТИ
│   │   ├── lib/useLayout.ts       # 🧠 Логика макета
│   │   └── ui/WorkspaceLayout.tsx # 👁️ Компонент макета
│   │
│   └── 📂 canvas-workspace/  # 🎨 ХОЛСТ С ИНСТРУМЕНТАМИ
│       ├── lib/useWorkspace.ts    # 🧠 Логика рабочей области
│       └── ui/CanvasWorkspace.tsx # 👁️ Компонент холста
│
├── 📂 processes/             # 🔄 ПРОЦЕССЫ (сложные действия)
│   └── 📂 canvas-actions/    # ✨ СЛОЖНЫЕ ДЕЙСТВИЯ С ХОЛСТОМ
│       ├── lib/useCanvasActions.ts # 🧠 Хук для действий
│       └── model/types.ts          # 📐 Типы для действий
│
└── 📂 shared/                # 🤝 ОБЩИЙ КОД (все используют)
    ├── 📂 api/               # 🌐 РАБОТА С СЕРВЕРОМ
    │   ├── client.ts         # 🚗 HTTP клиент (axios/fetch)
    │   └── endpoints.ts      # 🎯 Адреса API (URLs)
    │    └── storage/                 # Хранилища
    │        └── jsonStorage/         # Json хранилище
    │            └── localStorage.ts  # Функция локального хранилища
    │            └── todoStorage.ts   #🔄 Функции работы хранилища с нодами заметок  
    │
    ├── 📂 lib/               # 🧰 ИНСТРУМЕНТЫ И УТИЛИТЫ
    │   ├── 📂 geometry/      # 📐 ГЕОМЕТРИЧЕСКИЕ ФУНКЦИИ
    │   │   ├── vector.ts     # 📏 Работа с векторами
    │   │   └── calculations.ts # 🧮 Вычисления (расстояния, углы)
    │   │
    │   ├── 📂 dom/           # 🖥️ РАБОТА С ДОМ
    │   │   ├── events.ts     # 🎮 Обработка событий
    │   │   └── helpers.ts    # 🔧 Вспомогательные функции
    │   │
    │   ├── 📂 state/         # 🗃️ НАСТРОЙКИ СОСТОЯНИЯ
    │   │   └── store.ts      # ⚙️ Конфигурация Redux store
    │   │
    │   ├── constants.ts      # 🔤 КОНСТАНТЫ (числа, строки)
    │   └── helpers.ts        # 🛠️ ОБЩИЕ ПОМОЩНИКИ
    │
    ├── 📂 ui/                # 🎨 ОБЩИЕ КОМПОНЕНТЫ
    │   ├── 📂 kit/           # 🧩 ДИЗАЙН-СИСТЕМА
    │   │   ├── Button/       # 🔘 Кнопка
    │   │   ├── Input/        # ⌨️ Поле ввода
    │   │   ├── Modal/        # 🪟 Модальное окно
    │   │   ├── Select/       # 📋 Выпадающий список
    │   │   └── index.ts      # 📦 Экспорт всех компонентов
    │   │
    │   ├── 📂 layout/        # 📐 КОМПОНЕНТЫ МАКЕТА
    │   │   ├── Container/    # 📦 Контейнер (центрирование)
    │   │   └── Grid/         # 🔲 Сетка
    │   │
    │   └── 📂 icons/         # 🎨 ИКОНКИ
    │       └── Icon.tsx      # 🖼️ Компонент иконки
    │
    └── 📂 config/            # ⚙️ КОНФИГУРАЦИИ
        ├── routes.ts         # 🗺️ МАРШРУТЫ (страницы)
        └── env.ts            # 🌍 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
```

# 🎯 Назначение каждого слоя

## 1. app/ - Фундамент приложения
Назначение: Инициализация, провайдеры, глобальные настройки

### Что содержит:

providers/ - обертки для внешних библиотек (Redux, DnD Kit)

styles/ - глобальные CSS переменные и стили

App.tsx - корневой компонент приложения

Когда использовать: Для добавления новых провайдеров, глобальных стилей

## 2. entities/ - Бизнес-сущности
Назначение: Описание бизнес-логики и данных

### Что содержит:

model/ - TypeScript типы, интерфейсы, DTO

lib/ - бизнес-логика, утилиты для работы с сущностью

ui/ - базовые компоненты отображения сущности

Пример: entities/todo/ - описание задачи, ее структуры и базового отображения

Когда использовать: При добавлении новых типов данных (пользователи, проекты, комментарии)

## 3. features/ - Пользовательские сценарии
Назначение: Реализация конкретных функций для пользователя

Структура каждого feature:

```bash
feature-name/
├── lib/          # Логика (React хуки, утилиты)
├── model/        # Состояние (Redux slices, типы)
└── ui/           # Компоненты (React компоненты)
```

### Примеры:

todo-nodes/ - создание, редактирование, удаление нод

canvas-dnd/ - перетаскивание элементов на холсте

selection/ - выделение и работа с выделенными элементами

Когда использовать: Для добавления новой функциональности

## 4. widgets/ - Композитные UI блоки
Назначение: Сборные компоненты, объединяющие несколько features

Примеры:

workspace-layout/ - макет с тулбаром, холстом и сайдбаром

canvas-workspace/ - холст с нодами и инструментами

Когда использовать: Для создания сложных UI компонентов, используемых в нескольких местах

## 5. processes/ - Сложные бизнес-процессы
Назначение: Координация нескольких features для сложных операций

Пример: canvas-actions/ - операции, требующие взаимодействия DnD, выделения и нод

Когда использовать: Для сложных сценариев, затрагивающих несколько модулей

## 6. shared/ - Общий код
Назначение: Переиспользуемые утилиты, компоненты, настройки

### Что содержит:

api/ - HTTP клиент, конфигурация API

lib/ - утилиты (геометрия, DOM, state management)

ui/ - компоненты дизайн-системы (кнопки, инпуты, модалки)

config/ - конфигурационные файлы

### 🔄 Правила зависимостей
```
app/ ← processes/ ← features/ ← entities/ ← shared/
       widgets/ могут зависеть от всех слоев
```
Основное правило: Зависимости могут идти только от более высоких слоев к более низким.

🚀 Как добавить новую функциональность
Пример: Добавление системы комментариев
Определите сущность (если ее нет):

bash
mkdir -p src/entities/comment/{model,lib,ui}
Создайте feature для работы с комментариями:

bash
mkdir -p src/features/comments/{lib,model,ui}
Создайте widget для отображения комментариев (если нужно):

bash
mkdir -p src/widgets/comments-panel/{lib,model,ui}

text
### Настройте зависимости:

features/comments/ зависит от entities/comment/

widgets/comments-panel/ зависит от features/comments/

## 📦 Установленные зависимости
Основные:
React 18 - UI библиотека

TypeScript - типизация

Redux Toolkit - управление состоянием

React-Konva - работа с Canvas

@dnd-kit - drag & drop функциональность

Утилиты:
date-fns - работа с датами

nanoid - генерация уникальных ID

clsx - условные CSS классы

🛠️ Команды разработки
bash
# Запуск в режиме разработки
npm run dev

# Сборка для production
npm run build

# Проверка TypeScript типов
npm run type-check

# Линтинг кода
npm run lint

# Форматирование кода
npm run format
🎨 Особенности реализации
1. Canvas рендеринг
Используется React-Konva для эффективного рендеринга графических элементов.

2. Состояние приложения
Centralized state management через Redux Toolkit с разделением на feature slices.

3. Drag & Drop
Реализовано с помощью @dnd-kit с поддержкой мыши и тач-устройств.

4. Модульность
Каждая фича изолирована и может разрабатываться независимо.









# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
