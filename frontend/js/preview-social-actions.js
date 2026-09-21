(function(){
  "use strict";
  let reposted=false;
  let shared=false;

  function enhance(){
    const post=document.querySelector(".post");
    if(!post || post.querySelector("#previewRepost")) return;
    const actions=post.querySelector(".actions");
    if(!actions) return;
    const repost=document.createElement("button");
    repost.className="action";
    repost.id="previewRepost";
    repost.innerHTML='<span>⟳</span><small>Repost</small>';
    const share=document.createElement("button");
    share.className="action";
    share.id="previewShare";
    share.innerHTML='<span>↗</span><small>Share</small>';
    actions.append(repost,share);
  }

  document.addEventListener("click",async event=>{
    if(event.target.closest("#previewRepost")){
      reposted=!reposted;
      const button=document.querySelector("#previewRepost");
      if(button) button.innerHTML=`<span>${reposted?'✓':'⟳'}</span><small>${reposted?'Reposted':'Repost'}</small>`;
      if(typeof window.toast==='function') window.toast(reposted?'Preview reposted':'Preview repost removed');
    }
    if(event.target.closest("#previewShare")){
      const url=window.location.href.split('#')[0];
      try{
        if(navigator.share) await navigator.share({title:'Tinaab',text:'Check out this Tinaab preview post',url});
        else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);}
        else throw new Error('Sharing is not supported on this device.');
        shared=true;
        if(typeof window.toast==='function') window.toast('Preview post shared');
      }catch(error){if(error?.name!=='AbortError'&&typeof window.toast==='function')window.toast(error.message||'Could not share preview post.');}
    }
  });

  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
  enhance();
})();
