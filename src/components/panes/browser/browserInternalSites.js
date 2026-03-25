export const INTERNAL_BROWSER_SITES = [
  {
    id: 'myspace',
    title: 'MySpace Chatlon',
    bookmarkName: 'MySpace',
    host: 'myspace.chatlon',
    aliases: ['myspace.chatlon', 'www.myspace.chatlon'],
    description: 'Een volledig lokale profielpagina met about me, top friends, comments en een optioneel profielliedje.'
  },
  {
    id: 'chablo',
    title: 'Chablo Motel',
    bookmarkName: 'Chablo Motel',
    host: 'chablo.motel',
    aliases: ['chablo.motel', 'www.chablo.motel'],
    description: 'Een lokale motelwereld met kamers, live avatars, room chat en een aparte Chablo-vriendenlijst.'
  },
  {
    id: 'pixels',
    title: 'Pixels.chatlon',
    bookmarkName: 'Pixels',
    host: 'pixels.chatlon',
    aliases: ['pixels.chatlon', 'www.pixels.chatlon'],
    description: 'Een lokale Million Dollar Homepage-achtige pixelmuur die live synchroniseert via Gun.'
  }
];

const INTERNAL_SITE_BY_ALIAS = INTERNAL_BROWSER_SITES.reduce((map, site) => {
  site.aliases.forEach((alias) => {
    map.set(alias.toLowerCase(), site);
  });
  return map;
}, new Map());

const INTERNAL_SITE_BY_ID = INTERNAL_BROWSER_SITES.reduce((map, site) => {
  map.set(site.id, site);
  return map;
}, new Map());

export function getInternalBrowserSiteById(siteId) {
  return INTERNAL_SITE_BY_ID.get(siteId) || null;
}

export function getInternalBrowserSiteByHost(host) {
  if (!host) return null;
  return INTERNAL_SITE_BY_ALIAS.get(host.toLowerCase()) || null;
}

export function getInternalBrowserSiteUrl(siteOrId) {
  const site = typeof siteOrId === 'string'
    ? getInternalBrowserSiteById(siteOrId)
    : siteOrId;

  if (!site) return null;
  return `https://${site.host}/`;
}

export function createInternalBrowserEntry(siteOrId) {
  const site = typeof siteOrId === 'string'
    ? getInternalBrowserSiteById(siteOrId)
    : siteOrId;

  if (!site) return null;

  return {
    kind: 'internal',
    internalSiteId: site.id,
    title: site.title,
    url: getInternalBrowserSiteUrl(site)
  };
}
