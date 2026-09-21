(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const status=$('adminStatus');
  const usersOutput=$('usersOutput');
  const reviewsOutput=$('reviewsOutput');
  const withdrawalsOutput=$('withdrawalsOutput');
  const auditOutput=$('auditOutput');
  const search=$('userSearch');
  let offset=0;
  const limit=50;

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function showStatus(message,error){status.textContent=message;status.className=error?'admin-panel admin-error':'admin-panel';}
  function renderUsers(items,total){
    if(!items.length){usersOutput.textContent='No users found.';return;}
    usersOutput.innerHTML='<table class="admin-table"><thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Role</th><th>Verified</th><th>Created</th></tr></thead><tbody>'+items.map(user=>'<tr><td>'+escapeHtml(user.id)+'</td><td>'+escapeHtml(user.username||'—')+'</td><td>'+escapeHtml([user.first_name,user.last_name].filter(Boolean).join(' ')||'—')+'</td><td>'+escapeHtml(user.role||'user')+'</td><td>'+escapeHtml(user.verified?'Yes':'No')+'</td><td>'+escapeHtml(user.created_at||'—')+'</td></tr>').join('')+'</tbody></table><p class="admin-muted">Showing '+items.length+' of '+escapeHtml(total??items.length)+' matching users.</p>';
  }
  function renderWithdrawals(items){
    if(!items.length){withdrawalsOutput.textContent='No pending withdrawals.';return;}
    withdrawalsOutput.innerHTML='<table class="admin-table"><thead><tr><th>ID</th><th>User</th><th>Amount</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>'+items.map(item=>'<tr><td>'+escapeHtml(item.id||item.withdrawal_id||'—')+'</td><td>'+escapeHtml(item.username||item.user_id||'—')+'</td><td>'+escapeHtml(item.amount_kobo!=null?('₦'+(Number(item.amount_kobo)/100).toLocaleString('en-NG',{maximumFractionDigits:2})):'—')+'</td><td>'+escapeHtml(item.status||'pending')+'</td><td>'+escapeHtml(item.created_at||'—')+'</td><td><button class="admin-paid" data-withdrawal-id="'+escapeHtml(item.id)+'">Mark paid</button> <button class="admin-fail" data-withdrawal-id="'+escapeHtml(item.id)+'">Fail</button></td></tr>').join('')+'</tbody></table>';
  }
  async function reconcileWithdrawal(id,decision){
    let body={decision};
    if(decision==='success'){
      const ref=window.prompt('Enter the verified payout provider reference:');
      if(!ref)return;
      body.providerReference=ref;
    }else{
      body.failureReason=window.prompt('Reason for payout failure:')||'Payout failed.';
    }
    try{
      await TinaabAPI.post('/api/admin/withdrawals/'+encodeURIComponent(id)+'/reconcile',body);
      showStatus('Withdrawal #'+id+' reconciled.');
      await load();
    }catch(error){showStatus(error.message||'Withdrawal reconciliation failed.',true);}
  }
  function renderAuditLogs(items){
    if(!items.length){auditOutput.textContent='No audit events found.';return;}
    auditOutput.innerHTML='<table class="admin-table"><thead><tr><th>ID</th><th>Actor</th><th>Action</th><th>Target</th><th>Created</th></tr></thead><tbody>'+items.map(item=>'<tr><td>'+escapeHtml(item.id)+'</td><td>'+escapeHtml(item.actor_username||'system')+'</td><td>'+escapeHtml(item.action)+'</td><td>'+escapeHtml((item.target_type||'')+(item.target_id?' #'+item.target_id:''))+'</td><td>'+escapeHtml(item.created_at||'—')+'</td></tr>').join('')+'</tbody></table>';
  }
  function renderReviews(items){
    if(!items.length){reviewsOutput.textContent='No pending reviews.';return;}
    reviewsOutput.innerHTML='<table class="admin-table"><thead><tr><th>ID</th><th>User</th><th>Activity</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>'+items.map(item=>'<tr><td>'+escapeHtml(item.id||'—')+'</td><td>'+escapeHtml(item.username||item.user_id||'—')+'</td><td>'+escapeHtml(item.activity_type||'—')+'</td><td>'+escapeHtml(item.server_amount_kobo!=null?('₦'+(Number(item.server_amount_kobo)/100).toLocaleString('en-NG',{maximumFractionDigits:2})):'—')+'</td><td>'+escapeHtml(item.status||'pending')+'</td><td><button class="admin-approve" data-claim-id="'+escapeHtml(item.id)+'">Approve</button> <button class="admin-reject" data-claim-id="'+escapeHtml(item.id)+'">Reject</button></td></tr>').join('')+'</tbody></table>';
  }
  async function reviewReward(claimId,decision){
    const reason=decision==='reject'?window.prompt('Reason for rejecting this reward claim:')||'Claim did not pass verification.':'';
    try{
      await TinaabAPI.post('/api/admin/rewards/'+encodeURIComponent(claimId)+'/review',{decision,rejectionReason:reason});
      showStatus('Reward claim #'+claimId+' '+decision+'d.');
      await load();
    }catch(error){showStatus(error.message||'Reward review failed.',true);}
  }
  async function loadUsers(){
    const term=String(search.value||'').trim();
    const response=await TinaabAPI.get('/api/admin/users?limit='+limit+'&offset='+offset+(term?'&search='+encodeURIComponent(term):''));
    renderUsers(response.users||[],response.totalUsers);
  }
  async function load(){
    showStatus('Checking administrator access…');
    try{
      const [overview,reviews,withdrawals,auditLogs]=await Promise.all([
        TinaabAPI.get('/api/admin/overview'),
        TinaabAPI.get('/api/admin/rewards/pending?limit=50'),
        TinaabAPI.get('/api/admin/withdrawals/pending?limit=50'),
        TinaabAPI.get('/api/admin/audit-logs?limit=50')
      ]);
      const stats=overview.stats||overview;
      $('totalUsers').textContent=stats.totalUsers??'—';
      $('verifiedUsers').textContent=stats.verifiedUsers??'—';
      $('recentUsers').textContent=stats.recentUsers??'—';
      const reviewItems=reviews.claims||reviews.items||[];
      $('pendingReviews').textContent=stats.pendingReviews??reviewItems.length;
      $('totalPosts').textContent=stats.totalPosts??'—';
      $('pendingWithdrawals').textContent=stats.pendingWithdrawals??((withdrawals.withdrawals||withdrawals.items||[]).length);
      renderReviews(reviewItems);
      renderWithdrawals(withdrawals.withdrawals||withdrawals.items||[]);
      renderAuditLogs(auditLogs.logs||auditLogs.items||[]);
      offset=0;
      await loadUsers();
      showStatus('Administrator access confirmed.');
    }catch(error){
      showStatus(error.message||'Unable to load the admin dashboard. Confirm administrator permissions and backend routes.',true);
      usersOutput.textContent='User data unavailable.';
      reviewsOutput.textContent='Review data unavailable.';
      withdrawalsOutput.textContent='Withdrawal data unavailable.';
      auditOutput.textContent='Audit data unavailable.';
    }
  }
  withdrawalsOutput.addEventListener('click',function(event){
    const button=event.target.closest('button[data-withdrawal-id]');
    if(!button)return;
    reconcileWithdrawal(button.dataset.withdrawalId,button.classList.contains('admin-paid')?'success':'fail');
  });
  reviewsOutput.addEventListener('click',function(event){
    const button=event.target.closest('button[data-claim-id]');
    if(!button)return;
    reviewReward(button.dataset.claimId,button.classList.contains('admin-approve')?'approve':'reject');
  });
  $('adminRefresh').addEventListener('click',load);
  search.addEventListener('input',function(){offset=0;loadUsers().catch(error=>showStatus(error.message||'User search failed.',true));});
  load();
})();
