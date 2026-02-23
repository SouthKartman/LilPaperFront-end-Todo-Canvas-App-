
<h1 align="center">🎨 Canvas Todo App</h1>

<p align="center">
  <strong>Интерактивное приложение для управления задачами на бесконечном холсте</strong><br />
  с поддержкой изображений, проектов и продвинутым Drag & Drop
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Redux_Toolkit-2.0-purple" alt="Redux Toolkit" />
  <img src="https://img.shields.io/badge/Dexie.js-4.0-green" alt="Dexie.js" />
  <img src="https://img.shields.io/badge/FSD-Architecture-green" alt="FSD Architecture" />
</p>


<h2>📋 О приложении</h2>

<p>
  <strong>Canvas Todo App</strong> — это полноценное визуальное рабочее пространство, 
  вдохновленное такими инструментами как Miro, Figma и Notion. Вместо скучных списков вы получаете <strong>бесконечный холст</strong>, 
  на котором можно размещать задачи, изображения, создавать связи между ними и организовывать проекты любым удобным способом.
</p>


<br>


## Наполнение проекта

```bash
src/
├── 📂 app/                   # 🏠 ЯДРО ПРИЛОЖЕНИЯ
│   ├── 📂 providers/         # 🔌 ПРОВАЙДЕРЫ
│   │   ├── StoreProvider/    # 🗃️ Redux хранилище
│   │   ├── ThemeProvider/    # 🎨 Темы (светлая/темная)
│   │   └── DndProvider/      # 🖱️ Drag & Drop
│   ├── 📂 styles/            # 🖌️ ГЛОБАЛЬНЫЕ СТИЛИ
│   │   ├── global.css
│   │   └── variables.css
│   └── App.tsx               # 🚪 ГЛАВНЫЙ КОМПОНЕНТ
│
├── 📂 entities/              # 🏢 БИЗНЕС-СУЩНОСТИ
│   ├── 📂 todo/              # 📝 СУЩНОСТЬ "ЗАДАЧА"
│   │   ├── 📂 model/
│   │   │   ├── types.ts      # 📐 Типы задач
│   │   │   └── api.ts        # 🌐 API для задач
│   │   ├── 📂 lib/
│   │   │   └── todoUtils.ts  # ⚙️ Утилиты для задач
│   │   └── 📂 ui/
│   │       └── TodoCard/     # 🎴 Базовая карточка задачи
│   │
│   ├── 📂 canvas/            # 🖼️ СУЩНОСТЬ "КАНВАС"
│   │   ├── 📂 model/
│   │   │   ├── types.ts      # 📐 Типы для canvas
│   │   │   └── api.ts        # 🌐 API для canvas
│   │   └── 📂 lib/
│   │       └── canvasHelpers.ts # 🔧 Хелперы для canvas
│   │
│   └── 📂 image/             # 🖼️ СУЩНОСТЬ "ИЗОБРАЖЕНИЕ"
│       ├── 📂 model/
│       │   └── types.ts      # 📐 Типы для изображений
│       └── 📂 lib/
│           └── imageHelpers.ts # 🔧 Хелперы для изображений
│
├── 📂 features/              # 🎯 ПОЛЬЗОВАТЕЛЬСКИЕ СЦЕНАРИИ
│   ├── 📂 todo-nodes/        # 🎯 НОДЫ-ЗАДАЧИ
│   │   ├── 📂 lib/
│   │   │   ├── useTodoNode.ts    # 🪝 Хук для работы с нодой
│   │   │   └── todoNodeHelpers.ts # 🔧 Вспомогательные функции
│   │   ├── 📂 model/
│   │   │   ├── types.ts      # 📐 Типы для нод
│   │   │   ├── slice.ts      # 🗃️ Redux slice
│   │   │   └── selectors.ts  # 🔍 Мемоизированные селекторы
│   │   └── 📂 ui/
│   │       ├── KanvaTodoNode/ # 🎴 Нода для Konva
│   │       └── TodoNode/      # 🎴 Компонент ноды
│   │
│   ├── 📂 image-upload/       # 🎯 ЗАГРУЗКА ИЗОБРАЖЕНИЙ
│   │   ├── 📂 lib/
│   │   │   ├── imageProcessor.ts  # 🔧 Обработка изображений
│   │   │   ├── useImageDrop.ts    # 🪝 D&D изображений
│   │   │   ├── useImageUpload.ts  # 🪝 Загрузка с прогрессом
│   │   │   └── useProjectImage.ts # 🪝 Загрузка из IndexedDB
│   │   ├── 📂 model/
│   │   │   ├── slice.ts      # 🗃️ Redux slice
│   │   │   └── selectors.ts  # 🔍 Селекторы
│   │   └── 📂 ui/
│   │       ├── ImageNode/        # 🎴 Компонент с прелоадером
│   │       ├── ImageDropOverlay/ # 🎴 Оверлей для D&D
│   │       └── ImageUploadButton/ # 🎴 Кнопка загрузки
│   │
│   ├── 📂 node-creations/     # 🎯 СОЗДАНИЕ НОД
│   │   ├── 📂 lib/
│   │   │   ├── contextMenuHelpers.ts # 🔧 Хелперы меню
│   │   │   └── useContextMenu.ts     # 🪝 Контекстное меню
│   │   ├── 📂 model/
│   │   │   ├── types.ts      # 📐 Типы
│   │   │   └── slice.ts      # 🗃️ Redux slice
│   │   └── 📂 ui/
│   │       ├── ContextMenu/  # 🎴 Компонент меню
│   │       ├── MenuDivider/  # 🎴 Разделитель
│   │       └── MenuItem/     # 🎴 Пункт меню
│   │
│   ├── 📂 todo-form/          # 🎯 ФОРМА ЗАДАЧ
│   │   ├── 📂 lib/
│   │   │   └── useTodoForm.ts # 🪝 Хук формы
│   │   ├── 📂 model/
│   │   │   ├── types.ts      # 📐 Типы
│   │   │   └── slice.ts      # 🗃️ Redux slice
│   │   └── 📂 ui/
│   │       ├── QuickTodoForm/   # 🎴 Быстрая форма
│   │       ├── TodoForm/        # 📝 Полная форма
│   │       └── TodoFormModal/   # 📋 Модальная форма
│   │
│   ├── 📂 storage/            # 💾 ХРАНИЛИЩЕ
│   │   ├── 📂 lib/
│   │   │   ├── useAutoSave.ts     # 🪝 Автосохранение
│   │   │   ├── migrationUtils.ts  # 🪝 Миграция данных
│   │   │   └── useIndexedDBInit.ts # 🪝 Инициализация IndexedDB
│   │   ├── 📂 model/
│   │   │   └── autoSaveMiddleware.ts # 🔄 Middleware
│   │   └── 📂 ui/
│   │       └── StorageManager/    # 🎴 Менеджер хранилища
│   │
│   ├── 📂 canvas-dnd/         # 🖱️ DRAG & DROP
│   │   ├── 📂 lib/
│   │   │   └── useCanvasDnd.ts    # 🪝 Логика перетаскивания
│   │   ├── 📂 model/
│   │   │   ├── slice.ts      # 🗃️ Redux slice
│   │   │   └── types.ts      # 📐 Типы DnD
│   │   └── 📂 ui/
│   │
│   ├── 📂 canvas-toolbar/     # 🛠️ ПАНЕЛЬ ИНСТРУМЕНТОВ
│   │   └── 📂 ui/
│   │       └── CanvasToolbar.tsx # 🎴 Тулбар
│   │
│   ├── 📂 properties-panel/   # ⚙️ ПАНЕЛЬ СВОЙСТВ
│   │   └── 📂 ui/
│   │       └── PropertiesPanel.tsx # 🎴 Панель свойств
│   │
│   ├── 📂 canvas-viewport/    # 🔍 ЗУМ И ПАНОРАМИРОВАНИЕ
│   │   ├── 📂 lib/
│   │   │   ├── useCanvasViewport.ts    # 🪝 Логика зума
│   │   │   ├── useEnhancedViewport.ts  # 🪝 Улучшенный viewport
│   │   │   └── useAutoPan.ts           # 🪝 Автопанорамирование
│   │   ├── 📂 model/
│   │   │   ├── slice.ts      # 🗃️ Redux slice
│   │   │   ├── types.ts      # 📐 Типы viewport
│   │   │   └── selectors.ts  # 🔍 Селекторы
│   │   └── 📂 ui/
│   │       ├── GridRenderer/    # 🎴 Рендер сетки
│   │       └── ZoomControls/    # 🎴 Кнопки зума
│   │
│   ├── 📂 project-management/ # 📁 УПРАВЛЕНИЕ ПРОЕКТАМИ
│   │   └── 📂 model/
│   │       ├── slice.ts      # 🗃️ Redux slice
│   │       └── selectors.ts  # 🔍 Селекторы
│   │
│   └── 📂 selection/          # ☑️ ВЫДЕЛЕНИЕ
│       └── 📂 lib/
│           └── useSelection.ts # 🪝 Логика выделения
│
├── 📂 widgets/                # 🧩 ГОТОВЫЕ UI БЛОКИ
│   ├── 📂 workspace-layout/   # 📐 МАКЕТ
│   │   └── 📂 ui/
│   │       └── WorkspaceLayout.tsx # 🎴 Макет рабочей области
│   │
│   ├── 📂 pages-workspace/    # 📄 ПАНЕЛЬ СТРАНИЦ
│   │   └── 📂 ui/
│   │       ├── PageItem/     # 🎴 Элемент страницы
│   │       └── PagesSidebar/ # 🎴 Сайдбар страниц
│   │
│   └── 📂 canvas-workspace/   # 🎨 ХОЛСТ
│       └── 📂 ui/
│           ├── CanvasWorkspace/     # 🎴 Основной холст
│           └── KonvaCanvasWorkspace/ # 🎴 Холст Konva
│
├── 📂 processes/              # 🔄 СЛОЖНЫЕ ПРОЦЕССЫ
│   ├── 📂 canvas-actions/     # ✨ ДЕЙСТВИЯ С ХОЛСТОМ
│   │   └── 📂 lib/
│   │
│   └── 📂 canvas-sync/        # 🔄 СИНХРОНИЗАЦИЯ
│       └── 📂 lib/
│           └── canvasSyncMiddleware/ # 🔄 Middleware синхронизации
│
└── 📂 shared/                 # 🤝 ОБЩИЙ КОД
    ├── 📂 api/                 # 🌐 РАБОТА С ДАННЫМИ
    │   └── 📂 storage/         # ХРАНИЛИЩА
    │       ├── 📂 jsonStorage/ # 📦 localStorage (legacy)
    │       │   ├── localStorage.ts
    │       │   ├── todoStorage.ts
    │       │   └── imageStorage.ts
    │       │
    │       ├── 📂 indexedDB/   # 🗄️ IndexedDB (текущее)
    │       │   ├── schema.ts      # 📐 Схема БД
    │       │   ├── todoStorage.ts # 📝 Задачи
    │       │   ├── imageStorage.ts # 🖼️ Изображения
    │       │   ├── projectStorage.ts # 📁 Проекты
    │       │   └── index.ts     # 📤 Экспорты
    │       │
    │       └── storage.ts      # ⚙️ Конфигурация
    │
    ├── 📂 lib/                 # 🧰 УТИЛИТЫ
    │   ├── 📂 geometry/        # 📐 Геометрические функции
    │   │
    │   ├── 📂 dom/             # 🖥️ РАБОТА С DOM
    │   │   ├── fileService.ts  # 📁 Сервис для файлов
    │   │   └── diagnostic.ts   # 🔍 Диагностика
    │   │
    │   └── 📂 state/           # 🗃️ НАСТРОЙКИ СОСТОЯНИЯ
    │       ├── store.ts        # ⚙️ Конфигурация Redux
    │       └── index.ts        # 📤 Экспорты
    │
    ├── 📂 ui/                  # 🎨 ОБЩИЕ КОМПОНЕНТЫ
    │   ├── 📂 kit/             # 🧩 ДИЗАЙН-СИСТЕМА
    │   │   ├── 📂 Modal/       # 🪟 Модальные окна
    │   │   │   ├── DraggableModal.tsx
    │   │   │   ├── UniversalModal.tsx
    │   │   │   ├── useUniversalModal.ts
    │   │   │   └── AppModal.tsx
    │   │   │
    │   │   ├── 📂 DatePicker/  # 📅 Выбор даты
    │   │   │
    │   │   ├── 📂 ImagePreview/ # 🖼️ Превью изображений
    │   │   │   └── ImagePreview.tsx
    │   │   │
    │   │   └── 📂 AppInitializer/ # 🚀 Инициализация
    │   │       └── AppInitializer.tsx
    │   │
    │   └── 📂 icons/           # 🎨 ИКОНКИ
    │
    └── 📂 config/              # ⚙️ КОНФИГУРАЦИИ
        ├── routes.ts           # 🗺️ Маршруты
        └── env.ts              # 🌍 Переменные окружения
```




<h3>🚀 Ключевые возможности</h3>

<table>
  <thead>
    <tr>
      <th>Функциональность</th>
      <th>Описание</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>🖱️ Интерактивный холст</strong></td>
      <td>Бесконечное рабочее пространство с зумом и панорамированием (как в Figma)</td>
    </tr>
    <tr>
      <td><strong>📝 Умные задачи</strong></td>
      <td>Задачи с приоритетами, статусами, тегами. Можно редактировать прямо на холсте</td>
    </tr>
    <tr>
      <td><strong>🖼️ Поддержка изображений</strong></td>
      <td>Drag & Drop изображений из проводника, ресайз, группировка с задачами</td>
    </tr>
    <tr>
      <td><strong>📁 Управление проектами</strong></td>
      <td>Несколько проектов, страницы внутри проектов, навигация между ними</td>
    </tr>
    <tr>
      <td><strong>🎯 Продвинутый Drag & Drop</strong></td>
      <td>Перетаскивание задач и изображений, авто-панорамирование при перетаскивании к краю</td>
    </tr>
    <tr>
      <td><strong>⚡ Производительность</strong></td>
      <td>Оптимизация через requestAnimationFrame, виртуализация, ленивая загрузка</td>
    </tr>
    <tr>
      <td><strong>💾 Автосохранение</strong></td>
      <td>Мгновенное сохранение всех изменений в localStorage</td>
    </tr>
  </tbody>
</table>

<hr />

<h2>🏗️ Архитектура приложения</h2>

<h3>🎯 Почему Feature-Sliced Design?</h3>

<p>
  Мы выбрали <strong>Feature-Sliced Design (FSD)</strong> — современный подход к организации React-приложений, 
  который обеспечивает:
</p>

<ul>
  <li><strong>Масштабируемость</strong> — приложение может расти без потери качества кода</li>
  <li><strong>Поддерживаемость</strong> — четкие границы между модулями упрощают поиск кода</li>
  <li><strong>Переиспользуемость</strong> — общие компоненты вынесены в shared</li>
  <li><strong>Тестируемость</strong> — изолированные фичи легко тестировать</li>
  <li><strong>Командная работа</strong> — разработчики могут работать над разными фичами без конфликтов</li>
</ul>

<h3>🔧 Технические детали реализации</h3>

<h4>1. Canvas рендеринг</h4>
<p>
  В приложении используется <strong>гибридный подход</strong> к рендерингу холста:
</p>
<ul>
  <li><strong>CSS трансформации</strong> — для позиционирования HTML-элементов (задачи, изображения)</li>
  <li><strong>React-Konva</strong> — для рисования сетки и сложных графических элементов (в разработке)</li>
</ul>
<p>Это позволяет сочетать простоту разработки с производительностью.</p>

<h4>2. Система координат</h4>
<p>
  Одна из ключевых сложностей Canvas-приложений — работа с координатами. В приложении реализована 
  <strong>двухуровневая система координат</strong>:
</p>
<pre><code>Экранные координаты (clientX, clientY) → Относительные координаты canvas → Canvas координаты</code></pre>
<p>
  Все перемещения элементов конвертируются с учетом текущего зума и панорамирования, что обеспечивает 
  точное позиционирование при любом масштабе.
</p>

<h4>3. Управление состоянием</h4>
<p>
  <strong>Redux Toolkit</strong> используется с разделением на предметные области (slices):
</p>
<ul>
  <li><code>todoNodes</code> — состояние задач</li>
  <li><code>imageNodes</code> — состояние изображений</li>
  <li><code>viewport</code> — зум и панорамирование</li>
  <li><code>canvasDnd</code> — состояние перетаскивания</li>
  <li><code>project</code> — управление проектами и страницами</li>
</ul>

<h4>4. Drag & Drop система</h4>
<p>
  Реализована <strong>кастомная DnD система</strong> с поддержкой:
</p>
<ul>
  <li>Перетаскивания задач и изображений</li>
  <li>Авто-панорамирования при перетаскивании к краю</li>
  <li>Throttling через requestAnimationFrame для плавности</li>
  <li>Визуального preview при перетаскивании</li>
</ul>

<h4>5. Работа с изображениями</h4>
<p>
  Изображения проходят через <strong>конвейер обработки</strong>:
</p>
<ol>
  <li>Валидация формата и размера (до 10MB)</li>
  <li>Чтение FileReader API</li>
  <li>Оптимизация размеров (макс. 400x300)</li>
  <li>Конвертация в base64</li>
  <li>Создание ноды изображения на холсте</li>
</ol>

<h4>6. Проекты и страницы</h4>
<p>
  Реализована <strong>иерархическая структура</strong>:
</p>
<pre><code>Проект → Страницы → Холсты → Элементы (задачи + изображения)</code></pre>
<p>
  Каждая страница имеет свой холст с независимым viewport, сеткой и фоном. 
  Элементы могут перемещаться между страницами через drag & drop.
</p>

<hr />

<h2>📁 Полная структура проекта</h2>

<pre><code>src/
├── 📂 app/                    # 🏠 ЯДРО ПРИЛОЖЕНИЯ
│   ├── 📂 providers/          # 🔌 ПРОВАЙДЕРЫ
│   │   ├── StoreProvider/     # 🗃️ Redux хранилище
│   │   ├── ThemeProvider/     # 🎨 Темы (светлая/темная)
│   │   └── DndProvider/       # 🖱️ Drag & Drop
│   ├── 📂 styles/             # 🖌️ ГЛОБАЛЬНЫЕ СТИЛИ
│   │   ├── global.css
│   │   └── variables.css
│   └── App.tsx                # 🚪 ГЛАВНЫЙ КОМПОНЕНТ
│
├── 📂 entities/                # 🏢 БИЗНЕС-СУЩНОСТИ
│   ├── 📂 todo/                # 📝 СУЩНОСТЬ "ЗАДАЧА"
│   │   ├── 📂 model/
│   │   │   ├── types.ts
│   │   │   └── api.ts
│   │   ├── 📂 lib/
│   │   │   └── todoUtils.ts
│   │   └── 📂 ui/
│   │       └── TodoCard/
│   │
│   ├── 📂 canvas/              # 🖼️ СУЩНОСТЬ "КАНВАС"
│   │   ├── 📂 model/
│   │   │   ├── types.ts
│   │   │   └── api.ts
│   │   └── 📂 lib/
│   │       └── canvasHelpers.ts
│   │
│   └── 📂 image/               # 🖼️ СУЩНОСТЬ "ИЗОБРАЖЕНИЕ"
│       ├── 📂 model/
│       │   └── types.ts
│       └── 📂 lib/
│           └── imageHelpers.ts
│
├── 📂 features/                # 🎯 ПОЛЬЗОВАТЕЛЬСКИЕ СЦЕНАРИИ
│   ├── 📂 todo-nodes/          # 🎯 НОДЫ-ЗАДАЧИ
│   │   ├── 📂 lib/
│   │   │   ├── useTodoNode.ts
│   │   │   └── todoNodeHelpers.ts
│   │   ├── 📂 model/
│   │   │   ├── types.ts
│   │   │   ├── slice.ts
│   │   │   └── selectors.ts
│   │   └── 📂 ui/
│   │       ├── KanvaTodoNode/
│   │       └── TodoNode/
│   │
│   ├── 📂 image-upload/        # 🎯 ЗАГРУЗКА ИЗОБРАЖЕНИЙ
│   │   ├── 📂 lib/
│   │   │   ├── imageProcessor.ts
│   │   │   ├── useImageDrop.ts
│   │   │   └── useImageUpload.ts
│   │   ├── 📂 model/
│   │   │   ├── slice.ts
│   │   │   └── selectors.ts
│   │   └── 📂 ui/
│   │       ├── ImageNode/
│   │       ├── ImageDropOverlay/
│   │       └── ImageUploadButton/
│   │
│   ├── 📂 nodes-creations/     # 🎯 СОЗДАНИЕ НОД
│   │   ├── 📂 lib/
│   │   │   ├── contextMenuHelpers.ts
│   │   │   └── useContextMenu.ts
│   │   ├── 📂 model/
│   │   │   ├── types.ts
│   │   │   └── slice.ts
│   │   └── 📂 ui/
│   │       ├── ContextMenu/
│   │       ├── MenuDivider/
│   │       └── MenuItem/
│   │
│   ├── 📂 todo-form/           # 🎯 ФОРМА ЗАДАЧ
│   │   ├── 📂 lib/
│   │   │   └── useTodoForm.ts
│   │   ├── 📂 model/
│   │   │   ├── types.ts
│   │   │   └── slice.ts
│   │   └── 📂 ui/
│   │       ├── QuickTodoForm/
│   │       ├── TodoForm/
│   │       └── TodoFormModal/
│   │
│   ├── 📂 storage/             # 💾 АВТОСОХРАНЕНИЕ
│   │   ├── 📂 lib/
│   │   │   └── useAutoSave.ts
│   │   ├── 📂 model/
│   │   │   └── autoSaveMiddleware.ts
│   │   └── 📂 ui/
│   │       └── StorageManager/
│   │
│   ├── 📂 canvas-dnd/          # 🖱️ DRAG & DROP
│   │   ├── 📂 lib/
│   │   │   └── useCanvasDnd.ts
│   │   ├── 📂 model/
│   │   │   ├── slice.ts
│   │   │   └── types.ts
│   │   └── 📂 ui/
│   │
│   ├── 📂 canvas-toolbar/      # 🛠️ ПАНЕЛЬ ИНСТРУМЕНТОВ
│   │   └── 📂 ui/
│   │       └── Toolbar.tsx
│   │
│   ├── 📂 properties-panel/    # ⚙️ ПАНЕЛЬ СВОЙСТВ
│   │   └── 📂 ui/
│   │       └── PropertiesPanel.tsx
│   │
│   ├── 📂 canvas-viewport/     # 🔍 ЗУМ И ПАНОРАМИРОВАНИЕ
│   │   ├── 📂 lib/
│   │   │   ├── useCanvasViewport.ts
│   │   │   ├── useEnhancedViewport.ts
│   │   │   └── useAutoPan.ts
│   │   ├── 📂 model/
│   │   │   ├── slice.ts
│   │   │   ├── types.ts
│   │   │   └── selectors.ts
│   │   └── 📂 ui/
│   │       ├── GridRenderer/
│   │       └── ZoomControls/
│   │
│   ├── 📂 project-management/  # 📁 УПРАВЛЕНИЕ ПРОЕКТАМИ
│   │   └── 📂 model/
│   │       ├── slice.ts
│   │       └── selectors.ts
│   │
│   └── 📂 selection/           # ☑️ ВЫДЕЛЕНИЕ
│       └── 📂 lib/
│           └── useSelection.ts
│
├── 📂 widgets/                 # 🧩 ГОТОВЫЕ UI БЛОКИ
│   ├── 📂 workspace-layout/    # 📐 МАКЕТ
│   │   └── 📂 ui/
│   │       └── WorkspaceLayout.tsx
│   │
│   ├── 📂 pages-workspace/     # 📄 ПАНЕЛЬ СТРАНИЦ
│   │   └── 📂 ui/
│   │       ├── PageItem/
│   │       └── PagesSidebar/
│   │
│   └── 📂 canvas-workspace/    # 🎨 ХОЛСТ
│       └── 📂 ui/
│           ├── CanvasWorkspace/
│           └── KonvaCanvasWorkspace/
│
├── 📂 processes/               # 🔄 СЛОЖНЫЕ ПРОЦЕССЫ
│   ├── 📂 canvas-actions/      # ✨ ДЕЙСТВИЯ С ХОЛСТОМ
│   │   └── 📂 lib/
│   │
│   └── 📂 canvas-sync/         # 🔄 СИНХРОНИЗАЦИЯ
│       └── 📂 lib/
│           └── canvasSyncMiddleware/
│
└── 📂 shared/                  # 🤝 ОБЩИЙ КОД
    ├── 📂 api/                  # 🌐 API
    │   └── 📂 storage/
    │       └── 📂 jsonStorage/
    │           ├── localStorage.ts
    │           └── todoStorage.ts
    │
    ├── 📂 lib/                  # 🧰 УТИЛИТЫ
    │   ├── 📂 geometry/
    │   ├── 📂 dom/
    │   └── 📂 state/
    │       ├── store.ts
    │       └── index.ts
    │
    ├── 📂 ui/                    # 🎨 ОБЩИЕ КОМПОНЕНТЫ
    │   ├── 📂 kit/
    │   │   ├── 📂 Modal/
    │   │   │   ├── DraggableModal.tsx
    │   │   │   ├── UniversalModal.tsx
    │   │   │   ├── useUniversalModal.ts
    │   │   │   └── AppModal.tsx
    │   │   ├── 📂 DatePicker/
    │   │   └── 📂 ImagePreview/
    │   │       └── ImagePreview.tsx
    │   └── 📂 icons/
    │
    └── 📂 config/               # ⚙️ КОНФИГУРАЦИЯ
        ├── routes.ts
        └── env.ts</code></pre>

<hr />

<h2>🎯 Назначение каждого слоя</h2>

<h3>1️⃣ <strong>app/</strong> — Фундамент приложения</h3>
<p><strong>Назначение:</strong> Инициализация, провайдеры, глобальные настройки</p>

<pre><code>app/
├── providers/     # Обертки для библиотек (Redux, Theme, DnD)
├── styles/        # Глобальные CSS переменные
└── App.tsx        # Корневой компонент</code></pre>

<h3>2️⃣ <strong>entities/</strong> — Бизнес-сущности</h3>
<p><strong>Назначение:</strong> Описание бизнес-логики и данных</p>

<pre><code>entities/{entity}/
├── model/    # Типы, интерфейсы, DTO
├── lib/      # Чистые функции, утилиты
└── ui/       # Базовые компоненты (опционально)</code></pre>

<p><strong>Сущности проекта:</strong></p>
<ul>
  <li><code>todo/</code> — задачи</li>
  <li><code>canvas/</code> — холсты и листы</li>
  <li><code>image/</code> — изображения</li>
</ul>

<h3>3️⃣ <strong>features/</strong> — Пользовательские сценарии</h3>
<p><strong>Назначение:</strong> Реализация конкретных функций</p>

<pre><code>features/{feature}/
├── lib/     # React хуки, логика
├── model/   # Redux slice, типы, селекторы
└── ui/      # Компоненты фичи</code></pre>

<p><strong>Основные фичи:</strong></p>
<ul>
  <li><code>todo-nodes/</code> — работа с задачами на холсте</li>
  <li><code>image-upload/</code> — загрузка и работа с изображениями</li>
  <li><code>canvas-viewport/</code> — зум и панорамирование</li>
  <li><code>canvas-dnd/</code> — перетаскивание элементов</li>
  <li><code>project-management/</code> — управление проектами</li>
</ul>

<h3>4️⃣ <strong>widgets/</strong> — Композитные UI блоки</h3>
<p><strong>Назначение:</strong> Сборка нескольких features в готовые блоки</p>

<pre><code>widgets/{widget}/
└── ui/     # Компоненты</code></pre>

<p><strong>Виджеты:</strong></p>
<ul>
  <li><code>workspace-layout/</code> — макет рабочей области</li>
  <li><code>canvas-workspace/</code> — холст с инструментами</li>
  <li><code>pages-workspace/</code> — панель страниц</li>
</ul>

<h3>5️⃣ <strong>processes/</strong> — Сложные бизнес-процессы</h3>
<p><strong>Назначение:</strong> Координация нескольких features</p>

<pre><code>processes/{process}/
└── lib/     # Логика процессов</code></pre>

<p><strong>Процессы:</strong></p>
<ul>
  <li><code>canvas-sync/</code> — синхронизация холстов</li>
  <li><code>canvas-actions/</code> — комплексные действия</li>
</ul>

<h3>6️⃣ <strong>shared/</strong> — Общий код</h3>
<p><strong>Назначение:</strong> Переиспользуемые утилиты и компоненты</p>

<pre><code>shared/
├── api/          # HTTP клиент, работа с хранилищем
├── lib/          # Утилиты (geometry, dom, state)
├── ui/kit/       # Дизайн-система (Modal, DatePicker, ImagePreview)
├── ui/icons/     # Иконки
└── config/       # Конфигурации (routes, env)</code></pre>

<hr />

<h2>🔄 Правила зависимостей</h2>

<pre><code>app/ ← processes/ ← features/ ← entities/ ← shared/
       widgets/ могут зависеть от всех слоев</code></pre>

<p><strong>Основное правило:</strong> Зависимости могут идти только от более высоких слоев к более низким.</p>

<p>❌ <strong>Неправильно:</strong> <code>features/</code> импортирует из <code>widgets/</code><br />
✅ <strong>Правильно:</strong> <code>widgets/</code> импортирует из <code>features/</code></p>

<hr />

<h2>🚀 Как добавить новую функциональность</h2>

<h3>Пример: Добавление системы комментариев</h3>

<p><strong>1. Создайте сущность</strong> (если ее нет):</p>

<pre><code>mkdir -p src/entities/comment/{model,lib,ui}</code></pre>

<p><strong>2. Создайте feature</strong> для работы с комментариями:</p>

<pre><code>mkdir -p src/features/comments/{lib,model,ui}</code></pre>

<p><strong>3. Создайте widget</strong> для отображения (если нужно):</p>

<pre><code>mkdir -p src/widgets/comments-panel/{lib,model,ui}</code></pre>

<p><strong>4. Настройте зависимости:</strong></p>
<ul>
  <li><code>features/comments/</code> зависит от <code>entities/comment/</code></li>
  <li><code>widgets/comments-panel/</code> зависит от <code>features/comments/</code></li>
</ul>

<hr />

<h2>📦 Стек технологий</h2>

<h3>Основные</h3>
<table>
  <thead>
    <tr>
      <th>Технология</th>
      <th>Назначение</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>React 18</td>
      <td>UI библиотека</td>
    </tr>
    <tr>
      <td>TypeScript</td>
      <td>Типизация</td>
    </tr>
    <tr>
      <td>Redux Toolkit</td>
      <td>Управление состоянием</td>
    </tr>
    <tr>
      <td>React-Konva</td>
      <td>Работа с Canvas</td>
    </tr>
    <tr>
      <td>@dnd-kit</td>
      <td>Drag & Drop</td>
    </tr>
  </tbody>
</table>

<h3>Утилиты</h3>
<table>
  <thead>
    <tr>
      <th>Технология</th>
      <th>Назначение</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>date-fns</td>
      <td>Работа с датами</td>
    </tr>
    <tr>
      <td>nanoid</td>
      <td>Генерация ID</td>
    </tr>
    <tr>
      <td>clsx</td>
      <td>Условные CSS классы</td>
    </tr>
  </tbody>
</table>

<hr />

<h2>🛠️ Команды разработки</h2>

<pre><code># Запуск в режиме разработки
npm run dev

# Сборка для production
npm run build

# Проверка TypeScript типов
npm run type-check

# Линтинг кода
npm run lint

# Форматирование кода
npm run format</code></pre>

<hr />

<h2>📊 Статус реализации</h2>

<table>
  <thead>
    <tr>
      <th>Компонент</th>
      <th>Статус</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Задачи (Todo)</td>
      <td>✅ Готово</td>
    </tr>
    <tr>
      <td>Холст (Canvas)</td>
      <td>✅ Готово</td>
    </tr>
    <tr>
      <td>Зум и панорамирование</td>
      <td>✅ Готово</td>
    </tr>
    <tr>
      <td>Drag & Drop задач</td>
      <td>✅ Готово</td>
    </tr>
    <tr>
      <td>Загрузка изображений</td>
      <td>✅ Готово</td>
    </tr>
    <tr>
      <td>Drag & Drop изображений</td>
      <td>✅ Готово</td>
    </tr>
    <tr>
      <td>Ресайз изображений</td>
      <td>✅ Готово</td>
    </tr>
    <tr>
      <td>Управление проектами</td>
      <td>✅ Готово</td>
    </tr>
    <tr>
      <td>Автосохранение</td>
      <td>✅ Готово</td>
    </tr>
    <tr>
      <td>Konva.js версия</td>
      <td>🚧 В разработке</td>
    </tr>
  </tbody>
</table>

<hr />

<h2>👨‍💻 Для разработчиков</h2>

<h3>Ключевые концепции для понимания</h3>

<ol>
  <li>
    <strong>Система координат</strong> — всегда конвертируйте экранные координаты в canvas координаты через <code>convertScreenToCanvas</code>
  </li>
  <li>
    <strong>Состояние</strong> — используйте селекторы для доступа к данным, никогда не обращайтесь к store напрямую в компонентах
  </li>
  <li>
    <strong>Производительность</strong> — при частых обновлениях (drag) используйте throttle или requestAnimationFrame
  </li>
  <li>
    <strong>Архитектура</strong> — соблюдайте правила зависимостей, не импортируйте из верхних слоев в нижние
  </li>
</ol>

<h3>Полезные хуки</h3>

<table>
  <thead>
    <tr>
      <th>Хук</th>
      <th>Назначение</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>useCanvasDnd()</code></td>
      <td>Базовый Drag & Drop для любых элементов</td>
    </tr>
    <tr>
      <td><code>useEnhancedViewport()</code></td>
      <td>Зум, панорамирование, работа с viewport</td>
    </tr>
    <tr>
      <td><code>useImageDrop()</code></td>
      <td>Обработка перетаскивания изображений из проводника</td>
    </tr>
    <tr>
      <td><code>useAutoPan()</code></td>
      <td>Автоматическое панорамирование при перетаскивании к краю</td>
    </tr>
  </tbody>
</table>

<hr />

<p align="center">
  <sub>Документация поддерживается в актуальном состоянии командой разработки.</sub><br />
  <sub>Последнее обновление: 2026</sub>
</p>
