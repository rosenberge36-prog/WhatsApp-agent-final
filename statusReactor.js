const logger = require('./logger');

// Reaction emojis to use when someone views/reacts to your status
const REACTION_EMOJIS = ['👍', '❤️'];

let reactionIndex = 0; // Alternates between 👍 and ❤️

/**
 * Get the next reaction emoji (alternates between 👍 and ❤️)
 */
function getNextReaction() {
  const emoji = REACTION_EMOJIS[reactionIndex % REACTION_EMOJIS.length];
  reactionIndex++;
  return emoji;
}

/**
 * React to a status update message
 * @param {object} client - The WhatsApp client instance
 * @param {object} msg - The status message to react to
 */
async function reactToStatus(client, msg) {
  try {
    const emoji = getNextReaction();
    await msg.react(emoji);
    logger.info(`Reacted to status from ${msg.from} with ${emoji}`);
    return true;
  } catch (err) {
    logger.error(`Failed to react to status from ${msg.from}: ${err.message}`);
    return false;
  }
}

/**
 * Handle incoming status updates — react when someone posts/updates their status
 * @param {object} client - The WhatsApp client instance
 * @param {object} msg - The incoming message
 */
async function handleStatusMessage(client, msg) {
  // Status messages come from 'status@broadcast'
  if (msg.from !== 'status@broadcast') return;

  // Don't react to own status
  if (msg.fromMe) return;

  logger.info(`Status update detected from contact: ${msg._data.notifyName || msg.from}`);

  // Small delay to seem natural
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2000));

  await reactToStatus(client, msg);
}

/**
 * Handle when someone reacts to YOUR status — react back
 * @param {object} client - The WhatsApp client instance
 * @param {object} reaction - The reaction event
 */
async function handleStatusReaction(client, reaction) {
  try {
    // reaction.senderId is who reacted, reaction.reaction is the emoji they used
    const sender = reaction.senderId;
    const theirEmoji = reaction.reaction;

    logger.info(`${sender} reacted to your status with ${theirEmoji} — reacting back`);

    // Get the chat with this person and send a reaction back
    const chat = await client.getChatById(sender);
    if (chat) {
      // Send a friendly reaction message back
      const emoji = getNextReaction();
      // We can't directly react to their reaction on our status,
      // but we can send them a reaction on their last message
      const messages = await chat.fetchMessages({ limit: 5 });
      const lastMsg = messages.filter((m) => !m.fromMe).pop();
      if (lastMsg) {
        await lastMsg.react(emoji);
        logger.info(`Reacted back to ${sender} with ${emoji}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to handle status reaction: ${err.message}`);
  }
}

module.exports = { handleStatusMessage, handleStatusReaction, reactToStatus };
