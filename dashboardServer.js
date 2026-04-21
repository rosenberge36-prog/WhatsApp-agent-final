const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const logger = require('./logger');
const { getStatus, getQRCode, on } = require('./whatsappClient');
const { getStats, getActivityLog } = require('./messageHandler');
const { loadConfig, saveConfig } = require('./aiBrain');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../dashboard/public')));

// ─── REST API ──────────────────────────────────────────────────────────────

app.get('/api/status', (req, res) => {
  res.json({
    ...getStatus(),
    stats: getStats(),
  });
});

app.get('/api/qr', (req, res) => {
  const qr = getQRCode();
  if (qr) {
    res.json({ qr });
  } else {
    res.json({ qr: null });
  }
});

app.get('/api/activity', (req, res) => {
  res.json(getActivityLog());
});

app.get('/api/chats', async (req, res) => {
  try {
    const client = require('./whatsappClient').getClient();
    const chats = await client.getChats();
    const chatData = chats.map(c => ({
      id: c.id._serialized,
      name: c.name,
      isGroup: c.isGroup,
      unreadCount: c.unreadCount
    }));
    res.json(chatData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/config', (req, res) => {
  res.json(loadConfig());
});

app.post('/api/config', (req, res) => {
  const newConfig = req.body;
  const saved = saveConfig(newConfig);
  if (saved) {
    res.json({ success: true, config: newConfig });
    io.emit('config_updated', newConfig);
  } else {
    res.status(500).json({ success: false, error: 'Failed to save config' });
  }
});

// ─── Socket.IO real-time events ────────────────────────────────────────────

io.on('connection', (socket) => {
  logger.info('Dashboard client connected');

  // Send current state immediately on connect
  socket.emit('status_update', { ...getStatus(), stats: getStats() });

  const qr = getQRCode();
  if (qr) {
    socket.emit('qr_code', { qr });
  }

  socket.on('disconnect', () => {
    logger.info('Dashboard client disconnected');
  });
});

// Register WhatsApp event hooks to broadcast to dashboard
on('onQR', (qr) => {
  io.emit('qr_code', { qr });
});

on('onReady', (info) => {
  io.emit('status_update', { status: 'connected', info, stats: getStats() });
});

on('onDisconnected', (reason) => {
  io.emit('status_update', { status: 'disconnected', info: null, reason });
});

// Broadcast activity log updates every 3 seconds
setInterval(() => {
  io.emit('activity_update', {
    log: getActivityLog(),
    stats: getStats(),
  });
}, 3000);

function start(port = 3000) {
  server.listen(port, () => {
    logger.info(`Dashboard running at http://localhost:${port}`);
  });
}

module.exports = { start, io };
