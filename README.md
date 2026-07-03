# Dota Enemy CD

Manual enemy cooldown tracker for Dota 2, designed for a second monitor.

This app does not read Dota 2 memory, packets, logs, screen pixels, or game state. Timers are started manually by the player.

## English

### Desktop App

Primary run mode is the Electron desktop app:

```powershell
npm install
npm run desktop
```

Desktop global hotkeys:

- `Ctrl+Alt+key` starts the timer assigned to that key.
- `Ctrl+Alt+Shift+key` copies the short chat text for that timer.
- The `Desktop` indicator in the top bar means global hotkeys are handled by Electron.

The desktop app registers hotkeys through Electron's system API and writes to the clipboard through the Electron main process. It does not interact with the Dota 2 process.

### CI Build

On every push to `main`, GitHub Actions builds a portable Windows `.exe`.

To download the build:

1. Open the repository on GitHub.
2. Go to `Actions`.
3. Open the latest `Build Windows EXE` run.
4. Download the `DotaEnemyCD-windows-portable` artifact.

The same build can be created locally:

```powershell
npm run pack:win
```

### Browser Fallback

You can still open `index.html` directly in a browser and move it to a second monitor. In browser mode, normal hotkeys only work while the browser window is focused.

The legacy `legacy/hotkeys.ps1` bridge is kept as a temporary browser fallback, but Electron is the main path.

### Usage Notes

- In `Setup` mode, choose enemy hero presets, edit cooldowns, and assign keys.
- Presets live in `presets.js`: heroes are separate from item/resource add-ons.
- Buyback is added to a specific hero through `+ item/resource`, with a 480 second cooldown.
- In `Match` mode, press `Start match` to start the in-game clock.
- Active timers show when the ability will be ready by match time.
- The copy button copies short English chat text, for example `Black Hole cd 1:42 ready 12:34`.
- Roshan/Aegis and Blink Dagger are intentionally not included.
- Preset cooldowns are editable placeholders; verify values against the current Dota patch.

## Русский

### Desktop-приложение

Основной способ запуска - Electron desktop app:

```powershell
npm install
npm run desktop
```

Глобальные хоткеи в desktop-версии:

- `Ctrl+Alt+клавиша` запускает таймер, назначенный на эту клавишу.
- `Ctrl+Alt+Shift+клавиша` копирует короткий текст для чата.
- Индикатор `Desktop` в верхней панели означает, что глобальные хоткеи обрабатываются через Electron.

Desktop-версия регистрирует хоткеи через системный API Electron и пишет в clipboard через main process. Она не взаимодействует с процессом Dota 2.

### CI-сборка

При каждом push в `main` GitHub Actions собирает portable Windows `.exe`.

Где скачать сборку:

1. Открой репозиторий на GitHub.
2. Перейди в `Actions`.
3. Открой последний run `Build Windows EXE`.
4. Скачай artifact `DotaEnemyCD-windows-portable`.

Такую же сборку можно сделать локально:

```powershell
npm run pack:win
```

### Browser fallback

Можно открыть `index.html` напрямую в браузере и перенести окно на второй монитор. В браузерном режиме обычные хоткеи работают только пока окно браузера в фокусе.

Legacy-бридж `legacy/hotkeys.ps1` оставлен как временный fallback для браузерного режима, но основной путь - Electron.

### Заметки по использованию

- В режиме `Настройка` выбери пресеты героев, поправь кд и назначь клавиши.
- База пресетов лежит в `presets.js`: герои отдельно, предметы/ресурсы отдельно в `addons`.
- Buyback добавляется к конкретному герою через `+ item/resource`, кулдаун 480 секунд.
- В режиме `Матч` нажми `Начать матч`, чтобы включить игровые часы.
- Активный таймер показывает, когда скилл будет готов по игровому времени матча.
- Кнопка copy копирует короткий английский текст для чата, например `Black Hole cd 1:42 ready 12:34`.
- Roshan/Aegis и Blink Dagger намеренно не добавлены.
- Стартовые кулдауны - редактируемые заготовки; сверяй значения с текущим патчем Dota.
