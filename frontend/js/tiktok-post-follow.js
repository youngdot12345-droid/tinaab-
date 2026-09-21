(function(){
  "use strict";

  const PROFILE_SELECTOR = ".post .post-info";
  const loaded = new Map();

  function api(){ return window.TinaabAPI; }
  function toast(message){ if(typeof window.toast === "function") window.toast(message); }
  function usernameFrom(info){
    const link = info.querySelector("[data-username]");
    return link ? String(link.dataset.username || "").replace(/^@/, "") : "";
  }

  async function loadProfile(username){
    if(loaded.has(username)) return loaded.get(username);
    const promise = api().get("/api/profiles/" + encodeURIComponent(username));
    loaded.set(username, promise);
    return promise;
  }

  function addFollowButton(info){
    if(info.querySelector(".post-profile-follow")) return;
    const username = usernameFrom(info);
    if(!username) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "post-profile-follow";
    button.textContent = "＋ Follow";
    button.setAttribute("aria-label", "Follow @" + username);
    button.dataset.username = username;
    button.addEventListener("click", async function(event){
      event.preventDefault();
      event.stopPropagation();
      if(button.disabled) return;
      button.disabled = true;

      try{
        const profileResponse = await loadProfile(username);
        const profile = profileResponse.profile || profileResponse.user || profileResponse;
        const userId = Number(profile.id || profile.user_id);
        if(!userId) throw new Error("This profile is not available yet.");

        const following = Boolean(profile.viewer_following || profile.is_following || button.dataset.following === "true");
        const response = following
          ? await api().del("/api/users/" + userId + "/follow")
          : await api().post("/api/users/" + userId + "/follow", {});
        if(response && response.ok === false) throw new Error(response.reason || "Could not update follow status.");

        const nextFollowing = !following;
        button.dataset.following = String(nextFollowing);
        button.textContent = nextFollowing ? "✓ Following" : "＋ Follow";
        button.classList.toggle("is-following", nextFollowing);
        button.setAttribute("aria-label", nextFollowing ? "Unfollow @" + username : "Follow @" + username);
        toast(nextFollowing ? "Following @" + username : "Unfollowed @" + username);
      }catch(error){
        toast(error.message || "Could not update follow status.");
      }finally{
        button.disabled = false;
      }
    });

    info.appendChild(button);
    loadProfile(username).then(function(response){
      const profile = response.profile || response.user || response;
      const following = Boolean(profile.viewer_following || profile.is_following);
      button.dataset.following = String(following);
      button.textContent = following ? "✓ Following" : "＋ Follow";
      button.classList.toggle("is-following", following);
    }).catch(function(){ /* The button remains available for a later tap. */ });
  }

  function enhancePosts(){
    document.querySelectorAll(PROFILE_SELECTOR).forEach(addFollowButton);
    document.querySelectorAll(".post .follow-action").forEach(function(button){ button.hidden = true; });
  }

  const observer = new MutationObserver(enhancePosts);
  observer.observe(document.body, {childList:true, subtree:true});
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhancePosts);
  else enhancePosts();
})();
