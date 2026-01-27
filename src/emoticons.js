// Klassieke Chat (voorheen MSN) Messenger emoticons
export const emoticons = {
  // Basis smileys
  ':)': '🙂',
  ':-)': '🙂',
  ':D': '😃',
  ':-D': '😃',
  ':(': '☹️',
  ':-(': '☹️',
  ';)': '😉',
  ';-)': '😉',
  ':P': '😛',
  ':-P': '😛',
  ':p': '😛',
  ':-p': '😛',
  ':o': '😮',
  ':O': '😮',
  ':-O': '😮',
  ':|': '😐',
  ':-|': '😐',
  ':*': '😘',
  ':-*': '😘',
  ':s': '😕',
  ':S': '😕',
  ':-s': '😕',
  ':-S': '😕',
  ':$': '😳',
  ':-$': '😳',
  '8)': '😎',
  '8-)': '😎',
  '(@)': '🐱',
  ':@': '😡',
  ':-@': '😡',
  ':^)': '🤔',
  '8-|': '🤓',
  '+o(': '🤢',
  
  // Speciale emoties & Gebaren
  '(a)': '😇',
  '(A)': '😇',
  '(6)': '😈',
  '(d)': '😈',
  '(D)': '😈',
  '(z)': '😴',
  '(Z)': '😴',
  '(x)': '🤐',
  '(X)': '🤐',
  '(y)': '👍',
  '(Y)': '👍',
  '(n)': '👎',
  '(N)': '👎',
  '(h)': '😍',
  '(H)': '😍',
  '(k)': '💋',
  '(K)': '💋',
  '(g)': '🎁',
  '(G)': '🎁',
  '(f)': '🌹',
  '(F)': '🌹',
  '(w)': '🥀',
  '(W)': '🥀',
  '(})': '🤗',

  // Liefde & Symbolen
  '<3': '❤️',
  '</3': '💔',
  '(l)': '❤️',
  '(L)': '❤️',
  '(u)': '💔',
  '(U)': '💔',
  '(*)': '⭐',
  '(#)': '☀️',
  '(s)': '🌙',
  '(r)': '🌈',
  '(R)': '🌈',

  // Eten, Drinken & Objecten
  '(^)': '🎂',
  '(b)': '🍺',
  '(B)': '🍺',
  '(c)': '☕',
  '(C)': '☕',
  '(pi)': '🍕',
  '(PI)': '🍕',
  '(so)': '⚽',
  '(SO)': '⚽',
  '(mp)': '📱',
  '(MP)': '📱',
  '(e)': '📧',
  '(E)': '📧',
  '(mo)': '💰',
  '(MO)': '💰',
  '(t)': '☎️',
  '(T)': '☎️',
  '(um)': '☂️',
  '(ip)': '💡',
  
  // Vervoer
  '(au)': '🚗',
  '(ap)': '✈️',

  // Afkortingen
  'lol': '😂',
  'LOL': '😂',
  '(ll)': '😂',
  'brb': '⏰',
  'BRB': '⏰'
};

// Convert text emoticons to emoji
export const convertEmoticons = (text) => {
  if (!text) return '';
  let result = text;
  
  const sortedKeys = Object.keys(emoticons).sort((a, b) => b.length - a.length);
  
  sortedKeys.forEach(key => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Matcher die kijkt naar spaties of begin/eind van regel
    const regex = new RegExp(`(^|\\s)${escapedKey}(?=\\s|$)`, 'g');
    result = result.replace(regex, `$1${emoticons[key]}`);
  });
  
  return result;
};

// Get emoticon list for picker (georganiseerd per categorie)
export const getEmoticonCategories = () => {
  return {
    'Smileys': [
      { text: ':)', emoji: '🙂' },
      { text: ':D', emoji: '😃' },
      { text: ':(', emoji: '☹️' },
      { text: ';)', emoji: '😉' },
      { text: ':P', emoji: '😛' },
      { text: ':$', emoji: '😳' },
      { text: '8)', emoji: '😎' },
      { text: ':@', emoji: '😡' },
      { text: '(z)', emoji: '😴' }
    ],
    'Speciaal': [
      { text: '(a)', emoji: '😇' },
      { text: '(6)', emoji: '😈' },
      { text: '(h)', emoji: '😍' },
      { text: '(x)', emoji: '🤐' },
      { text: '8-|', emoji: '🤓' },
      { text: '+o(', emoji: '🤢' }
    ],
    'Harten & Gebaren': [
      { text: '<3', emoji: '❤️' },
      { text: '</3', emoji: '💔' },
      { text: '(y)', emoji: '👍' },
      { text: '(n)', emoji: '👎' },
      { text: '(k)', emoji: '💋' },
      { text: '(g)', emoji: '🎁' }
    ],
    'Objecten': [
      { text: '(f)', emoji: '🌹' },
      { text: '(^)', emoji: '🎂' },
      { text: '(c)', emoji: '☕' },
      { text: '(b)', emoji: '🍺' },
      { text: '(pi)', emoji: '🍕' },
      { text: '(so)', emoji: '⚽' },
      { text: '(mp)', emoji: '📱' },
      { text: '(mo)', emoji: '💰' }
    ]
  };
};

export default emoticons;