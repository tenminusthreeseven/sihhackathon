document.addEventListener('DOMContentLoaded', function(){
  const play = document.getElementById('playDemo');
  const login = document.getElementById('loginBtn');

  play && play.addEventListener('click', ()=> {
    showToast('Demo started — modal coming soon!');
  });

  login && login.addEventListener('click', ()=> {
    showToast('Login clicked — connect auth logic here.');
  });
});

function showToast(text){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(()=> t.classList.add('visible'), 30);
  setTimeout(()=>{
    t.classList.remove('visible');
    setTimeout(()=>t.remove(),300);
  }, 3000);
}

// Inject toast styles dynamically
(function(){
  const css = `
    .toast{
      position:fixed; left:50%; bottom:20px;
      transform:translateX(-50%) translateY(20px);
      background:#0b2011; color:#dfffe9;
      padding:10px 16px; border-radius:10px;
      opacity:0; transition:all .3s ease;
    }
    .toast.visible{ opacity:1; transform:translateX(-50%) translateY(0); }
  `;
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
})();
