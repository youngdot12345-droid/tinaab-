/* Tinaab production authentication guard.
 * Handles signup errors clearly and keeps the user informed.
 * This file never stores passwords or bypasses email verification.
 */
(function () {
  const feed = () => document.querySelector('#feed');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));

  function showSignupError(message) {
    const existing = document.querySelector('#signupError');
    if (existing) existing.remove();
    const form = document.querySelector('#authSubmit')?.closest('.auth-card');
    if (!form) return;
    const box = document.createElement('div');
    box.id = 'signupError';
    box.setAttribute('role', 'alert');
    box.style.cssText = 'margin-top:12px;padding:12px 14px;border-radius:12px;background:#4a1717;color:#ffd8d8;border:1px solid #9f3c3c;font-size:14px;line-height:1.45;';
    box.textContent = message || 'Signup could not be completed. Please try again.';
    form.appendChild(box);
  }

  function renderVerification(email) {
    const target = feed();
    if (!target) return;
    target.innerHTML = `<section class="screen"><h1>Verify email</h1><div class="card auth-card"><p>Enter the 6-digit code sent to <strong>${escapeHtml(email)}</strong>.</p><input id="productionVerifyCode" inputmode="numeric" maxlength="6" placeholder="Verification code" autocomplete="one-time-code"><button class="primary full" id="productionVerifySubmit">Verify email</button><button class="text-btn" id="productionVerifyBack">Back</button><p class="muted">Check your inbox and spam folder. The code expires in 10 minutes.</p></div></section>`;

    document.querySelector('#productionVerifySubmit')?.addEventListener('click', async () => {
      const code = document.querySelector('#productionVerifyCode')?.value.trim();
      if (!/^\d{6}$/.test(code || '')) {
        alert('Enter the 6-digit verification code.');
        return;
      }
      const button = document.querySelector('#productionVerifySubmit');
      button.disabled = true;
      button.textContent = 'Verifying...';
      try {
        const result = await TinaabAPI.verifyEmail(email, code);
        if (!result.ok) throw new Error(result.reason || 'Email verification failed.');
        alert('Email verified successfully. You can now log in.');
        window.location.reload();
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Verify email';
        target.querySelector('.muted')?.insertAdjacentText('beforebegin', ` ${error.message || 'Verification failed.'}`);
      }
    });

    document.querySelector('#productionVerifyBack')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('#authSubmit');
    if (!button) return;

    // Login is handled by the main app. This guard only owns the signup form.
    const firstName = document.querySelector('#firstName');
    if (!firstName) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const firstNameValue = firstName.value.trim();
    const lastName = document.querySelector('#lastName')?.value.trim();
    const username = document.querySelector('#username')?.value.trim();
    const email = document.querySelector('#email')?.value.trim().toLowerCase();
    const password = document.querySelector('#password')?.value || '';

    if (!firstNameValue || !lastName || !username || !email || !password) {
      showSignupError('Complete your first name, last name, username, email, and password.');
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(username.toLowerCase())) {
      showSignupError('Username must be 3–30 characters and use only letters, numbers, or underscores.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showSignupError('Enter a valid email address.');
      return;
    }
    if (password.length < 10) {
      showSignupError('Password must be at least 10 characters.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Creating account...';
    try {
      const result = await TinaabAPI.signup({ firstName: firstNameValue, lastName, username, email, password });
      if (!result.ok) throw new Error(result.reason || result.error || 'Signup could not be completed.');
      renderVerification(email);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Create account';
      showSignupError(error.message || 'Request failed. Please try again.');
    }
  }, true);
})();
