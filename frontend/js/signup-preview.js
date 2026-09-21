/* Tinaab pre-launch signup preview.
 * This is a safe frontend-only demo until the real backend signup is connected.
 * It never creates an account, stores a password, or claims email verification.
 */
(function () {
  const getFeed = () => document.querySelector('#feed');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));

  let previewUser = { firstName: '', username: '', email: '' };
  let previewLiked = false;
  let previewFollowing = false;
  let previewCommentCount = 0;
  let previewCaption = 'Welcome to Tinaab! This is a sample post for testing the feed.';

  function renderPreviewWelcome(firstName, username, email) {
    const feed = getFeed();
    if (!feed) return;
    previewUser = { firstName, username, email };
    feed.innerHTML = `
      <section class="screen">
        <h1>Welcome to Tinaab 🎉</h1>
        <div class="card auth-card">
          <p><strong>Preview mode</strong></p>
          <p>Hello ${escapeHtml(firstName)}! Your next onboarding screen is working.</p>
          <div class="card">
            <strong>Account details</strong>
            <p>Username: @${escapeHtml(username)}</p>
            <p>Email: ${escapeHtml(email)}</p>
          </div>
          <div class="card">
            <strong>What comes next?</strong>
            <p>In production, Tinaab will create the account on the server, send an email verification code, and then open the verified-user onboarding flow.</p>
          </div>
          <button class="primary full" id="previewContinue">Continue</button>
          <button class="text-btn" id="previewBack">Back to create account</button>
          <p class="muted">This is only a front-end preview. No account was saved and no email was sent.</p>
        </div>
      </section>`;
  }

  function renderProfileSetup() {
    const feed = getFeed();
    if (!feed) return;
    feed.innerHTML = `
      <section class="screen">
        <h1>Complete your profile</h1>
        <div class="card auth-card">
          <p class="muted">This is the next screen after signup. You can skip these details for now.</p>
          <label for="previewBio">Short bio</label>
          <textarea id="previewBio" maxlength="160" placeholder="Tell people a little about yourself" style="display:block;width:100%;min-height:100px;margin:10px 0;padding:14px 15px;border-radius:12px;border:1px solid #ffffff18;background:#0b0b0b;color:#fff;resize:vertical"></textarea>
          <label for="previewInterest">What are you interested in?</label>
          <select id="previewInterest" style="display:block;width:100%;margin:10px 0;padding:14px 15px;border-radius:12px;border:1px solid #ffffff18;background:#0b0b0b;color:#fff">
            <option value="">Choose an interest</option>
            <option>Entertainment</option>
            <option>Education</option>
            <option>Business</option>
            <option>Sports</option>
            <option>Technology</option>
            <option>Fashion</option>
          </select>
          <button class="primary full" id="previewFinishSetup">Continue to Tinaab</button>
          <button class="text-btn" id="previewSkipSetup">Skip for now</button>
        </div>
      </section>`;
  }

  function renderPreviewHome() {
    const feed = getFeed();
    if (!feed) return;
    feed.innerHTML = `
      <section class="screen">
        <h1>Welcome to your Tinaab feed</h1>
        <div class="card">
          <strong>Hello ${escapeHtml(previewUser.firstName)} 👋</strong>
          <p class="muted">@${escapeHtml(previewUser.username)}</p>
          <p>Your account journey preview is complete. The real version will load posts from the Tinaab backend after authentication.</p>
        </div>
        <article class="post">
          <div class="post-info">
            <strong>@tinaab</strong>
            <div class="caption">${escapeHtml(previewCaption)}</div>
            <div class="tag">#tinaab #preview</div>
          </div>
          <div class="actions">
            <button class="action" id="previewLike"><span>${previewLiked ? '♥' : '♡'}</span><small>${previewLiked ? 1 : 0}</small></button>
            <button class="action" id="previewComment"><span>○</span><small>${previewCommentCount}</small></button>
            <button class="action" id="previewFollow"><span>${previewFollowing ? '✓' : '＋'}</span><small>${previewFollowing ? 'Following' : 'Follow'}</small></button>
          </div>
        </article>
        <div class="card auth-card">
          <strong>Test a sample post</strong>
          <p class="muted">This changes the local preview only. It does not publish to the server.</p>
          <textarea id="previewPostCaption" maxlength="500" placeholder="Write a sample caption..." style="display:block;width:100%;min-height:100px;margin:10px 0;padding:14px 15px;border-radius:12px;border:1px solid #ffffff18;background:#0b0b0b;color:#fff;resize:vertical"></textarea>
          <button class="primary full" id="previewUpdatePost">Update sample post</button>
        </div>
        <div class="card">
          <strong>Explore Tinaab</strong>
          <p>For You · Following · Chat · Wallet · Profile</p>
          <p class="muted">These areas will connect to live backend data after the production authentication setup.</p>
        </div>
        <button class="primary full" id="previewReturnProfile">Return to profile</button>
        <p class="muted">Preview only: no account or profile data was saved.</p>
      </section>`;
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('#authSubmit');
    if (!button) return;

    const firstNameInput = document.querySelector('#firstName');
    if (!firstNameInput) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const firstName = firstNameInput.value.trim();
    const lastName = document.querySelector('#lastName')?.value.trim();
    const username = document.querySelector('#username')?.value.trim();
    const email = document.querySelector('#email')?.value.trim();
    const password = document.querySelector('#password')?.value || '';

    if (!firstName || !lastName || !username || !email || !password) {
      alert('Please complete all signup fields for the preview.');
      return;
    }
    if (password.length < 10) {
      alert('Use a password with at least 10 characters for this preview.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Enter a valid email address.');
      return;
    }

    // Do not retain or send the password in preview mode.
    renderPreviewWelcome(firstName, username, email);
  }, true);

  document.addEventListener('click', (event) => {
    if (event.target.closest('#previewContinue')) {
      renderProfileSetup();
    }
    if (event.target.closest('#previewFinishSetup') || event.target.closest('#previewSkipSetup')) {
      renderPreviewHome();
    }
    if (event.target.closest('#previewLike')) {
      previewLiked = !previewLiked;
      renderPreviewHome();
    }
    if (event.target.closest('#previewFollow')) {
      previewFollowing = !previewFollowing;
      renderPreviewHome();
    }
    if (event.target.closest('#previewComment')) {
      previewCommentCount += 1;
      alert('Preview comment added. The real version will open the server-backed comments screen.');
      renderPreviewHome();
    }
    if (event.target.closest('#previewUpdatePost')) {
      const nextCaption = document.querySelector('#previewPostCaption')?.value.trim();
      if (nextCaption) previewCaption = nextCaption;
      renderPreviewHome();
    }
    if (event.target.closest('#previewReturnProfile')) {
      if (typeof window.showView === 'function') window.showView('profile');
    }
    if (event.target.closest('#previewBack')) {
      if (typeof window.showView === 'function') window.showView('auth');
    }
  });
})();
