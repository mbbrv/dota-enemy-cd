"use strict";

const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu } = require("electron");
const path = require("node:path");

const HOTKEY_KEYS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
