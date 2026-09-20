import { requireDatabase } from "../db/db.js";
import { validateMessage } from "./socialRules.js";

export async function listComments(userId, postId, limit = 50) {
  const db = requireDatabase();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const result = await db.query(
    `SELECT c.id,c.post_id,c.user_id,c.body,c.created_at,u.username,u.first_name,u.last_name
       FROM comments c JOIN users u ON u.id=c.user_id
      WHERE c.post_id=$1 ORDER BY c.created_at ASC LIMIT $2`,
    [postId, safeLimit]
  );
  return { ok: true, comments: result.rows };
}

export async function addComment(userId, postId, body) {
  const validation = validateMessage(body);
  if (!validation.ok) return validation;
  if (validation.value.length > 2000) return { ok:false, reason:"Comment is too long." };
  const db = requireDatabase();
  const post = await db.query("SELECT id,user_id FROM posts WHERE id=$1 AND visibility='public'", [postId]);
  if (!post.rowCount) return { ok:false, reason:"Post not found." };
  const result = await db.query(
    "INSERT INTO comments (post_id,user_id,body) VALUES ($1,$2,$3) RETURNING id,post_id,user_id,body,created_at",
    [postId,userId,validation.value]
  );
  if (Number(post.rows[0].user_id) !== Number(userId)) {
    await db.query(
      "INSERT INTO notifications (user_id,actor_id,type,reference_id) VALUES ($1,$2,$3,$4)",
      [post.rows[0].user_id,userId,"comment",postId]
    );
  }
  return { ok:true, comment:result.rows[0] };
}

export async function toggleRepost(userId, postId, reposted) {
  const db = requireDatabase();
  const post = await db.query("SELECT id,user_id FROM posts WHERE id=$1 AND visibility='public'", [postId]);
  if (!post.rowCount) return { ok:false, reason:"Post not found." };
  if (reposted) {
    await db.query("INSERT INTO reposts (post_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [postId,userId]);
    if (Number(post.rows[0].user_id) !== Number(userId)) {
      await db.query("INSERT INTO notifications (user_id,actor_id,type,reference_id) VALUES ($1,$2,$3,$4)", [post.rows[0].user_id,userId,"repost",postId]);
    }
  } else {
    await db.query("DELETE FROM reposts WHERE post_id=$1 AND user_id=$2", [postId,userId]);
  }
  const count = await db.query("SELECT COUNT(*)::int AS reposts_count FROM reposts WHERE post_id=$1", [postId]);
  return { ok:true,reposted,repostsCount:count.rows[0].reposts_count };
}

export async function listNotifications(userId, limit = 50) {
  const db = requireDatabase();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const result = await db.query(
    `SELECT n.id,n.type,n.reference_id,n.read_at,n.created_at,
            u.username AS actor_username,u.first_name AS actor_first_name,u.last_name AS actor_last_name
       FROM notifications n LEFT JOIN users u ON u.id=n.actor_id
      WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT $2`,
    [userId,safeLimit]
  );
  return { ok:true, notifications:result.rows };
}

export async function markNotificationsRead(userId) {
  const db = requireDatabase();
  await db.query("UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL", [userId]);
  return { ok:true };
}
