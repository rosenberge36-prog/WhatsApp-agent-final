const logger = require('./logger');
const { generateReply, loadConfig, saveConfig } = require('./aiBrain');
const { handleStatusMessage } = require('./statusReactor');
const { getClient } = require('./whatsappClient');

// Track recently replied chats to avoid double-replies
const recentReplies = new Map();
const REPLY_COOLDOWN_MS = 5000; // 5 seconds cooldown per chat

// Stats tracking
const stats = {
  messagesReceived: 0,
  repliesSent: 0,
  statusReactions: 0,
  errors: 0,
  startTime: Date.now(),
};

// Activity log (last 50 events)
const activityLog = [];

function addActivity(type, description, contact = '') {
  const entry = {
    type,       // 'reply' | 'status_reaction' | 'error' | 'info'
    description,
    contact,
    timestamp: new Date().toISOString(),
  };
  activityLog.unshift(entry);
  if (activityLog.length > 50) activityLog.pop();
  return entry;
}

/**
 * Main message handler — called for every incoming message
 */
async function handleMessage(msg) {
  const client = getClient();
  const config = loadConfig();

  // Always count received messages
  if (!msg.fromMe) {
    stats.messagesReceived++;
  }

  // --- MASTER MODE: Command System ---
  // You can message your own agent or send commands from a specific chat
  if (msg.body.startsWith('!')) {
    const isOwner = msg.fromMe || msg.from === client.info.wid._serialized;
    if (isOwner) {
      const parts = msg.body.slice(1).split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      logger.info(`Master Command: ${command} ${args.join(' ')}`);

      if (command === 'enable') {
        const chat = await msg.getChat();
        const contactId = chat.id._serialized;
        if (!config.whitelistedContacts.includes(contactId)) {
          config.whitelistedContacts.push(contactId);
          saveConfig(config);
          await msg.reply(`✅ AI Auto-reply ENABLED for this chat.`);
        } else {
          await msg.reply(`ℹ️ AI Auto-reply is already enabled.`);
        }
        return;
      }

      if (command === 'disable') {
        const chat = await msg.getChat();
        const contactId = chat.id._serialized;
        config.whitelistedContacts = config.whitelistedContacts.filter(id => id !== contactId);
        saveConfig(config);
        await msg.reply(`❌ AI Auto-reply DISABLED for this chat.`);
        return;
      }

      if (command === 'set') {
        const key = args[0];
        const value = args.slice(1).join(' ');
        if (key === 'personality') {
          config.personality = value;
          saveConfig(config);
          await msg.reply(`🎨 Personality set to: ${value}`);
        } else if (key === 'name') {
          config.ownerName = value;
          saveConfig(config);
          await msg.reply(`👤 Owner name set to: ${value}`);
        }
        return;
      }

      if (command === 'status') {
        const currentStats = getStats();
        const uptimeStr = `${Math.floor(currentStats.uptime / 3600)}h ${Math.floor((currentStats.uptime % 3600) / 60)}m`;
        await msg.reply(`🤖 *Agent Status*\n- Messages: ${currentStats.messagesReceived}\n- AI Replies: ${currentStats.repliesSent}\n- Reactions: ${currentStats.statusReactions}\n- Uptime: ${uptimeStr}\n- Whitelisted Chats: ${config.whitelistedContacts.length}`);
        return;
      }
    }
  }
  // --- END MASTER MODE ---

  // Handle status updates separately
  if (msg.from === 'status@broadcast') {
    try {
      await handleStatusMessage(client, msg);
      stats.statusReactions++;
      addActivity('status_reaction', `Reacted to status from ${msg._data.notifyName || 'unknown'}`, msg._data.notifyName || msg.from);
    } catch (err) {
      stats.errors++;
      logger.error('Status handling error: ' + err.message);
    }
    return;
  }

  // Skip own messages and non-text
  if (msg.fromMe) return;
  if (!msg.body || msg.body.trim() === '') return;

  // Cooldown check — avoid replying too fast to the same chat
  const chatId = msg.from;
  const lastReply = recentReplies.get(chatId);
  if (lastReply && Date.now() - lastReply < REPLY_COOLDOWN_MS) {
    logger.info(`Cooldown active for ${chatId}, skipping reply`);
    return;
  }

  // Check if auto-reply is enabled
  if (!config.autoReplyEnabled) {
    logger.info('Auto-reply is disabled, skipping');
    return;
  }

  try {
    // Get the chat object for history
    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const contactName = contact.pushname || contact.name || msg.from;

    logger.info(`New message from ${contactName}: "${msg.body.substring(0, 60)}"`);

    // Add delay to seem more human (configurable)
    const delay = config.autoReplyDelay || 3000;
    const jitter = Math.random() * 2000; // Add up to 2s of random jitter
    await new Promise((resolve) => setTimeout(resolve, delay + jitter));

    // Generate AI reply
    const reply = await generateReply(msg, chat);

    if (reply) {
      // Send typing indicator
      await chat.sendStateTyping();
      await new Promise((resolve) => setTimeout(resolve, 1000 + reply.length * 30));
      await chat.clearState();

      // Send the reply
      await msg.reply(reply);

      stats.repliesSent++;
      recentReplies.set(chatId, Date.now());

      logger.info(`Replied to ${contactName}: "${reply.substring(0, 60)}"`);
      addActivity('reply', `Replied to "${msg.body.substring(0, 40)}..." → "${reply.substring(0, 40)}..."`, contactName);
    }

  } catch (err) {
    stats.errors++;
    logger.error(`Message handling error: ${err.message}`);
    addActivity('error', `Error handling message: ${err.message}`);
  }
}

function getStats() {
  return {
    ...stats,
    uptime: Math.floor((Date.now() - stats.startTime) / 1000),
  };
}

function getActivityLog() {
  return activityLog;
}

module.exports = { handleMessage, getStats, getActivityLog, addActivity };
