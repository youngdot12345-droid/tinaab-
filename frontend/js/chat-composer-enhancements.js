(() => {
  const MAX_LENGTH = 10000;
  let activeInput = null;
  let counter = null;

  function removeCounter() {
    if (counter?.parentNode) counter.parentNode.removeChild(counter);
    counter = null;
    activeInput = null;
  }

  function updateCounter() {
    if (!activeInput || !counter) return;
    const length = activeInput.value.length;
    counter.textContent = `${length.toLocaleString()} / ${MAX_LENGTH.toLocaleString()}`;
    counter.classList.toggle('is-near-limit', length >= MAX_LENGTH * 0.9);
  }

  function enhance() {
    const input = document.querySelector('#messageBody');
    const button = document.querySelector('#sendMessage');
    if (!input || !button) {
      removeCounter();
      return;
    }
    if (activeInput !== input) {
      removeCounter();
      activeInput = input;
      input.maxLength = MAX_LENGTH;
      input.setAttribute('aria-label', 'Message text');
      button.setAttribute('aria-label', 'Send message');
      counter = document.createElement('small');
      counter.className = 'message-counter';
      counter.setAttribute('aria-live', 'polite');
      input.insertAdjacentElement('afterend', counter);
      input.addEventListener('input', updateCounter);
    }
    button.disabled = !input.value.trim();
    updateCounter();
  }

  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('input', event => {
    if (event.target?.id === 'messageBody') enhance();
  });
  enhance();
})();
