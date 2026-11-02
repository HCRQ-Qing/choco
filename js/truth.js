window.TruthDare = (function(){
  let curRoleId = '';
  let deck = [];
  let drawnCount = 0;
  let groups = [];
  let currentQ = '';

  function escapeHTML(s){
    return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function shuffle(a){
    a = a.slice();
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }
  function loadState(){
    try {
      const s = localStorage.getItem('mj_truth_v1_' + curRoleId);
      if(s){
        const d = JSON.parse(s);
        groups = d.groups || [];
        currentQ = d.currentQ || '';
      }
    } catch(e) {}
  }
  function saveState(){
    try {
      localStorage.setItem('mj_truth_v1_' + curRoleId, JSON.stringify({ groups, currentQ }));
    } catch(e) {}
  }
  function initDeck(){
    let pool = [];
    try{
      const pub = getAllNormalCards('public');
      const own = getAllNormalCards(curRoleId);
      pool = pub.concat(own);
    }catch(e){}
    pool = Array.from(new Set(pool.filter(Boolean)));
    if(!pool.length) pool = ['嗯','在呢','好呀'];
    deck = shuffle(pool);
    drawnCount = 0;
  }
  function findOrCreateGroup(q){
    let g = groups.find(x=>x.q === q);
    if(!g){ g = { q, cards: [] }; groups.unshift(g); }
    return g;
  }
  function renderCurQ(){
    const el = document.getElementById('truthCurQ');
    const inp = document.getElementById('truthQInput');
    if(!el) return;
    if(currentQ){ el.textContent = currentQ; el.classList.add('show'); }
    else { el.classList.remove('show'); }
    if(inp && document.activeElement !== inp) inp.value = currentQ;
  }
  function render() {
    const info = document.getElementById('truthDeckInfo');
    if(info) info.innerHTML = '牌堆 <b>'+deck.length+'</b> 张 · 已抽 <b>'+drawnCount+'</b> 张<br><b>'+groups.length+'</b> 个问题';
    const btn = document.getElementById('truthDrawBtn');
    if(btn) btn.disabled = deck.length === 0;

    const box = document.getElementById('truthGroups');
    if(!box) return;
    if(!groups.length){
      box.innerHTML = '<div class="truth-empty-hint">上面写个问题，按回车<br>然后点「抽一张」</div>';
      renderCurQ();
      return;
    }
    box.innerHTML = groups.map((g, gi) => {
      const qText = g.q ? g.q : '没填问题';
      const emptyCls = g.q ? '' : ' empty';
      const cards = g.cards.map(c => '<div class="truth-card-tile">' + escapeHTML(c.text) + '</div>').join('');
      return '<div class="truth-group" data-gi="' + gi + '">' +
        '<div class="truth-group-head">' +
          '<div class="truth-group-q' + emptyCls + '">' + escapeHTML(qText) + '</div>' +
          '<div class="truth-group-right"><span class="truth-group-count">' + g.cards.length + ' 张</span>' +
            '<button class="truth-group-clear" data-clear="' + gi + '">清空</button></div>' +
        '</div>' +
        '<div class="truth-group-cards">' + cards + '</div>' +
      '</div>';
    }).join('');

    box.querySelectorAll('[data-clear]').forEach(b => {
      b.onclick = () => {
        const gi = +b.dataset.clear;
        groups.splice(gi, 1);
        saveState();
        render();
      };
    });
    renderCurQ();
  }
  function drawOne(){
    if(!deck.length){
      initDeck();
      render();
      return;
    }
    const text = deck.shift();
    drawnCount++;
    const g = findOrCreateGroup(currentQ);
    g.cards.push({ text, id: Date.now() + Math.random() });
    saveState();
    render();
  }
  function open() {
    curRoleId = getCurrentRoleId();
    loadState();
    initDeck();
    const scr = document.getElementById('truthScreen');
    if(scr) scr.classList.add('on');
    render();
  }
  function bindEvents() {
    const inp = document.getElementById('truthQInput');
    if(inp && !inp._bound) {
      inp._bound = true;
      inp.addEventListener('touchstart', function(e){ e.stopPropagation(); }, {passive: true});
      inp.addEventListener('touchmove', function(e){ e.stopPropagation(); }, {passive: true});
      inp.addEventListener('keydown', e => {
        if(e.key === 'Enter'){
          e.preventDefault();
          currentQ = String(inp.value || '').trim();
          inp.blur();
          setTimeout(() => { if(inp.value !== currentQ) inp.value = currentQ; }, 0);
          saveState();
          renderCurQ();
        }
      });
    }
    const drawBtn = document.getElementById('truthDrawBtn');
    if(drawBtn) drawBtn.onclick = drawOne;
    const pile = document.getElementById('truthDeckPile');
    if(pile) pile.onclick = drawOne;
    const back = document.getElementById('truthBack');
    if(back) back.onclick = () => {
      document.getElementById('truthScreen').classList.remove('on');
      if(typeof goToPage === 'function') goToPage('desk');
    };
  }
  return { open, bindEvents };
})();