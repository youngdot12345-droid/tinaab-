const state={view:"home",liked:new Set(),posts:[],user:null,wallet:null,banks:[],authMode:"login",pendingEmail:""};
const feed=document.querySelector("#feed");
const toastEl=document.createElement("div");toastEl.className="toast";document.body.appendChild(toastEl);
function toast(msg){toastEl.textContent=msg;toastEl.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>toastEl.classList.remove("show"),2200)}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function formatNaira(kobo){return "₦"+(Number(kobo||0)/100).toLocaleString("en-NG",{maximumFractionDigits:2})}
async function loadSession(){const r=await TinaabAPI.me();state.user=r.ok?r.user:null}
async function loadFeed(){try{const r=await TinaabAPI.get("/api/feed/public?limit=20");state.posts=(r.posts||[]).map(p=>({id:p.id,user:"@"+p.username,caption:p.caption,media:p.media_url||"✦",likes:Number(p.likes_count||0),comments:Number(p.comments_count||0),shares:0}));renderFeed()}catch{state.posts=[];renderFeed();toast("Feed backend is not connected yet.")}}
function renderFeed(){
 if(!state.posts.length){feed.innerHTML='<section class="screen"><h1>Tinaab</h1><div class="card"><strong>No public posts yet.</strong><p>Create the first post when the backend is ready.</p></div></section>';return}
 feed.innerHTML=state.posts.map((p,i)=>`
 <article class="post">
   <div class="post-media">${escapeHtml(p.media)}</div>
   <div class="post-info"><div class="user">${escapeHtml(p.user)}</div><div class="caption">${escapeHtml(p.caption)}</div><div class="tag">#tinaab #foryou</div></div>
   <div class="actions">
     <button class="action like" data-i="${i}"><span>${state.liked.has(p.id)?"♥":"♡"}</span><small>${p.likes+(state.liked.has(p.id)?1:0)}</small></button>
     <button class="action" data-action="comment"><span>○</span><small>${p.comments}</small></button>
     <button class="action" data-action="share"><span>↗</span><small>${p.shares}</small></button>
     <button class="action" data-action="repost"><span>⟳</span><small>Repost</small></button>
     <button class="action" data-action="follow"><span>＋</span><small>Follow</small></button>
   </div>
 </article>`).join("");
}
function showAuth(){
 feed.innerHTML=`<section class="screen"><h1>${state.authMode==="login"?"Log in":"Create account"}</h1>
 <div class="card auth-card">
 ${state.authMode==="signup"?`<input id="firstName" placeholder="First name" autocomplete="given-name"><input id="lastName" placeholder="Last name" autocomplete="family-name"><input id="username" placeholder="Username" autocomplete="username">`: ""}
 <input id="email" type="email" placeholder="Gmail / email" autocomplete="email" value="${escapeHtml(state.pendingEmail)}">
 <input id="password" type="password" placeholder="Password (10+ characters)" autocomplete="${state.authMode==="login"?"current-password":"new-password"}">
 <button class="primary full" id="authSubmit">${state.authMode==="login"?"Log in":"Create account"}</button>
 <button class="text-btn" id="authSwitch">${state.authMode==="login"?"Create a new account":"I already have an account"}</button>
 </div></section>`;
}
async function submitAuth(){
 const email=document.querySelector("#email")?.value.trim(),password=document.querySelector("#password")?.value;
 try{
  if(state.authMode==="login"){const r=await TinaabAPI.login(email,password);state.user=r.user;toast("Logged in");showView("profile");return}
  const r=await TinaabAPI.signup({email,password,firstName:document.querySelector("#firstName").value.trim(),lastName:document.querySelector("#lastName").value.trim(),username:document.querySelector("#username").value.trim()});
  state.pendingEmail=email;toast(r.message||"Account created");showVerify();
 }catch(e){toast(e.message)}
}
function showVerify(){
 feed.innerHTML=`<section class="screen"><h1>Verify email</h1><div class="card auth-card"><p>Enter the 6-digit code sent to <strong>${escapeHtml(state.pendingEmail)}</strong>.</p><input id="verifyCode" inputmode="numeric" maxlength="6" placeholder="Verification code"><button class="primary full" id="verifySubmit">Verify email</button><button class="text-btn" id="backAuth">Back</button></div></section>`;
}
async function verify(){
 try{await TinaabAPI.verifyEmail(state.pendingEmail,document.querySelector("#verifyCode").value.trim());toast("Email verified. Log in.");state.authMode="login";showAuth()}catch(e){toast(e.message)}
}
async function loadWallet(){const r=await TinaabAPI.get("/api/wallet");state.wallet=r.wallet;const b=await TinaabAPI.get("/api/bank-accounts");state.banks=b.bankAccounts||b.accounts||[]}
function walletView(){
 if(!state.user){feed.innerHTML='<section class="screen"><h1>Tinaab Wallet</h1><div class="card"><p>Log in to view your server-side wallet balance and manage bank accounts.</p><button class="primary" id="walletLogin">Log in</button></div></section>';return}
 feed.innerHTML=`<section class="screen"><h1>Tinaab Wallet</h1>
 <div class="card"><span class="pill">Available balance</span><div class="balance">${formatNaira(state.wallet?.available_kobo)}</div><div class="row"><span>Pending: ${formatNaira(state.wallet?.pending_kobo)}</span><button class="primary" id="refreshWallet">Refresh</button></div></div>
 <div class="card"><div class="row"><strong>Bank accounts</strong><button class="primary" id="addBank">Add bank</button></div>
 <div id="banks">${state.banks.length?state.banks.map(b=>`<div class="bank-row"><div><strong>${escapeHtml(b.bank_name)}</strong><br><small>${escapeHtml(b.account_number_masked||("•••• "+b.account_number_last4))}</small></div><button class="text-btn" data-default-bank="${b.id}">${b.is_default?"Default":"Make default"}</button></div>`).join(""):"<p class='muted'>No bank account saved yet.</p>"}</div></div>
 <div class="card"><strong>Withdraw</strong><input id="withdrawAmount" inputmode="decimal" placeholder="Amount in ₦"><select id="withdrawBank">${state.banks.map(b=>`<option value="${b.id}" ${b.is_default?"selected":""}>${escapeHtml(b.bank_name)} •••• ${escapeHtml(b.account_number_last4)}</option>`).join("")}</select><button class="primary full" id="withdrawBtn">Request withdrawal</button><p class="muted">Up to 2 withdrawal requests per calendar day.</p></div>
 </section>`;
}
function bankForm(){feed.innerHTML=`<section class="screen"><h1>Add bank account</h1><div class="card auth-card"><input id="bankCode" placeholder="Bank code"><input id="bankName" placeholder="Bank name"><input id="accountName" placeholder="Account name"><input id="accountNumber" inputmode="numeric" maxlength="10" placeholder="10-digit account number"><button class="primary full" id="saveBank">Save bank account</button><button class="text-btn" id="cancelBank">Cancel</button><p class="muted">The full account number is encrypted on the server; the app only displays a masked version.</p></div></section>`}
async function saveBank(){try{await TinaabAPI.post("/api/bank-accounts",{bankCode:document.querySelector("#bankCode").value.trim(),bankName:document.querySelector("#bankName").value.trim(),accountName:document.querySelector("#accountName").value.trim(),accountNumber:document.querySelector("#accountNumber").value.trim()});toast("Bank account saved");await loadWallet();showView("wallet")}catch(e){toast(e.message)}}
async function withdraw(){try{const amount=Number(document.querySelector("#withdrawAmount").value);const bankAccountId=Number(document.querySelector("#withdrawBank").value);if(!Number.isInteger(amount)||amount<=0)throw new Error("Enter a valid whole-naira amount.");await TinaabAPI.post("/api/withdrawals",{amountKobo:amount*100,bankAccountId});toast("Withdrawal request submitted");await loadWallet();showView("wallet")}catch(e){toast(e.message)}}
async function notificationsView(){
 if(!state.user){feed.innerHTML="<section class=\"screen\"><h1>Notifications</h1><div class=\"card\"><p>Log in to view notifications.</p><button class=\"primary\" id=\"notifyLogin\">Log in</button></div></section>";return}
 try{const r=await TinaabAPI.get("/api/notifications");const items=r.notifications||[];feed.innerHTML=`<section class="screen"><div class="row"><h1>Notifications</h1><button class="text-btn" id="readNotifications">Mark all read</button></div>${items.length?items.map(n=>`<div class="card"><strong>${escapeHtml(n.actor_username?"@"+n.actor_username:"Tinaab")}</strong> ${escapeHtml(n.type)} your post.<br><small>${escapeHtml(n.created_at||"")}</small></div>`).join(""):"<div class=\"card\"><p class=\"muted\">No notifications yet.</p></div>"}</section>`}catch(e){toast(e.message)}
}
function createView(){
 if(!state.user){feed.innerHTML='<section class="screen"><h1>Create</h1><div class="card"><p>Log in to create a post.</p><button class="primary" id="createLogin">Log in</button></div></section>';return}
 feed.innerHTML='<section class="screen"><h1>Create post</h1><div class="card auth-card"><textarea id="postCaption" maxlength="5000" placeholder="Write a caption..." style="display:block;width:100%;min-height:140px;margin:10px 0;padding:14px 15px;border-radius:12px;border:1px solid #ffffff18;background:#0b0b0b;color:#fff;resize:vertical"></textarea><input id="mediaUrl" placeholder="Media URL (optional)"><select id="mediaType"><option value="">No media</option><option value="image">Image</option><option value="video">Video</option></select><select id="visibility"><option value="public">Public</option><option value="private">Private</option></select><button class="primary full" id="publishPost">Publish post</button><button class="text-btn" id="cancelCreate">Cancel</button><p class="muted">The post is saved by the Tinaab backend. Direct video/image file storage will be connected in the media-upload stage.</p></div></section>';
}
async function publishPost(){
 try{
  const caption=document.querySelector("#postCaption")?.value||"";
  const mediaUrl=document.querySelector("#mediaUrl")?.value.trim()||"";
  const mediaType=document.querySelector("#mediaType")?.value||"";
  const visibility=document.querySelector("#visibility")?.value||"public";
  const r=await TinaabAPI.post("/api/posts",{caption,mediaUrl,mediaType,visibility});
  if(!r.ok)throw new Error(r.reason||"Could not publish post.");
  toast("Post published");
  showView("home");
 }catch(e){toast(e.message)}
}
async function commentPost(postId){
 if(!state.user){toast("Log in to comment.");return}
 feed.innerHTML='<section class="screen"><h1>Comments</h1><div class="card"><div id="commentList"><p class="muted">Loading comments...</p></div><textarea id="commentBody" maxlength="2000" placeholder="Write a comment..." style="display:block;width:100%;min-height:110px;margin:10px 0;padding:14px 15px;border-radius:12px;border:1px solid #ffffff18;background:#0b0b0b;color:#fff;resize:vertical"></textarea><button class="primary full" id="sendComment" data-post-id="'+postId+'">Comment</button><button class="text-btn" id="cancelComment">Back</button></div></section>';
 try{const r=await TinaabAPI.get("/api/posts/"+postId+"/comments");const list=r.comments||[];document.querySelector("#commentList").innerHTML=list.length?list.map(c=>'<div class="card"><strong>@'+escapeHtml(c.username)+'</strong><p>'+escapeHtml(c.body)+'</p></div>').join(""):'<p class="muted">No comments yet.</p>'}catch(e){toast(e.message)}
}
async function sendComment(postId){
 const body=document.querySelector("#commentBody")?.value.trim();
 if(!body)return;
 try{await TinaabAPI.post("/api/posts/"+postId+"/comments",{body});toast("Comment added");commentPost(postId)}catch(e){toast(e.message)}
}
async function repostPost(postId){if(!state.user){toast("Log in to repost.");return}try{await TinaabAPI.post("/api/posts/"+postId+"/repost",{reposted:true});toast("Post reposted");}catch(e){toast(e.message)}}
async function chatView(){
 if(!state.user){feed.innerHTML='<section class="screen"><h1>Chat</h1><div class="card"><p>Log in to use Tinaab messaging.</p><button class="primary" id="chatLogin">Log in</button></div></section>';return}
 try{
  const r=await TinaabAPI.get("/api/conversations");
  const conversations=r.conversations||[];
  feed.innerHTML=`<section class="screen"><h1>Chat</h1><div class="card"><strong>Messages</strong><p class="muted">Your Tinaab conversations will appear here.</p></div><div id="conversationList">${conversations.length?conversations.map(c=>{const others=(c.members||[]).filter(m=>Number(m.id)!==Number(state.user.id));const person=others[0];return `<button class="conversation-row" data-conversation="${c.id}"><div><strong>@${escapeHtml(person?.username||"conversation")}</strong><br><small>${escapeHtml(c.last_message?.body||"No messages yet")}</small></div><span>›</span></button>`}).join(""):'<div class="card"><p class="muted">No conversations yet.</p></div>'}</div></section>`;
 }catch(e){feed.innerHTML='<section class="screen"><h1>Chat</h1><div class="card"><p>'+escapeHtml(e.message)+'</p></div></section>'}
}
async function openConversation(id){
 try{
  const r=await TinaabAPI.get("/api/conversations/"+id+"/messages");
  const messages=r.messages||[];
  feed.innerHTML=`<section class="screen chat-screen"><div class="row"><button class="text-btn" id="backChat">← Chat</button><span class="pill">Conversation</span></div><div class="messages" id="messages">${messages.map(m=>`<div class="message ${Number(m.sender_id)===Number(state.user.id)?"mine":""}"><span>${escapeHtml(m.body)}</span></div>`).join("")||'<p class="muted">No messages yet.</p>'}</div><div class="message-compose"><input id="messageBody" maxlength="10000" placeholder="Write a message..."><button class="primary" id="sendMessage" data-conversation="${id}">Send</button></div></section>`;
  await TinaabAPI.post("/api/conversations/"+id+"/read",{});
 }catch(e){toast(e.message)}
}
function profileView(){if(!state.user){feed.innerHTML='<section class="screen"><h1>Tinaab Profile</h1><div class="card"><p>Log in or create an account to use your real profile.</p><button class="primary" id="profileLogin">Log in</button></div></section>';return}feed.innerHTML=`<section class="screen"><div class="profile-head"><div class="avatar">${escapeHtml((state.user.first_name||"T").slice(0,1).toUpperCase())}</div><h1>@${escapeHtml(state.user.username)}</h1><span class="pill">${state.user.email_verified?"Verified":"Unverified"}</span><div class="stats"><div class="stat"><strong>—</strong><small>Following</small></div><div class="stat"><strong>—</strong><small>Followers</small></div><div class="stat"><strong>—</strong><small>Likes</small></div></div><button class="primary" id="logoutBtn">Log out</button></div></section>`}
function showView(view){state.view=view;document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));if(view==="home"){loadFeed();return}if(view==="chat"){chatView();return}if(view==="wallet"){if(state.user)loadWallet().then(walletView).catch(e=>toast(e.message));else walletView();return}if(view==="profile"){profileView();return}}
document.addEventListener("click",async e=>{
 const nav=e.target.closest(".nav-item");if(nav){showView(nav.dataset.view);return}
 if(e.target.closest("#authSubmit")){submitAuth();return}
 if(e.target.closest("#authSwitch")){state.authMode=state.authMode==="login"?"signup":"login";showAuth();return}
 if(e.target.closest("#verifySubmit")){verify();return}
 if(e.target.closest("#backAuth")){showAuth();return}
 if(e.target.closest("#walletLogin")||e.target.closest("#profileLogin")||e.target.closest("#chatLogin")){state.authMode="login";showAuth();return}
 if(e.target.closest("#backChat")){showView("chat");return}
 const conversation=e.target.closest("[data-conversation]");if(conversation){openConversation(conversation.dataset.conversation);return}
 if(e.target.closest("#sendMessage")){const btn=e.target.closest("#sendMessage");const body=document.querySelector("#messageBody")?.value.trim();if(!body)return;try{await TinaabAPI.post("/api/conversations/"+btn.dataset.conversation+"/messages",{body});openConversation(btn.dataset.conversation)}catch(err){toast(err.message)}return}
 if(e.target.closest("#refreshWallet")){try{await loadWallet();walletView()}catch(err){toast(err.message)}return}
 if(e.target.closest("#addBank")){bankForm();return}
 if(e.target.closest("#cancelBank")){showView("wallet");return}
 if(e.target.closest("#saveBank")){saveBank();return}
 if(e.target.closest("#withdrawBtn")){withdraw();return}
 const defaultBank=e.target.closest("[data-default-bank]");if(defaultBank){try{await TinaabAPI.post("/api/bank-accounts/"+defaultBank.dataset.defaultBank+"/default");toast("Default bank updated");await loadWallet();walletView()}catch(err){toast(err.message)}return}
 const like=e.target.closest(".like");if(like){const p=state.posts[Number(like.dataset.i)];if(!state.user){toast("Log in to like posts.");return}try{const liked=!state.liked.has(p.id);const r=await TinaabAPI.post("/api/posts/"+p.id+"/like",{});if(liked)state.liked.add(p.id);else state.liked.delete(p.id);p.likes=Number(r.likesCount??p.likes);renderFeed()}catch(err){toast(err.message)}return}
 if(e.target.closest("#createBtn")){createView();return;}
 if(e.target.closest("#searchBtn"))toast("Search is next.");
 if(e.target.closest("#notifyBtn")){notificationsView();return;}
 if(e.target.closest("#notifyLogin")||e.target.closest("#createLogin")){state.authMode="login";showAuth();return}
 if(e.target.closest("#publishPost")){publishPost();return}\n if(e.target.closest("#cancelCreate")){showView("home");return}\n if(e.target.closest("#sendComment")){sendComment(e.target.closest("#sendComment").dataset.postId);return}\n if(e.target.closest("#cancelComment")){showView("home");return}\n if(e.target.closest("#readNotifications")){try{await TinaabAPI.post("/api/notifications/read",{});toast("Notifications marked read");notificationsView()}catch(err){toast(err.message)}return}
 if(e.target.closest("[data-action=\"comment\"]")){const article=e.target.closest(".post");const i=[...document.querySelectorAll(".post")].indexOf(article);if(i>=0)commentPost(state.posts[i].id);return}
 if(e.target.closest("[data-action=\"repost\"]")){const article=e.target.closest(".post");const i=[...document.querySelectorAll(".post")].indexOf(article);if(i>=0)repostPost(state.posts[i].id);return}
 if(e.target.closest("#logoutBtn")){await TinaabAPI.logout();state.user=null;state.wallet=null;state.banks=[];toast("Logged out");showView("home")}
});
loadSession().then(()=>showView("home"));