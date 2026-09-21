/* Tinaab pre-launch signup preview.
 * This lets us test the next screen before the production backend is connected.
 * It never creates a real account, stores a password, or claims email verification.
 */
(function () {
  const getFeed = () => document.querySelector('#feed');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));

  function renderPreviewWelcome(firstName, username, email) {
    const feed = getFeed();
    if (!feed) return;
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
          <button class="primary full" id="previewContinue">Continue to Tinaab preview</button>
          <button class="text-btn" id="previewBack">Back to create account</button>
          <p class="muted">This is only a front-end preview. No account was saved and no email was sent.</p>
        </div>
      </section>`;
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('#authSubmit');
    if (!button) return;

    // Signup has the first-name field; login does not.
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
      const feed = getFeed();
      if (!feed) return;
      feed.innerHTML = `
        <section class="screen">
          <h1>Tinaab preview</h1>
          <div class="card">
            <strong>Your next step is ready</strong>
            <p>Next we will connect this screen to the real backend signup, email verification, and authenticated feed.</p>
            <button class="primary full" id="previewBackToSignup">Return to signup</button>
          </div>
        </section>`;
    }
    if (event.target.closest('#previewBack') || event.target.closest('#previewBackToSignup')) {
      if (typeof window.showView === 'function') window.showView('auth');
    }
  });
})();
