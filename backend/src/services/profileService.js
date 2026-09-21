import { requireDatabase } from "../db/db.js";
import { canFollow } from "./socialRules.js";

export async function getProfileByUsername(username, viewerId = null) {
  const pool = requireDatabase();
  const result = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.username, u.email_verified,
            u.created_at,
            (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS followers_count,
            (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS following_count,
            (SELECT COUNT(*) FROM post_likes pl JOIN posts p ON p.id = pl.post_id WHERE p.user_id = u.id) AS likes_count,
            (SELECT COUNT(*) FROM reposts r JOIN posts p ON p.id = r.post_id WHERE p.user_id = u.id) AS reposts_count,
            CASE WHEN $2::bigint IS NULL THEN false
                 ELSE EXISTS (SELECT 1 FROM follows vf WHERE vf.follower_id = $2 AND vf.following_id = u.id)
            END AS is_following
       FROM users u
      WHERE LOWER(u.username) = LOWER($1)
      LIMIT 1`,
    [String(username || "").trim(), viewerId]
  );

  if (!result.rows[0]) return null;
  return result.rows[0];
}

export async function followUser(followerId, followingId) {
  const validation = canFollow(followerId, followingId);
  if (!validation.ok) return validation;

  const pool = requireDatabase();
  const target = await pool.query("SELECT id FROM users WHERE id = $1", [followingId]);
  if (!target.rows[0]) return { ok: false, reason: "User not found." };

  await pool.query(
    `INSERT INTO follows (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, following_id) DO NOTHING`,
    [followerId, followingId]
  );

  return { ok: true, following: true };
}

export async function unfollowUser(followerId, followingId) {
  const validation = canFollow(followerId, followingId);
  if (!validation.ok) return validation;

  const pool = requireDatabase();
  await pool.query(
    "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
    [followerId, followingId]
  );

  return { ok: true, following: false };
}

export async function getFollowingFeed(userId, limit = 20, cursor = null) {
  const pool = requireDatabase();
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const values = [userId, safeLimit];
  let cursorClause = "";

  if (cursor) {
    values.push(cursor);
    cursorClause = "AND p.created_at < $3";
  }

  const result = await pool.query(
    `SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type, p.created_at,
            u.username, u.first_name, u.last_name,
            (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
            (SELECT COUNT(*) FROM reposts r WHERE r.post_id = p.id) AS reposts_count,
            EXISTS (SELECT 1 FROM post_likes vl WHERE vl.post_id = p.id AND vl.user_id = $1) AS viewer_liked,
            EXISTS (SELECT 1 FROM reposts vr WHERE vr.post_id = p.id AND vr.user_id = $1) AS viewer_reposted,
            true AS viewer_following
       FROM posts p
       JOIN users u ON u.id = p.user_id
       JOIN follows f ON f.following_id = p.user_id AND f.follower_id = $1
      WHERE p.visibility = 'public' ${cursorClause}
      ORDER BY p.created_at DESC
      LIMIT $2`,
    values
  );

  return { ok: true, posts: result.rows };
}

export async function searchUsers(query, limit = 20) {
  const pool = requireDatabase();
  const q = String(query || "").trim();
  if (!q) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 30);
  const result = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.username,
            (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS followers_count
       FROM users u
      WHERE LOWER(u.username) LIKE LOWER($1)
         OR LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER($1)
      ORDER BY u.username ASC
      LIMIT $2`,
    [`%${q}%`, safeLimit]
  );
  return result.rows;
}

export async function getUserPosts(userId, viewerId = null, limit = 30) {
  const pool = requireDatabase();
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);
  const result = await pool.query(
    `SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type, p.visibility, p.created_at,
            u.username, u.first_name, u.last_name,
            (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
            (SELECT COUNT(*) FROM reposts r WHERE r.post_id = p.id) AS reposts_count,
            CASE WHEN $2::bigint IS NULL THEN false ELSE EXISTS (SELECT 1 FROM post_likes vl WHERE vl.post_id = p.id AND vl.user_id = $2) END AS viewer_liked,
            CASE WHEN $2::bigint IS NULL THEN false ELSE EXISTS (SELECT 1 FROM reposts vr WHERE vr.post_id = p.id AND vr.user_id = $2) END AS viewer_reposted,
            CASE WHEN $2::bigint IS NULL THEN false ELSE EXISTS (SELECT 1 FROM follows vf WHERE vf.follower_id = $2 AND vf.following_id = p.user_id) END AS viewer_following
       FROM posts p
       JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1
        AND (p.visibility = 'public' OR $2::bigint = $1)
      ORDER BY p.created_at DESC
      LIMIT $3`,
    [userId, viewerId, safeLimit]
  );
  return result.rows;
}
