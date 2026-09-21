(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const status=$('adminStatus');
  const usersOutput=$('usersOutput');
  const reviewsOutput=$('reviewsOutput');
  const search=$('userSearch');
  let offset=0;
  const limit=50;

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function showStatus(message,error){status.textContent=message;status.className=error?'admin-panel admin-error':'admin-panel';}
  function renderUsers(items,total){
    if(!items.length){usersOutput.textContent='No users found.';return;}
    usersOutput.innerHTML='<table class="admin-table"><thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Role</th><th>Verified</th><th>Created</th></tr></thead><tbody>'+items.map(user=>'<tr><td>'+escapeHtml(user.id)+'</td><td>'+escapeHtml(user.username||'—')+'</td><td>'+escapeHtml([user.first_name,user.last_name].filter(Boolean).join(' ')||'—')+'</td><td>'+escapeHtml(user.role||'user')+'</td><td>'+escapeHtml(user.verified?'Yes':'No')+'</td><td>'+escapeHtml(user.created_at||'—')+'</td></tr>').join('')+'</tbody></table><p class="admin-muted">Showing '+items.length+' of '+escapeHtml(total??items.length)+' matching users.</p>';
  }
  function renderReviews(items){
    if(!items.length){reviewsOutput.textContent='No pending reviews.';return;}
    reviewsOutput.innerHTML='<ul>'+items.map(item=>'<li>Review #'+escapeHtml(item.id||item.claim_id||'—')+' — '+escapeHtml(item.status||'pending')+'</li>').join('')+'</ul>';
  }
  async function loadUsers(){
    const term=String(search.value||'').trim();
    const response=await TinaabAPI.get('/api/admin/users?limit='+limit+'&offset='+offset+(term?'&search='+encodeURIComponent(term):''));
    renderUsers(response.users||[],response.totalUsers);
  }
  async function load(){
    showStatus('Checking administrator access…');
    try{
      const [overview,reviews]=await Promise.all([
        TinaabAPI.get('/api/admin/overview'),
        TinaabAPI.get('/api/admin/rewards/pending?limit=50')
      ]);
      const stats=overview.stats||overview;
      $('totalUsers').textContent=stats.totalUsers??'—';
      $('verifiedUsers').textContent=stats.verifiedUsers??'—';
      $('recentUsers').textContent=stats.recentUsers??'—';
      const reviewItems=reviews.claims||reviews.items||[];
      $('pendingReviews').textContent=stats.pendingReviews??reviewItems.length;
      renderReviews(reviewItems);
      offset=0;
      await loadUsers();
      showStatus('Administrator access confirmed.');
    }catch(error){
      showStatus(error.message||'Unable to load the admin dashboard. Confirm administrator permissions and backend routes.',true);
      usersOutput.textContent='User data unavailable.';
      reviewsOutput.textContent='Review data unavailable.';
    }
  }
  $('adminRefresh').addEventListener('click',load);
  search.addEventListener('input',function(){offset=0;loadUsers().catch(error=>showStatus(error.message||'User search failed.',true));});
  load();
})();
