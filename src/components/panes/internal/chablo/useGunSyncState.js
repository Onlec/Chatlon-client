import { useEffect, useReducer, useRef } from 'react';
import {
  createSafeDictionary,
  syncSafeDictionaryKeys,
  syncSafeNestedDictionaryScopes,
  updateSafeDictionary,
  updateSafeNestedDictionary
} from './chabloSafeStore';
import { sanitizeGunNode } from './chabloLiveStateUtils';

function resolveGunNode(gunApi, rootKey, path = []) {
  let node = gunApi?.get?.(rootKey);
  path.forEach((segment) => {
    node = node?.get?.(segment);
  });
  return node;
}

function createDependencySignature(values = []) {
  return (values || []).map((value) => {
    if (value === null) {
      return 'null';
    }
    if (value === undefined) {
      return 'undefined';
    }
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'bigint':
        return String(value);
      default:
        return Object.prototype.toString.call(value);
    }
  }).join('|');
}

function useStableArray(values = []) {
  const signature = createDependencySignature(values);
  const stableRef = useRef({
    signature: null,
    values: []
  });

  if (stableRef.current.signature !== signature) {
    stableRef.current = {
      signature,
      values: [...(values || [])]
    };
  }

  return stableRef.current.values;
}

export function safeRecordReducer(state, action) {
  switch (action.type) {
    case 'reset':
      return createSafeDictionary();
    case 'sync-keys':
      return syncSafeDictionaryKeys(state, action.keys);
    case 'update':
      return updateSafeDictionary(state, action.key, action.value);
    default:
      return state;
  }
}

export function safeScopedRecordReducer(state, action) {
  switch (action.type) {
    case 'reset':
      return createSafeDictionary();
    case 'sync-scopes':
      return syncSafeNestedDictionaryScopes(state, action.scopes);
    case 'update':
      return updateSafeNestedDictionary(state, action.scopeKey, action.key, action.value);
    default:
      return state;
  }
}

export function useGunMapState({
  gunApi,
  rootKey,
  path = [],
  deps = [],
  enabled = true
}) {
  const [entries, dispatch] = useReducer(safeRecordReducer, undefined, createSafeDictionary);
  const extraDepsSignature = createDependencySignature(deps);
  const stablePath = useStableArray(path);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'reset' });
      return undefined;
    }

    dispatch({ type: 'reset' });
    const node = resolveGunNode(gunApi, rootKey, stablePath);
    const mapNode = node?.map?.();

    if (mapNode?.on) {
      mapNode.on((record, key) => {
        dispatch({
          type: 'update',
          key,
          value: record && typeof record === 'object' ? sanitizeGunNode(record) : null
        });
      });
    }

    return () => {
      mapNode?.off?.();
      node?.off?.();
    };
  }, [enabled, extraDepsSignature, gunApi, rootKey, stablePath]);

  return entries;
}

export function useGunMultiMapState({
  gunApi,
  rootKey,
  scopes = [],
  getPathForScope = (scopeKey) => [scopeKey],
  deps = [],
  enabled = true
}) {
  const [entriesByScope, dispatch] = useReducer(safeScopedRecordReducer, undefined, createSafeDictionary);
  const extraDepsSignature = createDependencySignature(deps);
  const stableScopes = useStableArray(scopes);
  const getPathForScopeRef = useRef(getPathForScope);

  useEffect(() => {
    getPathForScopeRef.current = getPathForScope;
  }, [getPathForScope]);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'reset' });
      return undefined;
    }

    dispatch({ type: 'sync-scopes', scopes: stableScopes });
    const cleanupFns = [];

    stableScopes.forEach((scopeKey) => {
      const node = resolveGunNode(gunApi, rootKey, getPathForScopeRef.current(scopeKey));
      const mapNode = node?.map?.();

      if (mapNode?.on) {
        mapNode.on((record, key) => {
          dispatch({
            type: 'update',
            scopeKey,
            key,
            value: record && typeof record === 'object' ? sanitizeGunNode(record) : null
          });
        });
      }

      cleanupFns.push(() => {
        mapNode?.off?.();
        node?.off?.();
      });
    });

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [enabled, extraDepsSignature, gunApi, rootKey, stableScopes]);

  return entriesByScope;
}

export function useGunRecordState({
  gunApi,
  rootKey,
  keys = [],
  getPathForKey = (key) => [key],
  deps = [],
  enabled = true
}) {
  const [entries, dispatch] = useReducer(safeRecordReducer, undefined, createSafeDictionary);
  const extraDepsSignature = createDependencySignature(deps);
  const stableKeys = useStableArray(keys);
  const getPathForKeyRef = useRef(getPathForKey);

  useEffect(() => {
    getPathForKeyRef.current = getPathForKey;
  }, [getPathForKey]);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'reset' });
      return undefined;
    }

    dispatch({ type: 'sync-keys', keys: stableKeys });
    const cleanupFns = [];

    stableKeys.forEach((key) => {
      const node = resolveGunNode(gunApi, rootKey, getPathForKeyRef.current(key));

      if (node?.on) {
        node.on((record) => {
          dispatch({
            type: 'update',
            key,
            value: record && typeof record === 'object' ? sanitizeGunNode(record) : null
          });
        });
      } else {
        dispatch({ type: 'update', key, value: null });
      }

      cleanupFns.push(() => {
        node?.off?.();
      });
    });

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [enabled, extraDepsSignature, gunApi, rootKey, stableKeys]);

  return entries;
}

export function useGunRecordValue({
  gunApi,
  rootKey,
  path = [],
  deps = [],
  enabled = true
}) {
  const [entry, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case 'reset':
        return null;
      case 'update':
        return action.value;
      default:
        return state;
    }
  }, null);
  const extraDepsSignature = createDependencySignature(deps);
  const stablePath = useStableArray(path);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'reset' });
      return undefined;
    }

    const node = resolveGunNode(gunApi, rootKey, stablePath);
    if (node?.on) {
      node.on((record) => {
        dispatch({
          type: 'update',
          value: record && typeof record === 'object' ? sanitizeGunNode(record) : null
        });
      });
    } else {
      dispatch({ type: 'reset' });
    }

    return () => {
      node?.off?.();
    };
  }, [enabled, extraDepsSignature, gunApi, rootKey, stablePath]);

  return entry;
}
