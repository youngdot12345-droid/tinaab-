(function(){
  "use strict";
  var feed=document.getElementById("feed");
  if(!feed)return;
  function screen(title,body){feed.innerHTML='<section class="screen"><h1>'+title+'</h1><div class="card">'+body+'</div></section>';}
  function view(name){
    document.querySelectorAll(".nav-item").forEach(function(b){b.classList.toggle("active",b.dataset.view===name);});
    if(name==="home")screen("Tinaab","<strong>Welcome to Tinaab.</strong><p>The main application controller is being repaired. Please refresh after the next deployment.</p>");
    else if(name==="chat")screen("Chat","<p>Messaging will be available when the backend controller is connected.</p><button class=\"primary\" data-emergency-login>Log in</button>");
    else if(name==="wallet")screen("Tinaab Wallet","<p>Your wallet and bank withdrawal features require a connected backend.</p><button class=\"primary\" data-emergency-login>Log in</button>");
    else if(name==="profile")screen("Profile","<p>Log in or create your Tinaab account to open your profile.</p><button class=\"primary\" data-emergency-login>Log in</button>");
  }
  window.showView=window.showView||view;
  document.addEventListener("click",function(e){
    var nav=e.target.closest(".nav-item[data-view]");
    if(nav){e.preventDefault();view(nav.dataset.view);return;}
    if(e.target.closest("#searchBtn")){e.preventDefault();screen("Search Tinaab","<p>Search will be available after the main controller is restored.</p>");return;}
    if(e.target.closest("#notifyBtn")){e.preventDefault();screen("Notifications","<p>Notifications require a connected account.</p>");return;}
    if(e.target.closest("#createBtn")){e.preventDefault();screen("Create post","<p>Post creation requires the Tinaab backend.</p>");return;}
    if(e.target.closest("[data-emergency-login]")){screen("Log in","<p>The full login controller is being repaired. Please try again after deployment finishes.</p>");return;}
  },true);
  if(!document.querySelector(".screen"))view("home");
})();