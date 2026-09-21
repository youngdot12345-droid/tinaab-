(function(){
  "use strict";

  const PROFILE_ACTIONS = ["like", "comment", "repost", "share"];
  let refreshTimer;

  function escapeValue(value){
    return String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"}[c]));
  }

  function notify(message){
    if(typeof window.toast === "function") window.toast(message);
    else console.warn(message);
  }

  function currentUsername(){
    return document.querySelector(".profile-head h1")?.textContent?.replace(/^@/, "").trim() || "";
  }

  function addActionBar(card, index, post){
    if(card.querySelector(".profile-post-actions")) return;
    const bar=document.createElement("div");
    bar.className="profile-post-actions";
    bar.innerHTML=`
      <button type="button" class="text-btn" data-profile-action="like" data-profile-index="${index}">${post.viewer_liked ? "♥ Liked" : "♡ Like"} · <span data-profile-count="likes">${Number(post.likes_count||0)}</span></button>
      <button type="button" class="text-btn" data-profile-action="comment" data-profile-index="${index}">○ Comment · <span data-profile-count="comments">${Number(post.comments_count||0)}</span></button>
      <button type="button" class="text-btn" data-profile-action="repost" data-profile-index="${index}">${post.viewer_reposted ? "✓ Reposted" : "⟳ Repost"} · <span data-profile-count="reposts">${Number(post.reposts_count||0)}</span></button>
      <button type="button" class="text-btn" data-profile-action="share" data-profile-index="${index}">↗ Share</button>`;
    card.appendChild(bar);
  }

  async function getProfilePosts(){
    const username=currentUsername();
    if(!username) throw new Error("Profile username is missing.");
    const result=await TinaabAPI.get("/api/profiles/"+encodeURIComponent(username)+"/posts?limit=50");
    return {username, posts:result.posts||[]};
  }

  function scheduleRefresh(username){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{
      if(typeof window.openProfile === "function" && username) window.openProfile(username);
    }, 250);
  }

  async function handleAction(button){
    const action=button.dataset.profileAction;
    if(!PROFILE_ACTIONS.includes(action)) return;
    const index=Number(button.dataset.profileIndex);
    const {username,posts}=await getProfilePosts();
    const post=posts[index];
    if(!post) throw new Error("Post not found.");
    const postId=post.id;

    if(action==="comment"){
      if(typeof window.commentPost === "function") window.commentPost(postId);
      else notify("Comments are not available yet.");
      return;
    }

    if(action==="like"){
      const result=post.viewer_liked
        ? await TinaabAPI.del("/api/posts/"+postId+"/like")
        : await TinaabAPI.post("/api/posts/"+postId+"/like",{});
      if(!result.ok) throw new Error(result.reason||"Could not update like.");
      notify(post.viewer_liked ? "Like removed" : "Post liked");
      scheduleRefresh(username);
      return;
    }

    if(action==="repost"){
      const result=await TinaabAPI.post("/api/posts/"+postId+"/repost",{reposted:!post.viewer_reposted});
      if(!result.ok) throw new Error(result.reason||"Could not update repost.");
      notify(post.viewer_reposted ? "Repost removed" : "Post reposted");
      scheduleRefresh(username);
      return;
    }

    if(action==="share"){
      const shareData={
        title:"Tinaab",
        text:post.caption||("Check out this post on Tinaab"),
        url:window.location.origin+"/?post="+encodeURIComponent(postId)
      };
      if(navigator.share) await navigator.share(shareData);
      else if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(shareData.url);
        notify("Post link copied");
      } else throw new Error("Sharing is not supported on this device.");
      const result=await TinaabAPI.post("/api/posts/"+postId+"/share",{});
      if(!result.ok) throw new Error(result.reason||"Share could not be submitted.");
      notify(result.message||"Share submitted for verification.");
    }
  }

  function enhanceProfilePosts(){
    const cards=[...document.querySelectorAll(".profile-post")];
    if(!cards.length) return;
    cards.forEach((card,index)=>{
      if(card.dataset.profileEnhanced==="true") return;
      card.dataset.profileEnhanced="true";
      card.classList.add("profile-post-enhanced");
      card.querySelector(".tag")?.setAttribute("aria-hidden","true");
      getProfilePosts().then(({posts})=>{
        const post=posts[index];
        if(post) addActionBar(card,index,post);
      }).catch(()=>{});
    });
  }

  const observer=new MutationObserver(enhanceProfilePosts);
  observer.observe(document.body,{childList:true,subtree:true});
  enhanceProfilePosts();

  document.addEventListener("click",async event=>{
    const button=event.target.closest("[data-profile-action]");
    if(!button) return;
    event.preventDefault();
    if(button.dataset.busy==="true") return;
    button.dataset.busy="true";
    try{await handleAction(button)}
    catch(error){if(error?.name!=="AbortError") notify(error.message||"Could not complete action.")}
    finally{button.dataset.busy="false"}
  });
})();
