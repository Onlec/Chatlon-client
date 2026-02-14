// src/utils/encryption.js
/**
 * End-to-End Encryptie via Gun SEA
 * 
 * Gebruikt Diffie-Hellman key exchange voor gedeelde geheimen
 * per contactpaar. Berichten worden versleuteld voordat ze
 * naar Gun geschreven worden.
 * 
 * Backwards compatible: onversleutelde berichten worden
 * herkend en als plaintext weergegeven.
 */

import Gun from 'gun';
import 'gun/sea';
import { gun, user } from '../gun';
import { log } from './debug';

const SEA = Gun.SEA;

// Cache voor gedeelde geheimen (1x berekenen per contact per sessie)
const secretCache = {};

// Cache voor publieke sleutels
const pubKeyCache = {};

/**
 * Haal de publieke sleutel (epub) op van een contact.
 * Gecached per sessie.
 * 
 * @param {string} contactName - Username van het contact
 * @returns {Promise<string|null>} epub publieke sleutel
 */
export async function getContactPublicKey(contactName) {
  if (pubKeyCache[contactName]) {
    return pubKeyCache[contactName];
  }

  return new Promise((resolve) => {
    gun.get('~@' + contactName).once((data) => {
      if (!data) {
        log('[Encryption] No user found for:', contactName);
        resolve(null);
        return;
      }

      // Gun slaat user references op als keys in het alias-object
      // We moeten de publieke sleutel eruit halen
      const keys = Object.keys(data).filter(k => k.startsWith('~'));
      if (keys.length === 0) {
        log('[Encryption] No public key found for:', contactName);
        resolve(null);
        return;
      }

      const userPub = keys[0].replace('~', '');

      // Haal het epub (encryption public key) op
      gun.get('~' + userPub).once((userData) => {
        if (userData && userData.epub) {
          pubKeyCache[contactName] = userData.epub;
          log('[Encryption] Got public key for:', contactName);
          resolve(userData.epub);
        } else {
          log('[Encryption] No epub found for:', contactName);
          resolve(null);
        }
      });
    });
  });
}

/**
 * Genereer of haal het gedeelde geheim op voor een contact.
 * Gebruikt Diffie-Hellman via SEA.secret().
 * 
 * @param {string} contactName - Username van het contact
 * @returns {Promise<string|null>} Gedeeld geheim
 */
export async function getSharedSecret(contactName) {
  if (secretCache[contactName]) {
    return secretCache[contactName];
  }

  const contactEpub = await getContactPublicKey(contactName);
  if (!contactEpub) {
    log('[Encryption] Cannot create secret: no public key for', contactName);
    return null;
  }

  const myPair = user._.sea;
  if (!myPair) {
    log('[Encryption] Cannot create secret: user not authenticated');
    return null;
  }

  try {
    const secret = await SEA.secret(contactEpub, myPair);
    if (secret) {
      secretCache[contactName] = secret;
      log('[Encryption] Shared secret created for:', contactName);
    }
    return secret;
  } catch (err) {
    log('[Encryption] Error creating secret:', err.message);
    return null;
  }
}

/**
 * Versleutel een bericht.
 * 
 * @param {string} plaintext - Onversleuteld bericht
 * @param {string} contactName - Username van ontvanger
 * @returns {Promise<string>} Versleuteld bericht, of plaintext als fallback
 */
export async function encryptMessage(plaintext, contactName) {
  const secret = await getSharedSecret(contactName);
  if (!secret) {
    log('[Encryption] Fallback to plaintext for:', contactName);
    return plaintext;
  }

  try {
    const encrypted = await SEA.encrypt(plaintext, secret);
    return JSON.stringify({ enc: true, data: encrypted });
  } catch (err) {
    log('[Encryption] Encrypt error:', err.message);
    return plaintext;
  }
}

/**
 * Ontsleutel een bericht.
 * Backwards compatible: herkent onversleutelde berichten.
 * 
 * @param {string} content - Bericht content (mogelijk versleuteld)
 * @param {string} contactName - Username van de afzender
 * @returns {Promise<string>} Ontsleuteld bericht
 */
export async function decryptMessage(content, contactName) {
  // Check of het een versleuteld bericht is
  if (!content || typeof content !== 'string') return content;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    // Niet JSON → onversleuteld (backwards compatible)
    return content;
  }

  if (!parsed || !parsed.enc || !parsed.data) {
    // Geen encryptie marker → onversleuteld
    return content;
  }

  const secret = await getSharedSecret(contactName);
  if (!secret) {
    log('[Encryption] Cannot decrypt: no secret for', contactName);
    return '[Versleuteld bericht]';
  }

  try {
    const decrypted = await SEA.decrypt(parsed.data, secret);
    if (decrypted === undefined || decrypted === null) {
      log('[Encryption] Decrypt returned null for:', contactName);
      return '[Versleuteld bericht]';
    }
    return decrypted;
  } catch (err) {
    log('[Encryption] Decrypt error:', err.message);
    return '[Versleuteld bericht]';
  }
}

/**
 * Pre-warm de encryptie cache voor een contact.
 * Roep aan bij het openen van een conversatie.
 * 
 * @param {string} contactName - Username van het contact
 */
export async function warmupEncryption(contactName) {
  log('[Encryption] Warming up for:', contactName);
  await getSharedSecret(contactName);
}

/**
 * Wis de cache (bij logout).
 */
export function clearEncryptionCache() {
  Object.keys(secretCache).forEach(k => delete secretCache[k]);
  Object.keys(pubKeyCache).forEach(k => delete pubKeyCache[k]);
  log('[Encryption] Cache cleared');
}

export default {
  encryptMessage,
  decryptMessage,
  warmupEncryption,
  clearEncryptionCache,
  getSharedSecret
};