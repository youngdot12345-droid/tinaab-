import { requireDatabase } from "../db/db.js";
import { validateMessage } from "./socialRules.js";
import { calculateReward } from "./rewardService.js";

async function queueReward(client, userId, activityType, activityReference) {
  const reward = calculateReward(activityType);
  if (!reward.ok) return;
  await client.query(
    `INSERT INTO reward_claims
       (user_id,activity_type,server_amount_kobo,activity_reference,status)
     VALUES ($1,$2,$3,$4,'pending')
     ON CONFLICT (user_id,activity_reference) DO NOTHING`,
    [userId, activityType, reward.amount * 100, activityReference]
  );
}

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
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const post = await client.query("SELECT id,user_id FROM posts WHERE id=$1 AND visibility='public' FOR SHARE", [postId]);
    if (!post.rowCount) { await client.query("ROLLBACK"); return { ok:false, reason:"Post not found." }; }

    const result = await client.query(
      "INSERT INTO comments (post_id,user_id,body) VALUES ($1,$2,$3) RETURNING id,post_id,user_id,body,created_at",
      [postId,userId,validation.value]
    );

    if (Number(post.rows[0].user_id) !== Number(userId)) {
      await queueReward(client, post.rows[0].user_id, "verified_comment", `comment:${result.rows[0].id}`);
      await client.query(
        "INSERT INTO notifications (user_id,actor_id,type,reference_id) VALUES ($1,$2,'comment',$3)",
        [post.rows[0].user_id,userId,postId]
      );
    }

    await client.query("COMMIT");
    return { ok:true, comment:result.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function toggleRepost(userId, postId, reposted) {
  const db = requireDatabase();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const post = await client.query("SELECT id,user_id FROM posts WHERE id=$1 AND visibility='public' FOR SHARE", [postId]);
    if (!post.rowCount) { await client.query("ROLLBACK"); return { ok:false, reason:"Post not found." }; }

    if (reposted) {
      const inserted = await client.query(
        "INSERT INTO reposts (post_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING post_id",
        [postId,userId]
      );
      if (inserted.rowCount && Number(post.rows[0].user_id) !== Number(userId)) {
        await queueReward(client, post.rows[0].user_id, "verified_repost", `repost:${postId}:${userId}`);
        await client.query(
          "INSERT INTO notifications (user_id,actor_id,type,reference_id) VALUES ($1,$2,'repost',$3)",
          [post.rows[0].user_id,userId,postId]
        );
      }
    } else {
      await client.query("DELETE FROM reposts WHERE post_id=$1 AND user_id=$2", [postId,userId]);
    }

    const count = await client.query("SELECT COUNT(*)::int AS reposts_count FROM reposts WHERE post_id=$1", [postId]);
    await client.query("COMMIT");
    return { ok:true,reposted,repostsCount:count.rows[0].reposts_count };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
