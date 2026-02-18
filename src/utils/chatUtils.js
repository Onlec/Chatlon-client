// src/utils/chatUtils.js
/**
 * Chat Utilities
 * 
 * Gedeelde functies voor chat/conversation management.
 * Gebruikt door App.js, ConversationPane.js, en andere chat-gerelateerde componenten.
 */

import { log } from './debug';
/**
 * Genereert een uniek contact pair ID (alfabetisch gesorteerd).
 * Zorgt ervoor dat dezelfde twee users altijd dezelfde ID krijgen,
 * ongeacht de volgorde waarin ze worden doorgegeven.
 * 
 * @param {string} user1 - Eerste username
 * @param {string} user2 - Tweede username
 * @returns {string} Gesorteerde pair ID (bijv. "alice_bob")
 * 
 * @example
 * getContactPairId('bob', 'alice') // 'alice_bob'
 * getContactPairId('alice', 'bob') // 'alice_bob'
 */
export const getContactPairId = (user1, user2) => {
  const sorted = [user1, user2].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

/**
 * Genereert een chat room ID voor Gun.js storage.
 * Prefix "CHAT_" gevolgd door de gesorteerde pair ID.
 * 
 * @param {string} user1 - Eerste username
 * @param {string} user2 - Tweede username
 * @returns {string} Chat room ID (bijv. "CHAT_alice_bob")
 * 
 * @example
 * getChatRoomId('bob', 'alice') // 'CHAT_alice_bob'
 */
export const getChatRoomId = (user1, user2) => {
  return `CHAT_${getContactPairId(user1, user2)}`;
};


/**
 * Genereert een unieke message ID.
 * Combineert timestamp met random string voor uniciteit.
 * 
 * @returns {string} Unieke message ID
 */
export const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Genereert een session ID voor een conversation.
 * 
 * @param {string} pairId - Contact pair ID
 * @returns {string} Session ID met timestamp
 */
export const generateSessionId = (pairId) => {
  return `CHAT_${pairId}_${Date.now()}`;
};

/**
 * Format een timestamp naar een leesbare tijd string.
 * 
 * @param {Date|number} timestamp - Date object of Unix timestamp
 * @returns {string} Geformatteerde tijd (bijv. "14:30")
 */
export const formatMessageTime = (timestamp) => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Default export voor backwards compatibility
export default {
  getContactPairId,
  getChatRoomId,
  generateMessageId,
  generateSessionId,
  formatMessageTime
};