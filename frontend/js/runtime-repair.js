(function(){
  "use strict";

  function feed(){return document.getElementById("feed")}
  function renderMessage(title,message){
    var root=feed();
    if(!root)return;
    root.innerHTML='<section class="screen"><h1>'+title+'</h1><div class="card"><p>'+message+'</p></div></section>';
  }
  function go(view){
    try{
      if(typeof window.showView==="function"){
        window.showView(view);
        return;
      }
    }catch(error){console.error("Tinaab navigation error",error)}
    var labels={home:"For You",chat:"Chat",wallet:"Wallet",profile:"Profile"};
    renderMessage(labels[view]||"Tinaab","This section is available, but the main app controller is not ready yet.");
  }

  document.addEventListener("click",function(event){
    var button=event.target.closest("button");
    if(!button)return;

    if(button.classList.contains("like")){
      button.classList.toggle("is-liked");
      var icon=button.querySelector("span");
      if(icon)icon.textContent=button.classList.contains("is-liked")?"♥":"♡";
      return;
    }

    var action=button.dataset.action;
    if(action==="share"){
      var post=button.closest(".post");
      var text=post?post.innerText:"Tinaab post";
      if(navigator.share){navigator.share({title:"Tinaab",text:text}).catch(function(){})}
      else if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){console.info("Tinaab post copied")}).catch(function(){})}
      return;
    }

    if(action==="comment"){
      var article=button.closest(".post");
      var likeButton=article&&article.querySelector(".like");
      var index=likeButton&&likeButton.dataset.i;
      if(typeof window.commentPost==="function"&&window.state&&window.state.posts&&window.state.posts[index]){
        window.commentPost(window.state.posts[index].id);
      }else{
        renderMessage("Comments","Please connect the Tinaab backend to open comments.");
      }
      return;
    }

    if(action==="repost"){
      renderMessage("Repost","Reposting requires a signed-in Tinaab account.");
      return;
    }

    if(action==="follow"){
      button.classList.toggle("is-following");
      var label=button.querySelector("small");
      if(label)label.textContent=button.classList.contains("is-following")?"Following":"Follow";
      return;
    }
  });

  window.addEventListener("load",function(){
    document.querySelectorAll(".nav-item[data-view]").forEach(function(button){
      button.addEventListener("click",function(){go(button.dataset.view)},{passive:false});
    });
  });
})();
