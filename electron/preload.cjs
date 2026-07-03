"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const localeArg = process.argv.find((arg) => arg.startsWith("--dota-cd-locale="));
const locale = localeArg ? localeArg.split("=").slice(1).join("=") : "";

contextBridge.exposeInMainWorld("dotaCdDesktop", {
  isDesktop: true,
  locale,
  onHotkey(callback) {
    if (typeof callback !== "function") return () => {};

    const listener = (_event, payload) => {
      callback(payload);
    };

    ipcRenderer.on("global-hotkey", listener);
    return () => {
      ipcRenderer.removeListener("global-hotkey", listener);
    };
  },
  writeClipboard(text) {
    return ipcRenderer.invoke("clipboard:write", text);
  },
  listVoicePackFiles() {
    return ipcRenderer.invoke("voice-pack:list");
  },
  openVoicePackFolder() {
    return ipcRenderer.invoke("voice-pack:open");
  },
});
