import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gun } from '../../../gun';

const DEFAULT_PROFILE = {
  aboutMe: '',
  bgColor: '#1b2641',
  bgPattern: 'stars',
  textColor: '#f8fbff',
  songTitle: '',
  songUrl: '',
  mood: '',
  visitors: 0,
  lastUpdated: null
};

const PATTERN_OPTIONS = ['none', 'stars', 'hearts', 'skulls', 'flames'];

function sanitizeNode(node) {
  if (!node || typeof node !== 'object') return {};
  const next = { ...node };
  delete next._;
  delete next['#'];
  return next;
}

function getProfileStyles(profile) {
  const baseBackground = profile.bgColor || DEFAULT_PROFILE.bgColor;
  const textColor = profile.textColor || DEFAULT_PROFILE.textColor;
  const overlayColor = textColor === '#000000'
    ? 'rgba(0, 0, 0, 0.08)'
    : 'rgba(255, 255, 255, 0.12)';

  const styles = {
    backgroundColor: baseBackground,
    color: textColor
  };

  if (profile.bgPattern === 'stars') {
    styles.backgroundImage = `
      radial-gradient(circle at 12px 12px, ${overlayColor} 0 1.5px, transparent 1.6px),
      radial-gradient(circle at 38px 24px, ${overlayColor} 0 1.2px, transparent 1.3px)
    `;
    styles.backgroundSize = '56px 56px';
  } else if (profile.bgPattern === 'hearts') {
    styles.backgroundImage = `
      radial-gradient(circle at 14px 16px, ${overlayColor} 0 5px, transparent 5.2px),
      radial-gradient(circle at 24px 16px, ${overlayColor} 0 5px, transparent 5.2px),
      linear-gradient(135deg, transparent 0 50%, ${overlayColor} 50% 100%)
    `;
    styles.backgroundSize = '54px 54px';
    styles.backgroundPosition = '0 0, 0 0, 8px 18px';
  } else if (profile.bgPattern === 'skulls') {
    styles.backgroundImage = `
      radial-gradient(circle at 15px 18px, ${overlayColor} 0 7px, transparent 7.2px),
      radial-gradient(circle at 12px 16px, ${baseBackground} 0 1.8px, transparent 1.9px),
      radial-gradient(circle at 18px 16px, ${baseBackground} 0 1.8px, transparent 1.9px)
    `;
    styles.backgroundSize = '52px 52px';
  } else if (profile.bgPattern === 'flames') {
    styles.backgroundImage = `
      radial-gradient(circle at 50% 100%, ${overlayColor} 0 18px, transparent 18.5px),
      radial-gradient(circle at 40% 82%, rgba(255, 177, 66, 0.15) 0 12px, transparent 12.5px)
    `;
    styles.backgroundSize = '58px 58px';
  }

  return styles;
}

function normalizeTopFriends(topFriendsNode) {
  const clean = sanitizeNode(topFriendsNode);
  return Array.from({ length: 8 }, (_, index) => clean[`slot${index + 1}`] || '');
}

function createEmptyTopFriends() {
  return Array.from({ length: 8 }, () => '');
}

function normalizeComments(commentMap) {
  return Object.entries(commentMap)
    .filter(([, comment]) => comment && typeof comment === 'object')
    .map(([id, comment]) => ({
      id,
      van: comment.van || 'onbekend',
      tekst: comment.tekst || '',
      timestamp: Number(comment.timestamp) || 0
    }))
    .sort((left, right) => right.timestamp - left.timestamp);
}

export function MyspaceView({ currentUser = 'guest', gunApi = gun }) {
  const [profileUser, setProfileUser] = useState(currentUser || 'guest');
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [comments, setComments] = useState([]);
  const [topFriends, setTopFriends] = useState(createEmptyTopFriends);
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState(DEFAULT_PROFILE);
  const [draftTopFriends, setDraftTopFriends] = useState(createEmptyTopFriends);
  const [commentInput, setCommentInput] = useState('');
  const [profileLookup, setProfileLookup] = useState(currentUser || 'guest');
  const viewedProfilesRef = useRef(new Set());

  const isOwnProfile = profileUser === currentUser;
  const pageStyles = useMemo(() => getProfileStyles(profile), [profile]);

  useEffect(() => {
    setProfileUser(currentUser || 'guest');
    setProfileLookup(currentUser || 'guest');
  }, [currentUser]);

  useEffect(() => {
    setProfileLookup(profileUser);
  }, [profileUser]);

  useEffect(() => {
    const profilesRoot = gunApi?.get?.('MYSPACE_PROFILES');
    const topFriendsRoot = gunApi?.get?.('MYSPACE_TOPFRIENDS');
    const commentsRoot = gunApi?.get?.('MYSPACE_COMMENTS');

    const profileNode = profilesRoot?.get?.(profileUser);
    const topFriendsNode = topFriendsRoot?.get?.(profileUser);
    const commentNode = commentsRoot?.get?.(profileUser);
    const commentMapNode = commentNode?.map?.();

    if (profileNode?.on) {
      profileNode.on((nextProfile) => {
        const mergedProfile = {
          ...DEFAULT_PROFILE,
          ...sanitizeNode(nextProfile)
        };
        setProfile(mergedProfile);
      });
    } else {
      setProfile(DEFAULT_PROFILE);
    }

    if (topFriendsNode?.on) {
      topFriendsNode.on((nextTopFriends) => {
        setTopFriends(normalizeTopFriends(nextTopFriends));
      });
    } else {
      setTopFriends(createEmptyTopFriends());
    }

    if (commentMapNode?.on) {
      const nextComments = {};
      commentMapNode.on((comment, commentId) => {
        if (!comment || typeof comment !== 'object') {
          delete nextComments[commentId];
        } else {
          nextComments[commentId] = sanitizeNode(comment);
        }
        setComments(normalizeComments(nextComments));
      });
    } else {
      setComments([]);
    }

    if (!isOwnProfile && profileNode?.once && !viewedProfilesRef.current.has(profileUser)) {
      viewedProfilesRef.current.add(profileUser);
      profileNode.once((existingProfile) => {
        const currentVisitors = Number(existingProfile?.visitors) || 0;
        profileNode.get?.('visitors')?.put?.(currentVisitors + 1);
      });
    }

    return () => {
      if (commentMapNode?.off) {
        commentMapNode.off();
      } else if (commentNode?.off) {
        commentNode.off();
      }

      profileNode?.off?.();
      topFriendsNode?.off?.();
    };
  }, [gunApi, isOwnProfile, profileUser]);

  useEffect(() => {
    setIsEditing(false);
    setDraftProfile(profile);
    setDraftTopFriends(topFriends);
  }, [profile, topFriends, profileUser]);

  const handleSaveProfile = () => {
    const profileNode = gunApi?.get?.('MYSPACE_PROFILES')?.get?.(profileUser);
    const topFriendsNode = gunApi?.get?.('MYSPACE_TOPFRIENDS')?.get?.(profileUser);
    if (!profileNode?.put || !topFriendsNode?.put) return;

    profileNode.put({
      aboutMe: draftProfile.aboutMe.slice(0, 500),
      bgColor: draftProfile.bgColor || DEFAULT_PROFILE.bgColor,
      bgPattern: draftProfile.bgPattern || 'none',
      textColor: draftProfile.textColor || DEFAULT_PROFILE.textColor,
      songTitle: draftProfile.songTitle.slice(0, 80),
      songUrl: draftProfile.songUrl.slice(0, 300),
      mood: draftProfile.mood.slice(0, 60),
      visitors: Number(profile.visitors) || 0,
      lastUpdated: Date.now()
    });

    topFriendsNode.put(draftTopFriends.reduce((payload, friendUsername, index) => ({
      ...payload,
      [`slot${index + 1}`]: friendUsername.trim() || null
    }), {}));

    setIsEditing(false);
  };

  const handleSubmitComment = (event) => {
    event.preventDefault();
    const trimmedComment = commentInput.trim();
    if (!trimmedComment) return;

    const commentNode = gunApi?.get?.('MYSPACE_COMMENTS')?.get?.(profileUser);
    if (!commentNode?.get) return;

    const timestamp = Date.now();
    commentNode.get(String(timestamp)).put({
      van: currentUser,
      tekst: trimmedComment.slice(0, 200),
      timestamp
    });
    setCommentInput('');
  };

  return (
    <div className="myspace-page" style={pageStyles}>
      <div className="myspace-topbar">
        <div>
          <div className="myspace-wordmark">MySpace Chatlon</div>
          <div className="myspace-subtitle">Profielen, top friends, comments en een vleugje retro drama.</div>
        </div>
        <form
          className="myspace-profile-jump"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmedLookup = profileLookup.trim();
            if (!trimmedLookup) return;
            setProfileUser(trimmedLookup);
          }}
        >
          <label htmlFor="myspace-profile-lookup">Profiel bekijken</label>
          <div className="myspace-profile-jump__controls">
            <input
              id="myspace-profile-lookup"
              type="text"
              value={profileLookup}
              onChange={(event) => setProfileLookup(event.target.value)}
              placeholder="gebruikersnaam"
            />
            <button type="submit" className="yoctol-btn">Ga</button>
            {!isOwnProfile && (
              <button
                type="button"
                className="browser-secondary-btn"
                onClick={() => setProfileUser(currentUser)}
              >
                Mijn profiel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="myspace-hero">
        <div className="myspace-hero__primary">
          <div className="myspace-kicker">Profiel van</div>
          <h2>{profileUser}</h2>
          <div className="myspace-badges">
            <span>Mood: {profile.mood || 'nostalgisch online'}</span>
            <span>{Number(profile.visitors) || 0} bezoekers</span>
            <span>{profile.bgPattern || 'none'} patroon</span>
          </div>
        </div>

        {isOwnProfile && (
          <button
            type="button"
            className="myspace-edit-toggle"
            onClick={() => setIsEditing((previous) => !previous)}
          >
            {isEditing ? 'Annuleer bewerken' : 'Bewerk profiel'}
          </button>
        )}
      </div>

      <div className="myspace-grid">
        <section className="myspace-card">
          <div className="myspace-card__title">About Me</div>
          {isEditing ? (
            <div className="myspace-editor">
              <label className="myspace-field">
                <span>About me</span>
                <textarea
                  value={draftProfile.aboutMe}
                  onChange={(event) => setDraftProfile((previous) => ({
                    ...previous,
                    aboutMe: event.target.value
                  }))}
                  rows={7}
                />
              </label>

              <div className="myspace-field-grid">
                <label className="myspace-field">
                  <span>Mood</span>
                  <input
                    type="text"
                    value={draftProfile.mood}
                    onChange={(event) => setDraftProfile((previous) => ({
                      ...previous,
                      mood: event.target.value
                    }))}
                  />
                </label>

                <label className="myspace-field">
                  <span>Patroon</span>
                  <select
                    value={draftProfile.bgPattern}
                    onChange={(event) => setDraftProfile((previous) => ({
                      ...previous,
                      bgPattern: event.target.value
                    }))}
                  >
                    {PATTERN_OPTIONS.map((pattern) => (
                      <option key={pattern} value={pattern}>{pattern}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="myspace-field-grid">
                <label className="myspace-field">
                  <span>Achtergrondkleur</span>
                  <input
                    type="color"
                    value={draftProfile.bgColor}
                    onChange={(event) => setDraftProfile((previous) => ({
                      ...previous,
                      bgColor: event.target.value
                    }))}
                  />
                </label>

                <label className="myspace-field">
                  <span>Tekstkleur</span>
                  <input
                    type="color"
                    value={draftProfile.textColor}
                    onChange={(event) => setDraftProfile((previous) => ({
                      ...previous,
                      textColor: event.target.value
                    }))}
                  />
                </label>
              </div>

              <div className="myspace-field-grid">
                <label className="myspace-field">
                  <span>Song title</span>
                  <input
                    type="text"
                    value={draftProfile.songTitle}
                    onChange={(event) => setDraftProfile((previous) => ({
                      ...previous,
                      songTitle: event.target.value
                    }))}
                  />
                </label>

                <label className="myspace-field">
                  <span>Song URL</span>
                  <input
                    type="text"
                    value={draftProfile.songUrl}
                    onChange={(event) => setDraftProfile((previous) => ({
                      ...previous,
                      songUrl: event.target.value
                    }))}
                  />
                </label>
              </div>

              <div className="myspace-card__title myspace-card__title--sub">Top 8</div>
              <div className="myspace-topfriends-editor">
                {draftTopFriends.map((friendUsername, index) => (
                  <label key={`slot-${index + 1}`} className="myspace-field">
                    <span>Slot {index + 1}</span>
                    <input
                      type="text"
                      value={friendUsername}
                      onChange={(event) => {
                        const nextTopFriends = [...draftTopFriends];
                        nextTopFriends[index] = event.target.value;
                        setDraftTopFriends(nextTopFriends);
                      }}
                    />
                  </label>
                ))}
              </div>

              <div className="myspace-editor-actions">
                <button type="button" className="yoctol-btn" onClick={handleSaveProfile}>
                  Profiel opslaan
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="myspace-about-text">
                {profile.aboutMe || 'Nog geen about me ingevuld. Het internet voelt plots heel stil.'}
              </p>
              {profile.songUrl && (
                <div className="myspace-song-box">
                  <strong>{profile.songTitle || 'Profielliedje'}</strong>
                  <audio controls autoPlay src={profile.songUrl}>
                    Uw browser ondersteunt geen audio op dit profiel.
                  </audio>
                </div>
              )}
            </>
          )}
        </section>

        <section className="myspace-card">
          <div className="myspace-card__title">Top 8 friends</div>
          <div className="myspace-topfriends-grid">
            {topFriends.map((friendUsername, index) => (
              <button
                key={`friend-${index + 1}`}
                type="button"
                className="myspace-friend-tile"
                disabled={!friendUsername}
                onClick={() => friendUsername && setProfileUser(friendUsername)}
              >
                <span className="myspace-friend-slot">#{index + 1}</span>
                <strong>{friendUsername || 'Leeg slot'}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="myspace-card myspace-card--comments">
          <div className="myspace-card__title">Comments</div>
          <form className="myspace-comment-form" onSubmit={handleSubmitComment}>
            <textarea
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              rows={3}
              maxLength={200}
              placeholder={`Laat een bericht achter voor ${profileUser}`}
            />
            <button type="submit" className="yoctol-btn">Plaats comment</button>
          </form>

          <div className="myspace-comments-list">
            {comments.length === 0 && (
              <div className="myspace-comment-empty">Nog geen comments. Wees de eerste nostalgische bezoeker.</div>
            )}
            {comments.map((comment) => (
              <article key={comment.id} className="myspace-comment">
                <div className="myspace-comment__meta">
                  <strong>{comment.van}</strong>
                  <span>{comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'zojuist'}</span>
                </div>
                <p>{comment.tekst}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default MyspaceView;
