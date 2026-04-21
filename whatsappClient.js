const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger = require('./logger');
const path = require('path');

let qrCodeDataUrl = null;
let clientStatus = 'disconnected'; // disconnected | qr_pending | connected
let connectedInfo = null;

// Callbacks that other modules can register
const eventHandlers = {
  onMessage: [],
  onStatusUpdate: [],
  onReady: [],
  onQR: [],
  onDisconnected: [],
};

function on(event, handler) {
  if (eventHandlers[event]) {
    eventHandlers[event].push(handler);
  }
}

function emit(event, ...args) {
  if (eventHandlers[event]) {
    eventHandlers[event].forEach((h) => h(...args));
  }
}

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, '../data/.wwebjs_auth'),
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
});

client.on('qr', async (qr) => {
  clientStatus = 'qr_pending';
  logger.info('QR code received — scan with WhatsApp to authenticate');
  try {
    qrCodeDataUrl = await qrcode.toDataURL(qr);
  } catch (err) {
    logger.error('Failed to generate QR data URL: ' + err.message);
  }
  emit('onQR', qrCodeDataUrl);
});

client.on('ready', async () => {
  clientStatus = 'connected';
  qrCodeDataUrl = null;
  const info = client.info;
  connectedInfo = {
    name: info.pushname,
    number: info.wid.user,
    platform: info.platform,
  };
  logger.info(`WhatsApp connected as ${connectedInfo.name} (+${connectedInfo.number})`);
  emit('onReady', connectedInfo);
});

client.on('authenticated', () => {
  logger.info('WhatsApp session authenticated successfully');
});

client.on('auth_failure', (msg) => {
  clientStatus = 'disconnected';
  logger.error('Authentication failed: ' + msg);
});

client.on('disconnected', (reason) => {
  clientStatus = 'disconnected';
  connectedInfo = null;
  logger.warn('WhatsApp disconnected: ' + reason);
  emit('onDisconnected', reason);
  // Auto-reconnect after 10 seconds
  setTimeout(() => {
    logger.info('Attempting to reconnect...');
    client.initialize().catch((err) => logger.error('Reconnect failed: ' + err.message));
  }, 10000);
});

client.on('message', (msg) => {
  emit('onMessage', msg);
});

client.on('message_create', (msg) => {
  // Fires for messages sent by the user too — used for context tracking
  emit('onMessage', msg);
});

// Status update events
client.on('status_update', (status) => {
  emit('onStatusUpdate', status);
});

// Also listen to contact status updates (when someone updates their status)
client.on('contact_changed', (contact) => {
  // Not used directly but logged
});

function getStatus() {
  return { status: clientStatus, info: connectedInfo };
}

function getQRCode() {
  return qrCodeDataUrl;
}

function getClient() {
  return client;
}

async function initialize() {
  logger.info('Initializing WhatsApp client...');
  await client.initialize();
}

module.exports = { initialize, getClient, getStatus, getQRCode, on };
