import { getUserFromToken } from "./services/authService.js";
import { createConversation, listConversations, listMessages, markConversationRead, sendMessage } from "./services/chatService.js";

function readBearerToken(req){const header=String(req.headers.authorization||"");return header.startsWith("Bearer ")?header.slice(7).trim():null}
async function requireUser(req,res){const user=await getUserFromToken(readBearerToken(req));if(!user){res.status(401).json({ok:false,reason:"Authentication required."});return null}return user}

export function registerChatRoutes(app){
  app.get("/api/conversations",async(req,res,next)=>{try{const user=await requireUser(req,res);if(!user)return;res.json(await listConversations(user.id))}catch(error){next(error)}});
  app.post("/api/conversations",async(req,res,next)=>{try{const user=await requireUser(req,res);if(!user)return;const result=await createConversation(user.id,req.body?.userId);res.status(result.ok?201:400).json(result)}catch(error){next(error)}});
  app.get("/api/conversations/:id/messages",async(req,res,next)=>{try{const user=await requireUser(req,res);if(!user)return;const result=await listMessages(user.id,req.params.id,req.query.limit,req.query.beforeId);res.status(result.ok?200:400).json(result)}catch(error){next(error)}});
  app.post("/api/conversations/:id/messages",async(req,res,next)=>{try{const user=await requireUser(req,res);if(!user)return;const result=await sendMessage(user.id,req.params.id,req.body?.body);res.status(result.ok?201:400).json(result)}catch(error){next(error)}});
  app.post("/api/conversations/:id/read",async(req,res,next)=>{try{const user=await requireUser(req,res);if(!user)return;const result=await markConversationRead(user.id,req.params.id);res.status(result.ok?200:400).json(result)}catch(error){next(error)}});
}
