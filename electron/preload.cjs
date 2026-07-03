"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dotaCdDesktop", {
  isDesktop: true,
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
});
