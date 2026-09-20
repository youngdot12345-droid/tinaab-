const state={view:"home",liked:new Set(),posts:[
{user:"@tinaab",caption:"Welcome to Tinaab — connect, create and discover.",media:"✦",likes:1240,comments:84,shares:31},
{user:"@creator",caption:"Create something today. Your community is waiting.",media:"◉",likes:876,comments:42,shares:18},
{user:"@tinaab_live",caption:"Live, chat, follow and share moments with your community.",media:"◌",likes:2190,comments:117,shares:64}
]};
const feed=document.querySelector("#feed");
const toastEl=document.createElement("div");toastEl.className="toast";document.body.appendChild(toastEl);
function toast(msg){toastEl.textContent=msg;toastEl.classList.add("show");setTimeout(()=>toastEl.classList.remove("show"),1800)}
function renderFeed(){
 feed.innerHTML=state.posts.map((p,i)=>\`
 <article class="post">
   <div class="post-media">\${p.media}</div>
   <div class="post-info"><div class="user">\${p.user}</div><div class="caption">\${p.caption}</div><div class="tag">#tinaab #foryou</div></div>
   <div class="actions">
     <button class="action like" data-i="\${i}"><span>\${state.liked.has(i)?"♥":"♡"}</span><small>\${p.likes+(state.liked.has(i)?1:0)}</small></button>
     <button class="action" data-action="comment"><span>○</span><small>\${p.comments}</small></button>
     <button class="action" data-action="share"><span>↗</span><small>\${p.shares}</small></button>
     <button class="action" data-action="repost"><span>⟳</span><small>Repost</small></button>
     <button class="action" data-action="follow"><span>＋</span><small>Follow</small></button>
   </div>
 </article>\`).join("");
}
function showView(view){
 state.view=view;document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 if(view==="home"){renderFeed();return}
 if(view==="chat"){feed.innerHTML=\`<section class="screen"><h1>Chat</h1><div class="card"><div class="row"><strong>@creator</strong><span class="pill">Active</span></div><p>Start a conversation.</p><button class="primary" onclick="toast('Chat screen coming next')">Open chat</button></div><div class="card"><strong>Messages</strong><p style="opacity:.65">The realtime messaging backend will be added in the next build stage.</p></div></section>\`;return}
 if(view==="wallet"){feed.innerHTML=\`<section class="screen"><h1>Wallet</h1><div class="card"><span class="pill">Available balance</span><div class="balance">₦12,500</div><div class="row"><span>Withdrawals today: 0/2</span><button class="primary" onclick="toast('Withdrawal backend coming next')">Withdraw</button></div></div><div class="card"><strong>Reward rules</strong><p>Verified activities can earn rewards. Fraud checks are applied before rewards become withdrawable.</p></div></section>\`;return}
 if(view==="profile"){feed.innerHTML=\`<section class="screen"><div class="profile-head"><div class="avatar">T</div><h1>@tinaab_user</h1><span class="pill">Creator</span><div class="stats"><div class="stat"><strong>0</strong><small>Following</small></div><div class="stat"><strong>0</strong><small>Followers</small></div><div class="stat"><strong>0</strong><small>Likes</small></div></div><button class="primary" onclick="toast('Profile editing coming next')">Edit profile</button></div><div class="card" style="margin-top:28px"><strong>Live</strong><p>Start a live session and let your followers join.</p></div></section>\`;return}
}
document.addEventListener("click",e=>{
 const nav=e.target.closest(".nav-item");if(nav){showView(nav.dataset.view);return}
 const like=e.target.closest(".like");if(like){const i=Number(like.dataset.i);state.liked.has(i)?state.liked.delete(i):state.liked.add(i);renderFeed();return}
 const action=e.target.closest("[data-action]");if(action){toast(action.dataset.action.charAt(0).toUpperCase()+action.dataset.action.slice(1)+" selected");return}
 if(e.target.closest("#createBtn"))toast("Upload creator flow coming next");
 if(e.target.closest("#searchBtn"))toast("Search coming next");
 if(e.target.closest("#notifyBtn"))toast("No new notifications");
});
renderFeed();