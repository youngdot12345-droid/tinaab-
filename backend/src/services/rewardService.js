import { config } from "../config.js";
const REWARD_RULES = Object.freeze({
  verified_referral: 500, verified_like: 500, verified_comment: 500,
  verified_repost: 500, verified_share: 500, verified_live_engagement: 500
});
export function calculateReward(activityType) {
  const configured = REWARD_RULES[activityType];
  if (configured === undefined) return { ok:false, amount:0, reason:"Activity is not rewardable." };
  const amount = Math.min(configured, config.reward.maxPerVerifiedActivityNaira);
  return { ok:true, amount, currency:config.reward.currency };
}
export function validateClientRewardClaim(activityType, clientAmount) {
  const result = calculateReward(activityType);
  if (!result.ok) return result;
  if (!Number.isInteger(clientAmount) || clientAmount < 0) return { ok:false, amount:0, reason:"Invalid reward amount." };
  if (clientAmount !== result.amount) return { ok:false, amount:0, reason:"Reward amount is controlled by Tinaab's server." };
  return result;
}
