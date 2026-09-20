const NAIRA_PER_KOBO = 100;

export function nairaToKobo(naira) {
  const value = Number(naira);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid naira amount.");
  return value * NAIRA_PER_KOBO;
}

export function koboToNaira(kobo) {
  if (!Number.isSafeInteger(kobo)) throw new Error("Invalid kobo amount.");
  return kobo / NAIRA_PER_KOBO;
}

export function rewardToKobo(rewardNaira) {
  if (!Number.isSafeInteger(rewardNaira) || rewardNaira < 0) throw new Error("Invalid reward.");
  return rewardNaira * NAIRA_PER_KOBO;
}
