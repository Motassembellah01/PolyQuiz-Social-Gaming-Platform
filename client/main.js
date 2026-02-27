const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { app, ipcMain, BrowserWindow } = require('electron');

if (process.env.ELECTRON_DISABLE_GPU === '1') {
    // Emergency fallback for machines with broken GPU drivers.
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
}

// Keep default fast GPU path and silence noisy Chromium GPU probe logs.
app.commandLine.appendSwitch('log-level', '3');

const instanceId = `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
app.setPath('userData', path.join(app.getPath('userData'), instanceId));
app.name = `PolyQuiz-${instanceId}`;

const { createAuthWindow, createLogoutWindow } = require('./electron/auth-process');
const { createAppWindow } = require('./electron/app-process');
const { createChatWin } = require('./electron/chat-process');
const authService = require('./electron/auth-service');

async function showWindow() {
    try {
        await authService.refreshTokens();
        createAppWindow();
    } catch (err) {
        createAuthWindow();
    }
}

app.on('ready', () => {
    // Handle IPC messages from the renderer process.
    ipcMain.handle('auth:get-profile', authService.getProfile);
    ipcMain.on('auth:log-out', () => {
        BrowserWindow.getAllWindows().forEach((window) => window.close());
        createLogoutWindow();
    });
    ipcMain.on('auth:log-in', async () => {
        BrowserWindow.getAllWindows().forEach((window) => window.close());
        createLogoutWindow();
    });
    ipcMain.handle('auth:get-access-token', authService.getAccessToken);
    ipcMain.handle('app:get-server-url', () => process.env.SERVER_URL || 'http://localhost:3000');
    ipcMain.handle('window:open-chat-window', () => {
        createChatWin();
    });
    showWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.quit();
});
