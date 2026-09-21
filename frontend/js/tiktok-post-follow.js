(function(){
  "use strict";

  const PROFILE_SELECTOR = ".post .post-info";
  const loaded = new Map();

  function api(){ return window.TinaabAPI || null; }
  function toast(message){ if(typeof window.toast === "function") window.toast(message); }
  function usernameFrom(info){
    const link = info.querySelector("[data-username]");
    return link ? String(link.dataset.username || "").replace(/^@/, "") : "";
  }

  async function loadProfile(username){
    const client = api();
    if(!client || typeof client.get !== "function") throw new Error("Tinaab API is not ready yet.");
    if(loaded.has(username)) return loaded.get(username);
    const promise = client.get("/api/profiles/" + encodeURIComponent(username));
    loaded.set(username, promise);
    try{
      return await promise;
    }catch(error){
      loaded.delete(username);
      throw error;
    }
  }

  function readProfile(response){
    return response && (response.profile || response.user || response);
  }

  function setButtonState(button, username, following){
    button.dataset.following = String(Boolean(following));
    button.textContent = following ? "✓ Following" : "＋ Follow";
    button.classList.toggle("is-following", Boolean(following));
    button.setAttribute("aria-label", following ? "Unfollow @" + username : "Follow @" + username);
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
        const profile = readProfile(profileResponse);
        const userId = Number(profile && (profile.id || profile.user_id));
        if(!userId) throw new Error("This profile is not available yet.");

        const following = button.dataset.following === "true";
        const client = api();
        if(!client) throw new Error("Tinaab API is not ready yet.");
        const response = following
          ? await client.del("/api/users/" + userId + "/follow")
          : await client.post("/api/users/" + userId + "/follow", {});
        if(response && response.ok === false) throw new Error(response.reason || "Could not update follow status.");

        const nextFollowing = !following;
        setButtonState(button, username, nextFollowing);
        toast(nextFollowing ? "Following @" + username : "Unfollowed @" + username);
      }catch(error){
        toast(error.message || "Could not update follow status.");
      }finally{
        button.disabled = false;
      }
    });

    info.appendChild(button);
    loadProfile(username).then(function(response){
      const profile = readProfile(response) || {};
      setButtonState(button, username, Boolean(profile.viewer_following || profile.is_following));
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
