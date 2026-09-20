const BASE_URL = "https://api.paystack.co";

function getSecretKey() {
  const key = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
  if (!key) {
    const error = new Error("PAYSTACK_SECRET_KEY is not configured.");
    error.statusCode = 503;
    throw error;
  }
  return key;
}

async function request(path, options = {}) {
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + getSecretKey(),
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status === false) {
    const error = new Error(body.message || "Paystack request failed.");
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.provider = body;
    throw error;
  }
  return body;
}

export function initializeTransaction(payload) {
  return request("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function verifyTransaction(reference) {
  return request("/transaction/verify/" + encodeURIComponent(reference), { method: "GET" });
}

export function createTransferRecipient(payload) {
  return request("/transferrecipient", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function initiateTransfer(payload) {
  return request("/transfer", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function verifyTransfer(reference) {
  return request("/transfer/verify/" + encodeURIComponent(reference), { method: "GET" });
}
