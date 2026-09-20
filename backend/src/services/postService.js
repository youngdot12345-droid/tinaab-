import { requireDatabase } from "../db/db.js";
import { validateCaption } from "./socialRules.js";

export async function createPost(userId, input = {}) {
  const validation = validateCaption(input.caption || "");
  if (!validation.ok) return validation;

  const mediaUrl = typeof input.mediaUrl === "string" ? input.mediaUrl.trim() : null;
  const mediaType = typeof input.mediaType === "string" ? input.mediaType.trim().slice(0, 40) : null;
  const visibility = input.visibility === "private" ? "private" : "public";
  const pool = requireDatabase();

  const result = await pool.query(
    `INSERT INTO posts (user_id, caption, media_url, media_type, visibility)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, caption, media_url, media_type, visibility, created_at`,
    [userId, validation.value, mediaUrl || null, mediaType || null, visibility]
  );

  return { ok: true, post: result.rows[0] };
}

export async function getPublicFeed(limit = 20, cursor = null) {
  const pool = requireDatabase();
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const values = [safeLimit];
  let cursorClause = "";

  if (cursor) {
    values.push(cursor);
    cursorClause = "WHERE p.created_at < $2";
  }

  const result = await pool.query(
    `SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type, p.created_at,
            u.username, u.first_name, u.last_name,
            (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ${cursorClause}
      ${cursorClause ? "AND" : "WHERE"} p.visibility = 'public'
      ORDER BY p.created_at DESC
      LIMIT $1`,
    values
  );

  return { ok: true, posts: result.rows };
}

export async function setPostLike(userId, postId, liked) {
  const pool = requireDatabase();
  const post = await pool.query("SELECT id FROM posts WHERE id = $1", [postId]);
  if (!post.rows[0]) return { ok: false, reason: "Post not found." };

  if (liked) {
    await pool.query(
      `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)
       ON CONFLICT (post_id, user_id) DO NOTHING`,
      [postId, userId]
    );
  } else {
    await pool.query("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", [postId, userId]);
  }

  const count = await pool.query("SELECT COUNT(*)::int AS likes_count FROM post_likes WHERE post_id = $1", [postId]);
  return { ok: true, liked, likesCount: count.rows[0].likes_count };
}
