import { useEffect, useState } from 'react';
import { gun, user } from '../../gun';
import { log } from '../../utils/debug';
import { useAvatar } from '../../contexts/AvatarContext';
import { useDialog } from '../../contexts/DialogContext';
import { ACTIVE_TAB_FRESH_MS } from '../../utils/sessionConstants';
import { isForeignActiveSession } from '../../utils/sessionOwnership';
import {
  readScopedJSON,
  writeScopedJSON,
  removeScoped,
  resolveUserKey
} from '../../utils/storageScope';
import { readUserPrefOnce, writeUserPref, PREF_KEYS } from '../../utils/userPrefsGun';

export const COLDMAIL_DOMAINS = ['@coldmail.com', '@coldmail.nl', '@coldmail.net'];

const TAB_CLIENT_ID_KEY = 'chatlon_tab_client_id';
const LOCAL_AVATAR_PRESETS = ['cat.jpg', 'egg.jpg', 'crab.jpg', 'blocks.jpg', 'pug.jpg'];

export function useLoginScreenController({ onLoginSuccess }) {
  const { setMyAvatar, setMyDisplayName } = useAvatar();
  const { confirm } = useDialog();

  const [emailLocal, setEmailLocal] = useState('');
  const [emailDomain, setEmailDomain] = useState(COLDMAIL_DOMAINS[0]);
  const [localName, setLocalName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);

  const fullEmail = emailLocal ? emailLocal + emailDomain : '';

  const getLocalAvatar = (email) => {
    if (!email || email === 'guest') return '/avatars/egg.jpg';
    const userObj = availableUsers.find((item) => item.email === email);
    if (userObj?.localAvatar) return `/avatars/${userObj.localAvatar}`;

    let hash = 0;
    for (let index = 0; index < email.length; index += 1) {
      hash = ((hash << 5) - hash) + email.charCodeAt(index);
      hash |= 0;
    }
    return `/avatars/${LOCAL_AVATAR_PRESETS[Math.abs(hash) % LOCAL_AVATAR_PRESETS.length]}`;
  };

  const readCredentials = (email) =>
    readScopedJSON('credentials', resolveUserKey(email), 'chatlon_credentials', {});

  const writeCredentials = (email, creds) =>
    writeScopedJSON('credentials', resolveUserKey(email), creds);

  const clearCredentials = (email) =>
    removeScoped('credentials', resolveUserKey(email));

  const isRememberEnabled = async (email) => {
    try {
      const enabled = await readUserPrefOnce(resolveUserKey(email), PREF_KEYS.REMEMBER_ME, false);
      return Boolean(enabled);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    setRememberMe(false);
  }, []);

  useEffect(() => {
    const savedUsers = localStorage.getItem('chatlon_users');
    if (!savedUsers) return;

    try {
      const parsed = JSON.parse(savedUsers);
      const normalized = parsed.map((entry) => (
        typeof entry === 'string'
          ? { email: entry, localName: entry }
          : entry
      ));
      setAvailableUsers(normalized);
    } catch {
      setAvailableUsers([]);
    }
  }, []);

  const handleLogin = () => {
    const email = selectedUser === 'manual' ? emailLocal : selectedUser;

    if (!email || !password) {
      setError('Typ een wachtwoord.');
      return;
    }

    const localTabClientId = sessionStorage.getItem(TAB_CLIENT_ID_KEY);
    gun.get('ACTIVE_TAB').get(email).once(async (data) => {
      if (isForeignActiveSession(data, localTabClientId, Date.now(), ACTIVE_TAB_FRESH_MS)) {
        const forceLogin = await confirm(
          'Dit account is al aangemeld in een ander venster.\n\nWil je de andere sessie afbreken en hier inloggen?',
          'Al aangemeld'
        );
        if (!forceLogin) {
          setPassword('');
          return;
        }
        log('[Login] Forcing other session to close');
      }

      user.auth(email, password, (ack) => {
        if (ack.err) {
          setError('Typ het juiste wachtwoord.');
          setPassword('');
          return;
        }

        setError('');

        if (rememberMe) {
          writeCredentials(email, { email, password });
          void writeUserPref(resolveUserKey(email), PREF_KEYS.REMEMBER_ME, true);
        } else {
          clearCredentials(email);
          void writeUserPref(resolveUserKey(email), PREF_KEYS.REMEMBER_ME, false);
        }

        if (!availableUsers.find((item) => item.email === email) && availableUsers.length < 5) {
          const updatedUsers = [...availableUsers, { email, localName: email }];
          localStorage.setItem('chatlon_users', JSON.stringify(updatedUsers));
        }

        onLoginSuccess(email);
      });
    });
  };

  const handleRegister = () => {
    if (!emailLocal || !password || !localName.trim()) {
      setError('Vul alle velden in');
      return;
    }
    if (!confirmPassword) {
      setError('Bevestig uw wachtwoord');
      return;
    }
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }
    if (password.length < 4) {
      setError('Wachtwoord moet minimaal 4 tekens zijn');
      return;
    }

    const email = fullEmail;

    user.create(email, password, (ack) => {
      if (ack.err) {
        setError('Dit e-mailadres is al in gebruik');
        return;
      }

      user.auth(email, password, (authAck) => {
        if (authAck.err) return;

        setError('');

        const randomPreset =
          LOCAL_AVATAR_PRESETS[Math.floor(Math.random() * LOCAL_AVATAR_PRESETS.length)];
        setMyAvatar(randomPreset, 'preset');
        setMyDisplayName(email);

        writeCredentials(email, { email, password });
        void writeUserPref(resolveUserKey(email), PREF_KEYS.REMEMBER_ME, true);

        if (availableUsers.length < 5) {
          const updatedUsers = [
            ...availableUsers,
            { email, localName: localName.trim(), localAvatar: randomPreset }
          ];
          localStorage.setItem('chatlon_users', JSON.stringify(updatedUsers));
        }

        onLoginSuccess(email);
      });
    });
  };

  const handleKeyPress = (event) => {
    if (event.key !== 'Enter') return;
    if (isRegistering) {
      handleRegister();
      return;
    }
    handleLogin();
  };

  const handleUserClick = async (userObj) => {
    try {
      const saved = readCredentials(userObj.email);
      if (saved.email === userObj.email && saved.password) {
        setError('');
        const localTabClientId = sessionStorage.getItem(TAB_CLIENT_ID_KEY);
        gun.get('ACTIVE_TAB').get(userObj.email).once(async (data) => {
          if (isForeignActiveSession(data, localTabClientId, Date.now(), ACTIVE_TAB_FRESH_MS)) {
            const forceLogin = await confirm(
              'Dit account is al aangemeld in een ander venster.\n\nWil je de andere sessie afbreken en hier inloggen?',
              'Al aangemeld'
            );
            if (!forceLogin) return;
          }

          user.auth(userObj.email, saved.password, (ack) => {
            if (ack.err) {
              setSelectedUser(userObj.email);
              setEmailLocal(userObj.email);
              setPassword('');
              void isRememberEnabled(userObj.email).then((enabled) => setRememberMe(enabled));
              setError('Opgeslagen wachtwoord is niet meer geldig.');
              return;
            }

            onLoginSuccess(userObj.email);
          });
        });
        return;
      }
    } catch {
      // no-op: geen geldige opgeslagen credentials
    }

    setSelectedUser(userObj.email);
    setEmailLocal(userObj.email);
    setPassword('');
    setRememberMe(await isRememberEnabled(userObj.email));
    setError('');
    setIsRegistering(false);
  };

  const handleDeleteUser = async (userObj, event) => {
    event.stopPropagation();

    const confirmed = await confirm(
      `Wilt u ${userObj.localName} uit de lijst verwijderen?\n\nDit verwijdert alleen de snelkoppeling, niet het account.`,
      'Gebruiker verwijderen'
    );

    if (!confirmed) return;

    const updatedUsers = availableUsers.filter((item) => item.email !== userObj.email);
    setAvailableUsers(updatedUsers);
    localStorage.setItem('chatlon_users', JSON.stringify(updatedUsers));

    if (selectedUser === userObj.email) {
      setSelectedUser(null);
      setEmailLocal('');
      setPassword('');
      setError('');
    }
  };

  const resetSelection = () => {
    setSelectedUser(null);
    setIsRegistering(false);
    setEmailLocal('');
    setLocalName('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const selectManualUser = () => {
    if (availableUsers.length >= 5) return;
    setSelectedUser('manual');
    setEmailLocal('');
    setPassword('');
    setConfirmPassword('');
    setIsRegistering(false);
    setError('');
  };

  const selectRegistration = () => {
    if (availableUsers.length >= 5) return;
    setIsRegistering(true);
    setSelectedUser('register');
    setEmailLocal('');
    setLocalName('');
    setPassword('');
    setConfirmPassword('');
    setRememberMe(true);
    setError('');
  };

  const selectedUserObj = availableUsers.find((item) => item.email === selectedUser);
  const displayLabel = isRegistering
    ? 'Nieuwe gebruiker'
    : (selectedUser === 'manual' ? 'Inloggen' : (selectedUserObj?.localName || selectedUser || ''));

  return {
    availableUsers,
    confirmPassword,
    displayLabel,
    emailDomain,
    emailLocal,
    error,
    fullEmail,
    getLocalAvatar,
    handleDeleteUser,
    handleKeyPress,
    handleLogin,
    handleRegister,
    handleUserClick,
    isMaxUsersReached: availableUsers.length >= 5,
    isRegistering,
    localName,
    password,
    rememberMe,
    resetSelection,
    selectManualUser,
    selectRegistration,
    selectedUser,
    selectedUserObj,
    setConfirmPassword,
    setEmailDomain,
    setEmailLocal,
    setIsRegistering,
    setLocalName,
    setPassword,
    setRememberMe,
    showPasswordPanel: Boolean(selectedUser || isRegistering)
  };
}

export default useLoginScreenController;
