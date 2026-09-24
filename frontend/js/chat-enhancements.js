(() => {
  const POLL_MS = 8000;
  let pollTimer = null;
  let lastConversation = null;

  function stopPolling() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
  }

  function startPolling(conversationId) {
    stopPolling();
    if (!conversationId) return;
    lastConversation = String(conversationId);
    pollTimer = window.setInterval(async () => {
      const input = document.querySelector('#messageBody');
      if (!document.querySelector('#messages') || !input || String(lastConversation) !== String(conversationId)) {
        stopPolling();
        return;
      }
      if (document.activeElement === input && input.value.trim()) return;
      try {
        const result = await TinaabAPI.get('/api/conversations/' + encodeURIComponent(conversationId) + '/messages');
        const messages = result.messages || [];
        const box = document.querySelector('#messages');
        if (!box) return;
        const html = messages.map(message => {
          const mine = window.__tinaabCurrentUserId && Number(message.sender_id) === Number(window.__tinaabCurrentUserId);
          return '<div class="message ' + (mine ? 'mine' : '') + '"><span>' + escapeChatText(message.body) + '</span></div>';
        }).join('');
        if (html && box.innerHTML !== html) {
          box.innerHTML = html;
          box.scrollTop = box.scrollHeight;
        }
      } catch (_) {
        // Keep the existing conversation usable when polling temporarily fails.
      }
    }, POLL_MS);
  }

  function escapeChatText(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    if (event.target?.id !== 'messageBody') return;
    event.preventDefault();
    document.querySelector('#sendMessage')?.click();
  });

  const observer = new MutationObserver(() => {
    const sendButton = document.querySelector('#sendMessage');
    const messages = document.querySelector('#messages');
    if (!sendButton || !messages) {
      stopPolling();
      return;
    }
    const conversationId = sendButton.dataset.conversation;
    if (conversationId && String(conversationId) !== String(lastConversation)) {
      startPolling(conversationId);
    }
    messages.scrollTop = messages.scrollHeight;
  });

  window.addEventListener('beforeunload', stopPolling);
  observer.observe(document.body, { childList: true, subtree: true });
})();
