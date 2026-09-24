import { requireDatabase } from "../db/db.js";
import { validateMessage } from "./socialRules.js";

export async function listConversations(userId) {
  const db = requireDatabase();
  const result = await db.query(
    `SELECT c.id,c.created_at,
            (SELECT COUNT(*) FROM messages um WHERE um.conversation_id=c.id AND um.sender_id<>$1 AND um.read_at IS NULL) AS unread_count,
            COALESCE(json_agg(json_build_object(
              'id',u.id,'username',u.username,'firstName',u.first_name,'lastName',u.last_name
            ) ORDER BY u.username) FILTER (WHERE u.id IS NOT NULL),'[]') AS members,
            (SELECT json_build_object('id',m.id,'body',m.body,'senderId',m.sender_id,'createdAt',m.created_at,'readAt',m.read_at)
               FROM messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) AS last_message
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id=c.id AND cm.user_id=$1
       LEFT JOIN conversation_members other_cm ON other_cm.conversation_id=c.id AND other_cm.user_id<>$1
       LEFT JOIN users u ON u.id=other_cm.user_id
      GROUP BY c.id
      ORDER BY COALESCE((SELECT MAX(m2.created_at) FROM messages m2 WHERE m2.conversation_id=c.id),c.created_at) DESC
      LIMIT 50`,
    [userId]
  );
  return { ok:true, conversations:result.rows };
}

export async function createConversation(userId, otherUserId) {
  const targetId=Number(otherUserId);
  if (!Number.isSafeInteger(targetId) || targetId<=0 || targetId===Number(userId)) {
    return { ok:false, reason:"Choose another valid user." };
  }
  const db=requireDatabase();
  const target=await db.query("SELECT id,username,first_name,last_name FROM users WHERE id=$1",[targetId]);
  if(!target.rowCount) return { ok:false, reason:"User not found." };
  const existing=await db.query(
    `SELECT c.id FROM conversations c
      JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=$1
      JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=$2
      WHERE (SELECT COUNT(*) FROM conversation_members x WHERE x.conversation_id=c.id)=2
      LIMIT 1`,[userId,targetId]);
  if(existing.rowCount) return {ok:true,conversation:{id:existing.rows[0].id},created:false};
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const c=await client.query("INSERT INTO conversations DEFAULT VALUES RETURNING id,created_at");
    await client.query("INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2),($1,$3)",[c.rows[0].id,userId,targetId]);
    await client.query("COMMIT");
    return {ok:true,conversation:c.rows[0],created:true};
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

async function requireMember(db,userId,conversationId){
  const result=await db.query("SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",[conversationId,userId]);
  return result.rowCount>0;
}

export async function listMessages(userId, conversationId, limit=50, beforeId=null) {
  const db=requireDatabase();
  const id=Number(conversationId);
  if(!Number.isSafeInteger(id)||id<=0) return {ok:false,reason:"Invalid conversation."};
  if(!await requireMember(db,userId,id)) return {ok:false,reason:"Conversation not found."};
  const safeLimit=Math.min(Math.max(Number(limit)||50,1),100);
  const hasBefore=beforeId!==null&&beforeId!==undefined&&String(beforeId).trim()!=="";
  const parsedBefore=hasBefore?Number(beforeId):null;
  if(hasBefore&&(!Number.isSafeInteger(parsedBefore)||parsedBefore<=0)) return {ok:false,reason:"Invalid pagination cursor."};
  const values=[id,safeLimit];
  const clause=hasBefore?"AND m.id < $3":"";
  if(hasBefore) values.push(parsedBefore);
  const result=await db.query(
    `SELECT m.id,m.conversation_id,m.sender_id,m.body,m.created_at,m.read_at,
            u.username,u.first_name,u.last_name
       FROM messages m JOIN users u ON u.id=m.sender_id
      WHERE m.conversation_id=$1 ${clause}
      ORDER BY m.id DESC LIMIT $2`,values);
  return {ok:true,messages:result.rows.reverse()};
}

export async function sendMessage(userId, conversationId, body) {
  const validation=validateMessage(body);
  if(!validation.ok) return validation;
  const db=requireDatabase();
  const id=Number(conversationId);
  if(!Number.isSafeInteger(id)||id<=0) return {ok:false,reason:"Invalid conversation."};
  if(!await requireMember(db,userId,id)) return {ok:false,reason:"Conversation not found."};

  // Basic server-side anti-spam protection: limit each member to 30 messages per minute.
  const recent=await db.query(
    `SELECT COUNT(*)::int AS count
       FROM messages
      WHERE sender_id=$1 AND created_at > NOW() - INTERVAL '1 minute'`,
    [userId]
  );
  if(Number(recent.rows[0]?.count||0)>=30){
    return {ok:false,reason:"You are sending messages too quickly. Please wait a moment."};
  }

  const result=await db.query(
    `INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,$3)
     RETURNING id,conversation_id,sender_id,body,created_at,read_at`,
    [id,userId,validation.value]);
  return {ok:true,message:result.rows[0]};
}

export async function markConversationRead(userId, conversationId) {
  const db=requireDatabase();
  const id=Number(conversationId);
  if(!Number.isSafeInteger(id)||id<=0) return {ok:false,reason:"Invalid conversation."};
  if(!await requireMember(db,userId,id)) return {ok:false,reason:"Conversation not found."};
  await db.query("UPDATE messages SET read_at=NOW() WHERE conversation_id=$1 AND sender_id<>$2 AND read_at IS NULL",[id,userId]);
  return {ok:true};
}
