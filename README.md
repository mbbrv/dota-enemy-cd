# Dota Enemy CD

Manual cooldown tracker for Dota 2 enemies. Use it on a second monitor to track important enemy spells, items, and buyback timers.

**Disclaimer:** the app does not read or modify Dota 2 memory, code, packets, logs, screen pixels, or game state. All timers are started manually by the player.

## English

### How To Start

Download the latest Windows `.exe` build from the project page and run it.

If you are running from the project folder, use:

```powershell
npm run desktop
```

### Setup Before A Match

1. Open `Setup` mode.
2. Pick enemy heroes from the hero preset dropdowns.
3. Add items/resources to each hero with `+ item/resource`.
4. Edit cooldowns if needed.
5. Assign a key to each spell or item you want to track.

Useful add-ons:

- Buyback
- Black King Bar
- Refresher Orb
- Aeon Disk

### During A Match

1. Press `Start match` when the game begins.
2. Switch to `Match` mode.
3. When an enemy uses a tracked spell/item, start its timer manually.
4. The app shows remaining cooldown and the match time when it should be ready.

### Hotkeys

- `Ctrl+Alt+key` starts the timer assigned to that key.
- `Ctrl+Alt+Shift+key` copies a short chat message for that timer.

Example copied message:

```text
Black Hole cd 1:42 ready 12:34
```

### Notes

- Roshan/Aegis and Blink Dagger are intentionally not included.
- Cooldowns are editable because Dota patches can change values.
- Keep the app open while playing if you want sound alerts and global hotkeys.

## Русский

**Дисклеймер:** приложение не читает и не меняет память, код, пакеты, логи, пиксели экрана или game state Dota 2. Все таймеры запускает игрок вручную.

### Как Запустить

Скачай последнюю Windows `.exe` сборку со страницы проекта и запусти ее.

Если запускаешь из папки проекта:

```powershell
npm run desktop
```

### Настройка Перед Матчем

1. Открой режим `Настройка`.
2. Выбери вражеских героев через выпадающие списки пресетов.
3. Добавь предметы/ресурсы к каждому герою через `+ item/resource`.
4. При необходимости поправь кулдауны.
5. Назначь клавишу каждому скиллу или предмету, который хочешь отслеживать.

Полезные добавки:

- Buyback
- Black King Bar
- Refresher Orb
- Aeon Disk

### Во Время Матча

1. Нажми `Начать матч`, когда начинается игра.
2. Переключись в режим `Матч`.
3. Когда враг использует отслеживаемый скилл или предмет, запусти таймер вручную.
4. Приложение покажет оставшийся кулдаун и игровое время, когда кнопка должна быть готова.

### Хоткеи

- `Ctrl+Alt+клавиша` запускает таймер, назначенный на эту клавишу.
- `Ctrl+Alt+Shift+клавиша` копирует короткое сообщение для чата.

Пример сообщения:

```text
Black Hole cd 1:42 ready 12:34
```

### Заметки

- Roshan/Aegis и Blink Dagger намеренно не добавлены.
- Кулдауны можно редактировать, потому что патчи Dota могут менять значения.
- Держи приложение открытым во время игры, если нужны звуковые сигналы и глобальные хоткеи.
