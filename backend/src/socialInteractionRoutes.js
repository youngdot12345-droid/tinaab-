import { getUserFromToken } from "./services/authService.js";
import { addComment, listComments, listNotifications, markNotificationsRead, toggleRepost } from "./services/socialInteractionService.js";

function token(req){const h=String(req.headers.authorization||"");return h.startsWith("Bearer ")?h.slice(7).trim():null}
async function user(req,res){const u=await getUserFromToken(token(req));if(!u){res.status(401).json({ok:false,reason:"Authentication required."});return null}return u}

export function registerSocialInteractionRoutes(app){
  app.get("/api/posts/:postId/comments",async(req,res,next)=>{try{const result=await listComments(null,req.params.postId,req.query.limit);res.json(result)}catch(e){next(e)}});
  app.post("/api/posts/:postId/comments",async(req,res,next)=>{try{const u=await user(req,res);if(!u)return;const result=await addComment(u.id,req.params.postId,req.body?.body);res.status(result.ok?201:400).json(result)}catch(e){next(e)}});
  app.post("/api/posts/:postId/repost",async(req,res,next)=>{try{const u=await user(req,res);if(!u)return;const result=await toggleRepost(u.id,req.params.postId,req.body?.reposted!==false);res.status(result.ok?200:400).json(result)}catch(e){next(e)}});
  app.get("/api/notifications",async(req,res,next)=>{try{const u=await user(req,res);if(!u)return;res.json(await listNotifications(u.id,req.query.limit))}catch(e){next(e)}});
  app.post("/api/notifications/read",async(req,res,next)=>{try{const u=await user(req,res);if(!u)return;res.json(await markNotificationsRead(u.id))}catch(e){next(e)}});
}
