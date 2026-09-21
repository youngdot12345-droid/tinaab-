import { requireDatabase } from "../db/db.js";

function clamp(value, fallback = 50, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

function searchTerm(value) {
  return String(value || "").trim().slice(0, 80);
}

export async function getAdminOverview() {
  const db = requireDatabase();
  const result = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE email_verified = TRUE) AS verified_users,
      (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days') AS recent_users,
      (SELECT COUNT(*)::int FROM posts) AS total_posts,
      (SELECT COUNT(*)::int FROM reward_claims WHERE status = 'pending') AS pending_reviews,
      (SELECT COUNT(*)::int FROM withdrawal_requests WHERE status = 'pending') AS pending_withdrawals
  `);

  const row = result.rows[0] || {};
  return {
    ok: true,
    stats: {
      totalUsers: row.total_users || 0,
      verifiedUsers: row.verified_users || 0,
      recentUsers: row.recent_users || 0,
      totalPosts: row.total_posts || 0,
      pendingReviews: row.pending_reviews || 0,
      pendingWithdrawals: row.pending_withdrawals || 0
    }
  };
}

export async function listAdminUsers({ limit, offset, search } = {}) {
  const db = requireDatabase();
  const safeLimit = clamp(limit, 50, 100);
  const safeOffset = Math.max(Number.isFinite(Number(offset)) ? Math.floor(Number(offset)) : 0, 0);
  const term = searchTerm(search);
  const pattern = `%${term}%`;

  const result = await db.query(`
    SELECT id, username, first_name, last_name,
           email_verified AS verified, role, created_at
      FROM users
     WHERE ($1 = '' OR username ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2)
     ORDER BY id DESC
     LIMIT $3 OFFSET $4
  `, [term, pattern, safeLimit, safeOffset]);

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total
       FROM users
      WHERE ($1 = '' OR username ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2)`,
    [term, pattern]
  );

  return {
    ok: true,
    users: result.rows,
    totalUsers: countResult.rows[0]?.total || 0,
    limit: safeLimit,
    offset: safeOffset
  };
}
