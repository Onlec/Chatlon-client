export function toSafeDictionaryKey(key) {
  if (key === null || key === undefined) {
    return null;
  }

  const nextKey = String(key);
  return nextKey.length > 0 ? nextKey : null;
}

export function createSafeDictionary(entries = []) {
  const next = Object.create(null);
  entries.forEach(([key, value]) => {
    const safeKey = toSafeDictionaryKey(key);
    if (safeKey) {
      next[safeKey] = value;
    }
  });
  return next;
}

export function safeDictionaryEntries(record) {
  return Object.entries(record || createSafeDictionary());
}

export function safeDictionaryKeys(record) {
  return Object.keys(record || createSafeDictionary());
}

export function hasSafeDictionaryKey(record, key) {
  const safeKey = toSafeDictionaryKey(key);
  return Boolean(safeKey) && Object.prototype.hasOwnProperty.call(record || createSafeDictionary(), safeKey);
}

export function updateSafeDictionary(record, key, value) {
  const safeKey = toSafeDictionaryKey(key);
  if (!safeKey) {
    return record || createSafeDictionary();
  }

  const previous = record || createSafeDictionary();
  const shouldDelete = value === null || value === undefined;
  const hasKey = hasSafeDictionaryKey(previous, safeKey);

  if (shouldDelete && !hasKey) {
    return previous;
  }

  if (!shouldDelete && hasKey && previous[safeKey] === value) {
    return previous;
  }

  const next = createSafeDictionary(safeDictionaryEntries(previous));
  if (shouldDelete) {
    delete next[safeKey];
  } else {
    next[safeKey] = value;
  }
  return next;
}

export function syncSafeDictionaryKeys(record, keys, createMissingValue = null) {
  const previous = record || createSafeDictionary();
  const next = createSafeDictionary();

  (keys || []).forEach((key) => {
    const safeKey = toSafeDictionaryKey(key);
    if (!safeKey) {
      return;
    }

    if (hasSafeDictionaryKey(previous, safeKey)) {
      next[safeKey] = previous[safeKey];
      return;
    }

    if (typeof createMissingValue === 'function') {
      next[safeKey] = createMissingValue(safeKey);
    }
  });

  return next;
}

export function updateSafeNestedDictionary(record, scopeKey, entryKey, value) {
  const safeScopeKey = toSafeDictionaryKey(scopeKey);
  if (!safeScopeKey) {
    return record || createSafeDictionary();
  }

  const previous = record || createSafeDictionary();
  const next = createSafeDictionary(safeDictionaryEntries(previous));
  const scopedRecord = createSafeDictionary(safeDictionaryEntries(previous[safeScopeKey]));
  next[safeScopeKey] = updateSafeDictionary(scopedRecord, entryKey, value);
  return next;
}

export function syncSafeNestedDictionaryScopes(record, scopeKeys) {
  const previous = record || createSafeDictionary();
  const next = createSafeDictionary();

  (scopeKeys || []).forEach((scopeKey) => {
    const safeScopeKey = toSafeDictionaryKey(scopeKey);
    if (!safeScopeKey) {
      return;
    }

    next[safeScopeKey] = createSafeDictionary(
      safeDictionaryEntries(previous[safeScopeKey])
    );
  });

  return next;
}
