const OpenAI = require('openai');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
});

// Load agent config (personality, rules, etc.)
const configPath = path.join(__dirname, '../data/agent-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    logger.error('Failed to load agent config: ' + err.message);
  }
  return getDefaultConfig();
}

function getDefaultConfig() {
  return {
    ownerName: 'the owner',
    personality: 'friendly, casual, and helpful',
    language: 'same language as the person messaging',
    autoReplyEnabled: true,
    autoReplyDelay: 3000, // ms delay before replying (feels more human)
    ignoreGroups: false,
    ignoreBroadcasts: true,
    maxHistoryMessages: 20,
    customRules: [],
    blockedContacts: [],
    whitelistedContacts: [],
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    logger.error('Failed to save agent config: ' + err.message);
    return false;
  }
}

/**
 * Fetch deep conversation history for a chat.
 * If a keyword/reference is provided, it searches for related messages.
 */
async function getDeepHistory(chat, options = {}) {
  const { limit = 50, searchKeyword = null } = options;
  try {
    let messages = [];
    if (searchKeyword) {
      // Search for specific keywords in the chat history
      messages = await chat.fetchMessages({ search: searchKeyword, limit: 10 });
      logger.info(`Deep search for "${searchKeyword}" found ${messages.length} messages`);
    } else {
      messages = await chat.fetchMessages({ limit });
    }
    
    return messages.map((msg) => ({
      from: msg.fromMe ? 'me' : (msg._data.notifyName || msg.from),
      body: msg.body,
      timestamp: msg.timestamp,
      type: msg.type,
    }));
  } catch (err) {
    logger.error('Failed to fetch deep history: ' + err.message);
    return [];
  }
}

/**
 * Extracts potential keywords or websites from a message to use for deep search
 */
function extractReferences(text) {
  if (!text) return [];
  // Look for URLs or capitalized proper nouns/topics
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];
  
  // Simple keyword extraction: words longer than 5 chars that might be topics
  const keywords = text.split(/\s+/).filter(w => w.length > 5 && !urls.includes(w));
  
  return [...new Set([...urls, ...keywords])].slice(0, 3);
}

/**
 * Format conversation history into a readable string for the AI prompt
 */
function formatHistory(history) {
  return history
    .map((m) => {
      const time = new Date(m.timestamp * 1000).toLocaleTimeString();
      const sender = m.from === 'me' ? 'You' : m.from;
      return `[${time}] ${sender}: ${m.body}`;
    })
    .join('\n');
}

/**
 * Decide whether the agent should reply to this message
 */
function shouldReply(msg, config) {
  // Don't reply to own messages
  if (msg.fromMe) return false;

  // Don't reply to status broadcasts
  if (msg.from === 'status@broadcast') return false;

  // Check if auto-reply is enabled
  if (!config.autoReplyEnabled) return false;

  // Check blocked contacts
  if (config.blockedContacts.includes(msg.from)) return false;

  // Optionally ignore groups
  if (config.ignoreGroups && msg.from.includes('@g.us')) return false;

  // Ignore broadcast lists
  if (config.ignoreBroadcasts && msg.from.includes('@broadcast')) return false;

  // Only reply to text messages (not media-only)
  if (!msg.body || msg.body.trim() === '') return false;

  return true;
}

/**
 * Generate a smart AI reply based on conversation context
 */
async function generateReply(msg, chat) {
  const config = loadConfig();

  // Whitelist check: only reply if contact is whitelisted
  const contactId = msg.from;
  if (!config.whitelistedContacts || !config.whitelistedContacts.includes(contactId)) {
    logger.info(`Contact ${contactId} is not whitelisted. Skipping auto-reply.`);
    return null;
  }

  if (!shouldReply(msg, config)) {
    return null;
  }

  try {
    // 1. Get recent history
    const recentHistory = await getDeepHistory(chat, { limit: 30 });
    
    // 2. Check for references in the current message
    const refs = extractReferences(msg.body);
    let referenceContext = "";
    
    if (refs.length > 0) {
      logger.info(`Detected references: ${refs.join(', ')}. Searching deep history...`);
      for (const ref of refs) {
        const foundMessages = await getDeepHistory(chat, { searchKeyword: ref });
        if (foundMessages.length > 0) {
          referenceContext += `\nPast mentions of "${ref}":\n` + formatHistory(foundMessages) + "\n";
        }
      }
    }

    const historyText = formatHistory(recentHistory);

    // Build custom rules string
    const rulesText = config.customRules.length > 0
      ? '\n\nAdditional rules:\n' + config.customRules.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : '';

    const systemPrompt = `You are an AI assistant managing WhatsApp messages on behalf of ${config.ownerName}.

Your personality: ${config.personality}
Language: Respond in ${config.language}.

Your job is to read the conversation history and craft a natural, context-aware reply that sounds EXACTLY like ${config.ownerName}.

Important guidelines:
- Use the provided "Deep History" and "Past Mentions" to be 100% accurate about past facts.
- Never reveal you are an AI unless directly asked.
- Match the tone, slang, and style of the conversation.
- Keep replies short and conversational (WhatsApp style).
- If a voice note transcript is provided, reply as if you heard it.
- If an image description is provided, reply as if you saw it.
- Do not use excessive emojis unless the user does.
- If you don't know something, say you'll check and get back to them.${rulesText}`;

    const userPrompt = `RECENT CONVERSATION HISTORY:\n${historyText}\n${referenceContext}\n\nLATEST MESSAGE FROM USER:\n"${msg.body}"\n\nWrite a natural reply:`;

    logger.info(`Generating AI reply for whitelisted contact ${msg.from}`);

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content.trim();
    logger.info(`AI reply generated: "${reply.substring(0, 80)}..."`);
    return reply;

  } catch (err) {
    logger.error('AI reply generation failed: ' + err.message);
    return null;
  }
}

module.exports = { generateReply, loadConfig, saveConfig, getDefaultConfig };
