(function(){
  "use strict";
  function byId(id){return document.getElementById(id)}
  function setView(view){
    var feed=byId("feed");
    if(!feed)return;
    document.querySelectorAll(".nav-item[data-view]").forEach(function(btn){btn.classList.toggle("active",btn.dataset.view===view)});
    try{
      if(typeof window.showView==="function"){window.showView(view);return}
    }catch(error){console.error("Tinaab view error",error)}
    var labels={home:"For You",chat:"Chat",wallet:"Wallet",profile:"Profile"};
    feed.innerHTML='<section class="screen"><h1>'+labels[view]+'</h1><div class="card"><p>This section is ready. Connect the Tinaab backend to load live data.</p></div></section>';
  }
  document.addEventListener("click",function(event){
    var target=event.target.closest("button, [role=button]");
    if(!target)return;
    var nav=target.closest(".nav-item[data-view]");
    if(nav){event.preventDefault();setView(nav.dataset.view);return}
    if(target.id==="searchBtn"){
      event.preventDefault();
      if(typeof window.searchView==="function")window.searchView();
      else{var feed=byId("feed");if(feed)feed.innerHTML='<section class="screen"><h1>Search</h1><div class="card"><input id="quickSearch" placeholder="Search Tinaab"><p class="muted">Search becomes available when the backend is connected.</p></div></section>'}
      return;
    }
    if(target.id==="notifyBtn"){event.preventDefault();if(typeof window.notificationsView==="function")window.notificationsView();return}
    if(target.id==="createBtn"){event.preventDefault();if(typeof window.createView==="function")window.createView();return}
    if(target.id==="authSubmit"&&typeof window.submitAuth==="function"){event.preventDefault();window.submitAuth();return}
    if(target.id==="authSwitch"){event.preventDefault();window.state=window.state||{};if(typeof window.showAuth==="function"){window.state.authMode=window.state.authMode==="login"?"signup":"login";window.showAuth()}return}
    if(target.id==="verifySubmit"&&typeof window.verify==="function"){event.preventDefault();window.verify();return}
    if(target.id==="backAuth"&&typeof window.showAuth==="function"){event.preventDefault();window.showAuth();return}
    if(target.id==="walletLogin"||target.id==="chatLogin"||target.id==="notifyLogin"||target.id==="createLogin"){event.preventDefault();if(typeof window.showAuth==="function"){window.state.authMode="login";window.showAuth()}return}
    if(target.id==="addBank"&&typeof window.bankForm==="function"){event.preventDefault();window.bankForm();return}
    if(target.id==="cancelBank"){event.preventDefault();setView("wallet");return}
    if(target.id==="saveBank"&&typeof window.saveBank==="function"){event.preventDefault();window.saveBank();return}
    if(target.id==="withdrawBtn"&&typeof window.withdraw==="function"){event.preventDefault();window.withdraw();return}
    if(target.id==="refreshWallet"&&typeof window.showView==="function"){event.preventDefault();window.showView("wallet");return}
    if(target.id==="publishPost"&&typeof window.publishPost==="function"){event.preventDefault();window.publishPost();return}
    if(target.id==="cancelCreate"){event.preventDefault();setView("home");return}
    if(target.id==="sendComment"&&typeof window.sendComment==="function"){event.preventDefault();window.sendComment(target.dataset.postId);return}
    if(target.id==="cancelComment"){event.preventDefault();setView("home");return}
    if(target.id==="backChat"&&typeof window.chatView==="function"){event.preventDefault();window.chatView();return}
    var conversation=target.closest("[data-conversation]");
    if(conversation&&typeof window.openConversation==="function"){event.preventDefault();window.openConversation(conversation.dataset.conversation);return}
    var profile=target.closest(".profile-link[data-username]");
    if(profile&&typeof window.profileView==="function"){event.preventDefault();window.profileView(profile.dataset.username);return}
  });
  window.addEventListener("error",function(event){console.error("Tinaab frontend error",event.error||event.message)});
  window.addEventListener("unhandledrejection",function(event){console.error("Tinaab async error",event.reason)});
  document.addEventListener("DOMContentLoaded",function(){
    if(typeof window.showView==="function"){
      try{window.showView("home")}catch(error){console.error("Tinaab startup error",error)}
    }else{setView("home")}
  });
})();
