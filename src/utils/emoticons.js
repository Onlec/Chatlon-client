// NEW — Categorieën als single source of truth

/** Primaire data: categorieën met emoticon mappings */
export const EMOTICON_CATEGORIES = {
  'Smileys': {
    ':)': '🙂', ':-)': '🙂', ':D': '😃', ':-D': '😃',
    ':(': '☹️', ':-(': '☹️', ';)': '😉', ';-)': '😉',
    ':P': '😛', ':-P': '😛', ':p': '😛', ':-p': '😛',
    ':o': '😮', ':O': '😮', ':-O': '😮',
    ':|': '😐', ':-|': '😐', ':*': '😘', ':-*': '😘',
    ':s': '😕', ':S': '😕', ':-s': '😕', ':-S': '😕',
    ':$': '😳', ':-$': '😳', '8)': '😎', '8-)': '😎',
    ':@': '😡', ':-@': '😡', ':^)': '🤔', '8-|': '🤓',
    '+o(': '🤢'
  },
  'Speciaal': {
    '(a)': '😇', '(A)': '😇', '(6)': '😈', '(d)': '😈', '(D)': '😈',
    '(z)': '😴', '(Z)': '😴', '(x)': '🤐', '(X)': '🤐',
    '(h)': '😍', '(H)': '😍', '(@)': '🐱', '(})': '🤗'
  },
  'Harten & Gebaren': {
    '<3': '❤️', '</3': '💔',
    '(l)': '❤️', '(L)': '❤️', '(u)': '💔', '(U)': '💔',
    '(y)': '👍', '(Y)': '👍', '(n)': '👎', '(N)': '👎',
    '(k)': '💋', '(K)': '💋', '(g)': '🎁', '(G)': '🎁',
    '(f)': '🌹', '(F)': '🌹', '(w)': '🥀', '(W)': '🥀'
  },
  'Objecten': {
    '(*)': '⭐', '(#)': '☀️', '(s)': '🌙', '(r)': '🌈', '(R)': '🌈',
    '(^)': '🎂', '(b)': '🍺', '(B)': '🍺', '(c)': '☕', '(C)': '☕',
    '(pi)': '🍕', '(PI)': '🍕', '(so)': '⚽', '(SO)': '⚽',
    '(mp)': '📱', '(MP)': '📱', '(e)': '📧', '(E)': '📧',
    '(mo)': '💰', '(MO)': '💰', '(t)': '☎️', '(T)': '☎️',
    '(um)': '☂️', '(ip)': '💡', '(au)': '🚗', '(ap)': '✈️'
  },
  'Afkortingen': {
    'lol': '😂', 'LOL': '😂', '(ll)': '😂',
    'brb': '⏰', 'BRB': '⏰'
  }
};

/** Afgeleide flat map — gegenereerd uit categorieën */
export const emoticons = Object.values(EMOTICON_CATEGORIES)
  .reduce((acc, cat) => ({ ...acc, ...cat }), {});

/** Gesorteerde keys voor conversion (langste eerst) */
const sortedKeys = Object.keys(emoticons).sort((a, b) => b.length - a.length);

/** Convert text emoticons naar emoji */
export const convertEmoticons = (text) => {
  if (!text) return '';
  let result = text;
  sortedKeys.forEach(key => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)${escapedKey}(?=\\s|$)`, 'g');
    result = result.replace(regex, `$1${emoticons[key]}`);
  });
  return result;
};

/** Categorieën voor de picker UI */
export const getEmoticonCategories = () => {
  const result = {};
  Object.entries(EMOTICON_CATEGORIES).forEach(([category, mappings]) => {
    // Deduplicate op emoji (toon alleen de kortste variant)
    const seen = new Set();
    result[category] = Object.entries(mappings)
      .filter(([, emoji]) => {
        if (seen.has(emoji)) return false;
        seen.add(emoji);
        return true;
      })
      .map(([text, emoji]) => ({ text, emoji }));
  });
  return result;
};

export default emoticons;