const MAX_CAPTION = 5000;
const MAX_MESSAGE = 10000;

export function validateCaption(caption = "") {
  if (typeof caption !== "string" || caption.length > MAX_CAPTION) {
    return { ok:false, reason:"Caption is invalid or too long." };
  }
  return { ok:true, value:caption.trim() };
}

export function validateMessage(body = "") {
  if (typeof body !== "string") return { ok:false, reason:"Message is invalid." };
  const value = body.trim();
  if (!value || value.length > MAX_MESSAGE) {
    return { ok:false, reason:"Message is empty or too long." };
  }
  return { ok:true, value };
}

export function canFollow(followerId, followingId) {
  if (!followerId || !followingId || String(followerId) === String(followingId)) {
    return { ok:false, reason:"You cannot follow this account." };
  }
  return { ok:true };
}
