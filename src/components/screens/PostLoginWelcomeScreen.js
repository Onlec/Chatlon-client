import React from 'react';

function PostLoginWelcomeScreen({ fadingOut = false }) {
  return (
    <div className={`xp-login xp-post-login-welcome${fadingOut ? ' xp-post-login-welcome--fade-out' : ''}`}>
      <div className="xp-top-bar" />

      <div className="xp-main xp-post-login-welcome-main">
        <div className="xp-post-login-welcome-title">Welkom</div>
      </div>

      <div className="xp-bottom-bar">
        <div className="xp-bottom-strip" />
      </div>
    </div>
  );
}

export default PostLoginWelcomeScreen;
