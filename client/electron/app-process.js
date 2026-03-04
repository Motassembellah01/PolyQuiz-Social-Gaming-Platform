const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
const authService = require('./auth-service');

let mainWindow;
let isChatClosedListenerRegistered = false;

function handleChatClosed() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return;
    }
    mainWindow.webContents.send('fromMain', 'Chat fermé');
}

function createAppWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
            enableRemoteModule: true,
            webSecurity: false,
        },
    });

    const indexPath = `file://${path.join(__dirname, '../dist/client/browser/index.html')}`;
    mainWindow.loadURL(indexPath);

    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
    });

    mainWindow.on('closed', async () => {
        mainWindow = null;
        try {
            const accessToken = authService.getAccessToken();
            if (!accessToken) return;
            const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
            const response = await axios.delete(
                `${serverUrl}/api/sessions/${authService.getProfile().sub}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            );
            console.log('Session deleted successfully', response.data);
        } catch (error) {
            console.error('Failed to delete session', error);
        }
    });

    if (!isChatClosedListenerRegistered) {
        ipcMain.on('chat-closed', handleChatClosed);
        isChatClosedListenerRegistered = true;
    }
}

function destroyAppWin() {
    if (!mainWindow) return;
    mainWindow.close();
    mainWindow = null;
}

module.exports = {
    createAppWindow,
    destroyAppWin,
};
