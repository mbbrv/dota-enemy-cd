"use strict";

const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const HOTKEY_KEYS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const VOICE_PACK_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a"]);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#101312",
    title: "Dota Enemy CD",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
}

function sendHotkey(action, key) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("global-hotkey", { action, key });
}

function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();

  for (const key of HOTKEY_KEYS) {
    globalShortcut.register(`CommandOrControl+Alt+${key}`, () => {
      sendHotkey("start", key);
    });

    globalShortcut.register(`CommandOrControl+Alt+Shift+${key}`, () => {
      sendHotkey("copy", key);
    });
  }
}

ipcMain.handle("clipboard:write", (_event, text) => {
  clipboard.writeText(String(text ?? ""));
  return true;
});

async function getVoicePackDirectory() {
  const directory = path.join(app.getPath("userData"), "voice-pack");
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

async function listVoicePackFiles() {
  const directory = await getVoicePackDirectory();
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && VOICE_PACK_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      name: entry.name,
      src: pathToFileURL(path.join(directory, entry.name)).href,
    }));

  return { directory, files };
}

ipcMain.handle("voice-pack:list", () => listVoicePackFiles());

ipcMain.handle("voice-pack:open", async () => {
  const directory = await getVoicePackDirectory();
  const error = await shell.openPath(directory);
  return { directory, ok: !error, error };
});

app.whenReady().then(() => {
  createWindow();
  registerGlobalShortcuts();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      registerGlobalShortcuts();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
