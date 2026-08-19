/* ═══ MODAL COMPONENT ═══
   Usage:
     openModal('my-modal-id')
     closeModal('my-modal-id')
     confirmDialog({icon,title,message,confirmLabel,danger,onConfirm})
*/
(function(){
  window.openModal = function(id){
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
  };
  window.closeModal = function(id){
    const el = document.getElementById(id);
    if(el) el.classList.remove('active');
  };

  // Click outside a sheet closes it
  document.addEventListener('click', (e)=>{
    if(e.target.classList && e.target.classList.contains('modal-overlay')){
      e.target.classList.remove('active');
    }
  });

  let confirmCallback = null;

  function ensureConfirmModal(){
    if(document.getElementById('__confirm-modal')) return;
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.id = '__confirm-modal';
    div.innerHTML = `
      <div class="modal-sheet" style="max-width:380px;text-align:center;">
        <div id="__confirm-icon" style="font-size:36px;margin-bottom:12px;"></div>
        <div id="__confirm-title" class="modal-title"></div>
        <div id="__confirm-message" class="modal-sub"></div>
        <div style="display:flex;gap:10px;margin-top:8px;">
          <button class="btn btn-outline btn-block" onclick="closeModal('__confirm-modal')">Cancel</button>
          <button id="__confirm-btn" class="btn btn-primary btn-block"></button>
        </div>
      </div>`;
    document.body.appendChild(div);
    document.getElementById('__confirm-btn').addEventListener('click', ()=>{
      closeModal('__confirm-modal');
      if(confirmCallback) confirmCallback();
    });
  }

  window.confirmDialog = function({ icon='⚠️', title, message, confirmLabel='Confirm', danger=false, onConfirm }){
    ensureConfirmModal();
    document.getElementById('__confirm-icon').textContent = icon;
    document.getElementById('__confirm-title').textContent = title;
    document.getElementById('__confirm-message').textContent = message;
    const btn = document.getElementById('__confirm-btn');
    btn.textContent = confirmLabel;
    btn.className = danger ? 'btn btn-primary btn-block' : 'btn btn-dark btn-block';
    confirmCallback = onConfirm;
    openModal('__confirm-modal');
  };
})();
