import { config } from "../config.js";

export function canWithdrawToday(withdrawalsToday) {
  return Number(withdrawalsToday) < config.withdrawals.maxPerCalendarDay;
}

export function validateWithdrawalAmount(amountKobo, availableKobo) {
  if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
    return { ok:false, reason:"Invalid withdrawal amount." };
  }
  if (amountKobo > availableKobo) {
    return { ok:false, reason:"Insufficient available balance." };
  }
  return { ok:true };
}
