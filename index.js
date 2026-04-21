require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const OpenAI = require('openai');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const cron = require('node-cron');

// --- 1. CONFIGURATION & LOGGER ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}] ${message}`)
  ),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'logs/agent.log' })],
});

const configPath = path.join(__dirname, '../data/agent-config.json');
let config = {
  ownerName: 'the owner',
  personality: 'friendly, casual, and helpful',
  language: 'auto-detect',
  autoReplyEnabled: true,
  whitelistedContacts: [],
  features: {
    statusReactions: true,
    deepMemory: true,
    proactiveBriefs: false,
    expenseTracking: false
  },
  customRules: []
};

function loadConfig() {
  if (fs.existsSync(configPath)) {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  }
}
function saveConfig() {
  if (!fs.existsSync(path.dirname(configPath))) fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
loadConfig();

// --- 2. AI BRAIN (OPENAI) ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
});

async function getChatContext(chat, limit = 50) {
  const messages = await chat.fetchMessages({ limit });
  return messages.map(m => `${m.fromMe ? 'Me' : (m._data.notifyName || 'Contact')}: ${m.body}`).join('\n');
}

// --- 3. NATURAL LANGUAGE COMMAND PROCESSOR ---
async function processMasterCommand(msg, chat) {
  const prompt = `You are the Master Controller for a WhatsApp AI Agent. 
The user is talking to you in natural language to change their settings.
Current Config: ${JSON.stringify(config)}

User Request: "${msg.body}"

Available Actions:
- enable_chat: Enable auto-reply for this specific contact/group.
- disable_chat: Disable auto-reply for this specific contact/group.
- set_personality: Change how the AI talks.
- set_owner_name: Change how the AI refers to the user.
- toggle_feature: Turn on/off (statusReactions, deepMemory, proactiveBriefs, expenseTracking).
- list_features: Show what the agent can do and current status.
- general_chat: Just a normal conversation with the master.

Respond in JSON format: { "action": "action_name", "value": "optional_value", "reply": "A natural response to the user confirming the change" }`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4.1-mini',
      messages: [{ role: 'system', content: prompt }, { role: 'user', content: msg.body }],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    if (result.action === 'enable_chat') {
      if (!config.whitelistedContacts.includes(chat.id._serialized)) config.whitelistedContacts.push(chat.id._serialized);
    } else if (result.action === 'disable_chat') {
      config.whitelistedContacts = config.whitelistedContacts.filter(id => id !== chat.id._serialized);
    } else if (result.action === 'set_personality') {
      config.personality = result.value;
    } else if (result.action === 'set_owner_name') {
      config.ownerName = result.value;
    } else if (result.action === 'toggle_feature') {
      const feat = result.value;
      if (config.features.hasOwnProperty(feat)) config.features[feat] = !config.features[feat];
    }
    
    saveConfig();
    await msg.reply(result.reply);
    return true;
  } catch (err) {
    logger.error('Command processing failed: ' + err.message);
    return false;
  }
}

// --- 4. MAIN WHATSAPP CLIENT ---
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '../data/.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  logger.info('QR Code received. Scan to connect.');
});

client.on('ready', () => {
  logger.info('WhatsApp Agent is READY and LIVE!');
});

client.on('message', async msg => {
  const chat = await msg.getChat();
  const isMasterMessage = msg.fromMe || msg.from === client.info.wid._serialized;

  // If the owner is talking to the agent, treat it as a command/instruction
  if (isMasterMessage) {
    if (msg.body.toLowerCase().includes('agent') || msg.body.startsWith('!')) {
      await processMasterCommand(msg, chat);
      return;
    }
    return;
  }

  // Auto-reply logic for whitelisted contacts
  if (config.autoReplyEnabled && config.whitelistedContacts.includes(msg.from)) {
    const context = await getChatContext(chat, config.features.deepMemory ? 50 : 10);
    
    const replyPrompt = `You are an AI assistant for ${config.ownerName}.
Personality: ${config.personality}
History:
${context}

Latest Message: "${msg.body}"
Reply naturally and concisely in the same language as the user.`;

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4.1-mini',
        messages: [{ role: 'system', content: replyPrompt }, { role: 'user', content: msg.body }],
        max_tokens: 200
      });

      const reply = completion.choices[0].message.content.trim();
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000)); // Human delay
      await msg.reply(reply);
      logger.info(`Replied to ${msg.from}: ${reply.substring(0, 50)}...`);
    } catch (err) {
      logger.error('Reply generation failed: ' + err.message);
    }
  }

  // Status reactions
  if (config.features.statusReactions && msg.from === 'status@broadcast') {
    await msg.react(Math.random() > 0.5 ? '👍' : '❤️');
  }
});

// --- 5. PROACTIVE FEATURES (CRON) ---
cron.schedule('0 8 * * *', async () => {
  if (config.features.proactiveBriefs) {
    logger.info('Running morning brief...');
    // Logic to send a morning summary to the owner would go here
  }
});

// --- 6. DASHBOARD (MINIMAL) ---
const app = express();
const server = http.createServer(app);
app.get('/', (req, res) => res.send('WhatsApp Agent is Running. Check your WhatsApp for control.'));
server.listen(process.env.PORT || 3000, () => logger.info('Server running on port ' + (process.env.PORT || 3000)));

client.initialize();
