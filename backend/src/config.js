export const config = Object.freeze({
  port: Number(process.env.PORT || 3000),
  reward: Object.freeze({ maxPerVerifiedActivityNaira: 500, currency: "NGN" }),
  withdrawals: Object.freeze({ maxPerCalendarDay: 2 })
});
