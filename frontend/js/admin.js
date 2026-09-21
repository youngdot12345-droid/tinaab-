(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const status=$('adminStatus');
  const usersOutput=$('usersOutput');
  const reviewsOutput=$('reviewsOutput');
  const search=$('userSearch');
  let users=[];

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function showStatus(message,error){status.textContent=message;status.className=error?'admin-panel admin-error':'admin-panel';}
  function renderUsers(){
    const term=String(search.value||'').trim().toLowerCase();
    const filtered=users.filter(user=>[user.username,user.first_name,user.last_name,user.display_name].some(value=>String(value||'').toLowerCase().includes(term)));
    if(!filtered.length){usersOutput.textContent='No users found.';return;}
    usersOutput.innerHTML='<table class="admin-table"><thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Status</th><th>Verified</th><th>Created</th></tr></thead><tbody>'+filtered.map(user=>'<tr><td>'+escapeHtml(user.id)+'</td><td>'+escapeHtml(user.username||'—')+'</td><td>'+escapeHtml(user.display_name||[user.first_name,user.last_name].filter(Boolean).join(' ')||'—')+'</td><td>'+escapeHtml(user.status||'active')+'</td><td>'+escapeHtml(user.verified?'Yes':'No')+'</td><td>'+escapeHtml(user.created_at||'—')+'</td></tr>').join('')+'</tbody></table>';
  }
  function renderReviews(items){
    if(!items.length){reviewsOutput.textContent='No pending reviews.';return;}
    reviewsOutput.innerHTML='<ul>'+items.map(item=>'<li>Review #'+escapeHtml(item.id||item.claim_id||'—')+' — '+escapeHtml(item.status||'pending')+'</li>').join('')+'</ul>';
  }
  async function load(){
    showStatus('Checking administrator access…');
    try{
      const [overview,usersResponse,reviews]=await Promise.all([
        TinaabAPI.get('/api/admin/overview'),
        TinaabAPI.get('/api/admin/users?limit=50'),
        TinaabAPI.get('/api/admin/rewards/pending?limit=50')
      ]);
      const stats=overview.stats||overview;
      $('totalUsers').textContent=stats.totalUsers??'—';
      $('verifiedUsers').textContent=stats.verifiedUsers??'—';
      $('recentUsers').textContent=stats.recentUsers??'—';
      const reviewItems=reviews.claims||reviews.items||[];
      $('pendingReviews').textContent=stats.pendingReviews??reviewItems.length;
      users=usersResponse.users||usersResponse.items||[];
      renderUsers();
      renderReviews(reviewItems);
      showStatus('Administrator access confirmed.');
    }catch(error){
      showStatus(error.message||'Unable to load the admin dashboard. Confirm administrator permissions and backend routes.',true);
      usersOutput.textContent='User data unavailable.';
      reviewsOutput.textContent='Review data unavailable.';
    }
  }
  $('adminRefresh').addEventListener('click',load);
  search.addEventListener('input',renderUsers);
  load();
})();
