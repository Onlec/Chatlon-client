// src/utils/gunListenerManager.js
/**
 * Gun Listener Manager
 * 
 * Gestandaardiseerd patroon voor Gun.js listener lifecycle.
 * Voorkomt memory leaks door consistent cleanup bij te houden.
 */

/**
 * Maakt een listener manager die Gun node references bijhoudt
 * en ze allemaal kan opruimen.
 * 
 * @returns {Object} { add, remove, cleanup }
 * 
 * @example
 * const listeners = createListenerManager();
 * 
 * // Voeg listener toe
 * const node = gun.get('PRESENCE').get(username);
 * node.on(callback);
 * listeners.add(username, node);
 * 
 * // Cleanup alles
 * listeners.cleanup();
 */
export const createListenerManager = () => {
  const nodes = new Map();

  return {
    /** Registreer een Gun node onder een key */
    add(key, gunNode) {
      // Cleanup bestaande listener voor deze key
      if (nodes.has(key)) {
        nodes.get(key).off();
      }
      nodes.set(key, gunNode);
    },

    /** Verwijder één listener */
    remove(key) {
      if (nodes.has(key)) {
        nodes.get(key).off();
        nodes.delete(key);
      }
    },

    /** Heeft deze key al een listener? */
    has(key) {
      return nodes.has(key);
    },

    /** Cleanup alle listeners */
    cleanup() {
      nodes.forEach(node => node.off());
      nodes.clear();
    },

    /** Aantal actieve listeners */
    get size() {
      return nodes.size;
    }
  };
};