import { requireDatabase } from "../db/db.js";
import { validateCaption } from "./socialRules.js";
import { calculateReward } from "./rewardService.js";

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

export async function getPublicFeed(limit = 20, cursor = null, viewerId = null) {
  const pool = requireDatabase();
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const values = [safeLimit, cursor || null, viewerId];
  let cursorClause = "";

  if (cursor) {
    values[1] = cursor;
    cursorClause = "WHERE p.created_at < $2";
  }

  const result = await pool.query(
    `SELECT p.id, p.user_id, p.caption, p.media_url, p.media_type, p.created_at,
            u.username, u.first_name, u.last_name,
            (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
            (SELECT COUNT(*) FROM reposts r WHERE r.post_id = p.id) AS reposts_count,
            CASE WHEN $3::bigint IS NULL THEN false ELSE EXISTS (SELECT 1 FROM post_likes vl WHERE vl.post_id = p.id AND vl.user_id = $3) END AS viewer_liked,
            CASE WHEN $3::bigint IS NULL THEN false ELSE EXISTS (SELECT 1 FROM reposts vr WHERE vr.post_id = p.id AND vr.user_id = $3) END AS viewer_reposted
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
  const db = requireDatabase();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const post = await client.query(
      "SELECT id,user_id FROM posts WHERE id=$1 AND visibility='public' FOR SHARE",
      [postId]
    );
    if (!post.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Post not found." };
    }

    let changed = false;
    if (liked) {
      const inserted = await client.query(
        `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)
         ON CONFLICT (post_id, user_id) DO NOTHING
         RETURNING post_id`,
        [postId, userId]
      );
      changed = inserted.rowCount > 0;

      if (changed && Number(post.rows[0].user_id) !== Number(userId)) {
        const reward = calculateReward("verified_like");
        const activityReference = `like:${postId}:${userId}`;
        await client.query(
          `INSERT INTO reward_claims
             (user_id,activity_type,server_amount_kobo,activity_reference,status)
           VALUES ($1,'verified_like',$2,$3,'pending')
           ON CONFLICT (user_id,activity_reference) DO NOTHING`,
          [post.rows[0].user_id, reward.amount * 100, activityReference]
        );
        await client.query(
          "INSERT INTO notifications (user_id,actor_id,type,reference_id) VALUES ($1,$2,'like',$3)",
          [post.rows[0].user_id, userId, postId]
        );
      }
    } else {
      const deleted = await client.query(
        "DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2 RETURNING post_id",
        [postId, userId]
      );
      changed = deleted.rowCount > 0;
    }

    const count = await client.query(
      "SELECT COUNT(*)::int AS likes_count FROM post_likes WHERE post_id = $1",
      [postId]
    );

    await client.query("COMMIT");
    return { ok: true, liked, changed, likesCount: count.rows[0].likes_count };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
