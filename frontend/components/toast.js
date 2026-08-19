/* ═══ TOAST COMPONENT ═══ */
(function(){
  let stack;
  function ensureStack(){
    if(!stack){
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  const ICONS = { success:'✓', error:'✕', warning:'!', info:'i' };

  window.showToast = function(message, type='info', duration=3500){
    const s = ensureStack();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${ICONS[type]||''}</span><span>${message}</span>`;
    s.appendChild(t);
    setTimeout(()=>{
      t.style.transition='opacity .25s, transform .25s';
      t.style.opacity='0';
      t.style.transform='translateY(8px)';
      setTimeout(()=>t.remove(), 250);
    }, duration);
  };
})();
