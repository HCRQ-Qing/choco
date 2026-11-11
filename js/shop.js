(function(){
  if(window.__shopReady) return;
  window.__shopReady = true;

  var state = { top: '字卡', sub: '普通字卡', openCard: null };

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function ensureDom(){
    if(document.getElementById('shopScreen')) return;
    var d = document.createElement('div');
    d.className = 'screen';
    d.id = 'shopScreen';
    d.innerHTML =
      '<div id="utopHostShop"></div>' +
      '<div class="shop-toprow" id="shopTopRow"></div>' +
      '<div class="shop-subrow" id="shopSubRow"></div>' +
      '<div class="shop-list" id="shopList"></div>' +
      '<div class="shop-preview" id="shopPreview"></div>' +
      '<div class="shop-mask" id="shopDrawerMask"></div>' +
      '<div class="shop-drawer" id="shopDrawer">' +
        '<div class="shop-dr-head"><div class="shop-dr-title">筛 选</div></div>' +
        '<div class="shop-dr-body">' +
          '<div class="shop-dr-sec">' +
            '<div class="shop-dr-row">' +
              '<div class="shop-dr-txt"><div class="shop-dr-name">健康模式</div><div class="shop-dr-desc">开：仅显示甜向合集<br>关：显示所有合集</div></div>' +
              '<label class="shop-sw"><input type="checkbox" id="shopHealthSw"><span class="shop-sl"></span></label>' +
            '</div>' +
          '</div>' +
          '<div class="shop-dr-sec">' +
            '<div class="shop-dr-lbl">标 签</div>' +
            '<div class="shop-dr-chips"><span class="shop-chip on" data-tag="">全部</span><span class="shop-chip" data-tag="基础">基础</span><span class="shop-chip" data-tag="日常">日常</span><span class="shop-chip" data-tag="名词">名词</span><span class="shop-chip" data-tag="情绪">情绪</span><span class="shop-chip" data-tag="亲昵">亲昵</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="shop-dr-foot"><button id="shopDrReset">重 置</button><button id="shopDrOk">确 定</button></div>' +
      '</div>' +
      '<div class="shop-mask" id="shopDisMask">' +
        '<div class="shop-modal">' +
          '<div class="shop-modal-title">使 用 须 知</div>' +
          '<div class="shop-modal-body">' +
            '<p>本商场提供的字卡内容只是作者太懒给自己做的<span class="hl">存档</span>，因为个人xp原因，部分合集包含<span class="hl">负能量、攻击性</span>或情绪化表达，也包含大量歌词字卡，属于甜宠的内容不多。在使用前应确认自身可接受此类内容。</p>' +
            '<p>选择「<span class="hl">不接受</span>」后，将屏蔽所有非甜向合集；用户可随时重新进入商场更改此选择。本商场不接受因内容风格不符预期而产生的投诉。</p>' +
            '<p>如果有不愉快的声音出现，一些攻击性字卡会变成<span class="hl">输入密码</span>才可使用。不过不管怎么样，有攻击性字卡纯粹是作者<span class="hl">抖m属性大爆发</span>，大家要和梦角好好的不要吵架呀。</p>' +
          '</div>' +
          '<div class="shop-modal-note">可联系 @001（小红书号：27739216821）投稿<br>禁搬运别人写的字卡来投稿</div>' +
          '<div class="shop-modal-acts"><button class="no" id="shopDisNo">不 接 受</button><button class="yes" id="shopDisYes">接 受</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="shop-mask" id="shopVerMask">' +
        '<div class="shop-modal">' +
          '<div class="shop-modal-title" style="margin-bottom:6px">确 认 使 用</div>' +
          '<div class="shop-modal-sub">请完整输入下方文字，以便确认</div>' +
          '<div class="shop-modal-quote">我接受使用带有攻击性、负能量的字卡，并且不会抱怨和攻击作者。</div>' +
          '<textarea class="shop-modal-input" id="shopVerInput" rows="3" placeholder="请在这里一字不差地输入…"></textarea>' +
          '<div class="shop-modal-hint" id="shopVerHint">输入不完整将无法继续</div>' +
          '<div class="shop-modal-acts" style="margin-top:20px"><button class="no" id="shopVerCancel">取 消</button><button class="yes" id="shopVerOk">确 定</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);
  }

  function renderTopBarSafe(){
    var host = document.getElementById('utopHostShop');
    if(!host) return;
    host.innerHTML =
      '<div class="utop">' +
        '<button class="utop-back" type="button">‹</button>' +
        '<div class="utop-title">商 场</div>' +
        '<div class="utop-right"></div>' +
      '</div>';
    host.querySelector('.utop-back').onclick = function(){
      document.querySelectorAll('.screen.on').forEach(function(s){ s.classList.remove('on'); });
      if(typeof goToPage === 'function') goToPage('me');
    };
  }

  function renderTop(){
    var box = document.getElementById('shopTopRow');
    var tops = window.SHOP_DATA.top;
    box.innerHTML = tops.map(function(t){
      return '<div class="shop-top' + (t === state.top ? ' on' : '') + '" data-top="' + esc(t) + '">' + esc(t) + '</div>';
    }).join('');
    box.querySelectorAll('[data-top]').forEach(function(el){
      el.onclick = function(){
        state.top = el.dataset.top;
        var subs = (window.SHOP_DATA.cats[state.top] || {}).subs || [];
        state.sub = subs[0] || '';
        renderAll();
      };
    });
  }

  function renderSub(){
    var box = document.getElementById('shopSubRow');
    var subs = (window.SHOP_DATA.cats[state.top] || {}).subs || [];
    if(!subs.length){ box.innerHTML = ''; box.style.display = 'none'; return; }
    box.style.display = 'flex';
    box.innerHTML = subs.map(function(s){
      return '<div class="shop-sub' + (s === state.sub ? ' on' : '') + '" data-sub="' + esc(s) + '">' + esc(s) + '</div>';
    }).join('');
    box.querySelectorAll('[data-sub]').forEach(function(el){
      el.onclick = function(){ state.sub = el.dataset.sub; renderAll(); };
    });
  }

  function renderList(){
    var box = document.getElementById('shopList');
    var arr = ((window.SHOP_DATA.cats[state.top] || {}).data || {})[state.sub] || [];
    if(state.healthMode){
      arr = arr.filter(function(c){
        if(c.id === 'adj-size' || c.id === 'adj-trait') return false;
        return !(c.tags || []).some(function(t){ return t === '负能量' || t === '攻击性' || t === '虐'; });
      });
    }
    if(state.filterTag){
      arr = arr.filter(function(c){
        return (c.tags || []).indexOf(state.filterTag) >= 0;
      });
    }
    if(!arr.length){
      box.innerHTML = '<div class="shop-empty">没有符合筛选的合集</div>';
      return;
    }
    box.innerHTML = arr.map(function(c){
      var tags = (c.tags || []).map(function(t){ return '<span class="shop-tag">' + esc(t) + '</span>'; }).join('');
      var author = c.author ? ('<span class="shop-author">' + esc(c.author) + '</span>') : '';
      return '<div class="shop-fold" data-cid="' + esc(c.id) + '">' +
        '<div class="shop-fold-main">' +
          '<div class="shop-fold-name">' + esc(c.name) + '</div>' +
          '<div class="shop-fold-desc">' + esc(c.desc) + '</div>' +
          '<div class="shop-fold-meta">' + author + tags + '</div>' +
        '</div>' +
        '<span class="shop-arrow">›</span>' +
      '</div>';
    }).join('');
    box.querySelectorAll('[data-cid]').forEach(function(el){
      el.onclick = function(){ openPreview(el.dataset.cid); };
    });
  }

  function initLogic(){
    var hasVerified = lsGet('mj_shop_verified_v1', false);
    var disMask = document.getElementById('shopDisMask');
    var verMask = document.getElementById('shopVerMask');
    var verInput = document.getElementById('shopVerInput');
    var verHint = document.getElementById('shopVerHint');
    var drMask = document.getElementById('shopDrawerMask');
    var dr = document.getElementById('shopDrawer');
    var healthSw = document.getElementById('shopHealthSw');

    state.healthMode = lsGet('mj_shop_health_v1', !hasVerified);

    window.openVerifyDialog = function(cb){
      verInput.value = '';
      verHint.textContent = '输入不完整将无法继续';
      verHint.classList.remove('err');
      verMask.classList.add('on');
      window.__shopVerCb = cb;
    };

    document.getElementById('shopVerCancel').onclick = function(){ verMask.classList.remove('on'); };
    document.getElementById('shopVerOk').onclick = function(){
      var txt = verInput.value.trim().replace(/\s+/g, '');
      if(txt === '我接受使用带有攻击性、负能量的字卡，并且不会抱怨和攻击作者。'){
        lsSet('mj_shop_verified_v1', true);
        verMask.classList.remove('on');
        if(typeof window.__shopVerCb === 'function') window.__shopVerCb();
      } else {
        verHint.textContent = '文字不匹配，请一字不差地输入';
        verHint.classList.add('err');
      }
    };

    document.getElementById('shopDisYes').onclick = function(){
      disMask.classList.remove('on');
      window.openVerifyDialog(function(){
        state.healthMode = false;
        lsSet('mj_shop_health_v1', false);
        healthSw.checked = false;
        renderList();
      });
    };
    document.getElementById('shopDisNo').onclick = function(){
      disMask.classList.remove('on');
      state.healthMode = true;
      lsSet('mj_shop_health_v1', true);
      healthSw.checked = true;
      renderList();
    };

    document.getElementById('shopDrawerMask').onclick = function(){
      drMask.classList.remove('on'); dr.classList.remove('on');
    };
    document.getElementById('shopDrOk').onclick = function(){
      drMask.classList.remove('on'); dr.classList.remove('on');
      renderList();
    };
    document.getElementById('shopDrReset').onclick = function(){
      document.querySelectorAll('.shop-chip').forEach(function(el){
        el.classList.toggle('on', el.dataset.tag === '');
      });
      state.filterTag = '';
    };
    document.querySelectorAll('.shop-chip').forEach(function(el){
      el.onclick = function(){
        document.querySelectorAll('.shop-chip').forEach(function(e){ e.classList.remove('on'); });
        el.classList.add('on');
        state.filterTag = el.dataset.tag || '';
      };
    });

    healthSw.checked = state.healthMode;
    healthSw.onchange = function(){
      var isChecked = this.checked;
      if(!isChecked && !lsGet('mj_shop_verified_v1', false)){
        this.checked = true;
        window.openVerifyDialog(function(){
          state.healthMode = false;
          healthSw.checked = false;
          lsSet('mj_shop_health_v1', false);
        });
      } else {
        state.healthMode = isChecked;
        lsSet('mj_shop_health_v1', isChecked);
      }
    };

    window.__shopShowMask = function(){
      if(!lsGet('mj_shop_verified_v1', false) && lsGet('mj_shop_health_v1', null) === null){
        disMask.classList.add('on');
      }
    };
  }

  function addCollectionToStore(c){
    if(!c || !Array.isArray(c.cards)) return { added: 0, dup: 0, groupName: '' };
    var groups = cardStore.public;

    var targetName = '普通字卡';
    var targetId = 'g-normal';
    if(c.id === 'mood'){ targetName = '心情'; targetId = 'g-mood'; }
    else if(c.id === 'status' || c.id === 'clean'){ targetName = '状态'; targetId = 'g-status'; }

    var g = groups.find(function(x){ return x && (x.id === targetId || x.name === targetName); });
    if(!g){
      g = { id: targetId, name: targetName, icon: 'doc', sub: '', cats: [] };
      groups.push(g);
    }
    if(!Array.isArray(g.cats)) g.cats = [];

    var catName = c.name || '未命名合集';
    var cat = g.cats.find(function(x){ return x && x.name === catName; });
    if(!cat){
      cat = { id: 'c-shop-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: catName, list: [] };
      g.cats.push(cat);
    }
    if(!Array.isArray(cat.list)) cat.list = [];

    var exist = {};
    cat.list.forEach(function(it){
      var t = (typeof it === 'string') ? it : (it && it.text ? it.text : '');
      if(t) exist[String(t).trim()] = 1;
    });

    var added = 0, dup = 0;
    c.cards.forEach(function(t){
      var s = String(t || '').trim();
      if(!s) return;
      if(exist[s]){ dup++; return; }
      cat.list.push({ text: s, t: Date.now() });
      exist[s] = 1;
      added++;
    });

    saveCardStore();
    return { added: added, dup: dup, groupName: targetName + ' / ' + catName };
  }

  function downloadCollection(c){
    if(!c || !Array.isArray(c.cards)) return;
    var gid = 'g-import-' + Date.now().toString(36);
    var data = {
      __type: 'choco-cards',
      __version: 1,
      exportedAt: Date.now(),
      public: [{
        id: gid,
        name: c.name || '未命名合集',
        icon: 'doc',
        sub: c.desc || '',
        cats: [{ id: 'c-import-1', name: '全部', list: c.cards.map(function(t){ return { text: String(t), t: Date.now() }; }) }]
      }],
      roles: {}
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (c.name || '字卡') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function findCard(id){
    var arr = ((window.SHOP_DATA.cats[state.top] || {}).data || {})[state.sub] || [];
    for(var i = 0; i < arr.length; i++){ if(arr[i].id === id) return arr[i]; }
    return null;
  }

  function openPreview(id){
    var c = findCard(id);
    if(!c) return;
    state.openCard = c;
    var pv = document.getElementById('shopPreview');
    pv.innerHTML =
      '<div class="shop-pv-top">' +
        '<button class="shop-pv-back" type="button">‹</button>' +
        '<div class="shop-pv-title">' + esc(c.name) + '</div>' +
        '<div class="shop-pv-right"></div>' +
      '</div>' +
      '<div class="shop-pv-body">' +
        '<div class="shop-pv-desc">' + esc(c.desc) + '</div>' +
        (c.cards || []).map(function(t){ return '<div class="shop-pv-line">' + esc(t) + '</div>'; }).join('') +
      '</div>' +
      '<div class="shop-pv-btns">' +
        '<button class="shop-pv-btn-use" type="button">直 接 使 用</button>' +
        '<button class="shop-pv-btn-dl" type="button">下 载</button>' +
      '</div>';
    pv.classList.add('on');
    pv.querySelector('.shop-pv-back').onclick = closePreview;
    pv.querySelector('.shop-pv-btn-dl').onclick = function(){
      downloadCollection(c);
      if(typeof toast === 'function') toast('已下载');
    };
    pv.querySelector('.shop-pv-btn-use').onclick = function(){
      var r = addCollectionToStore(c);
      var msg = '已添加到：' + r.groupName;
      if(r.dup) msg += '（跳过 ' + r.dup + ' 条重复）';
      
      var t = document.getElementById('shopToast');
      if(!t){
        t = document.createElement('div');
        t.id = 'shopToast';
        t.className = 'shop-toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(function(){ t.classList.remove('show'); }, 2500);
    };
  }

  function closePreview(){
    document.getElementById('shopPreview').classList.remove('on');
    state.openCard = null;
  }

  function renderAll(){ renderTop(); renderSub(); renderList(); }

  function openShop(){
    ensureDom();
    renderTopBarSafe();
    if(!window.__shopLogicInited){
      initLogic();
      window.__shopLogicInited = true;
    }
    state.top = '字卡';
    var subs = (window.SHOP_DATA.cats['字卡'] || {}).subs || [];
    state.sub = subs[0] || '';
    renderAll();
    
    if(typeof showScreen === 'function') showScreen('shopScreen');
    else {
      document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('on'); });
      document.getElementById('shopScreen').classList.add('on');
    }

    var rightHost = document.querySelector('#utopHostShop .utop-right');
    if(rightHost){
      rightHost.innerHTML = '<button class="utop-act txt" id="shopFilterBtn" type="button" style="letter-spacing:1px;padding-right:4px">筛选</button>';
      document.getElementById('shopFilterBtn').onclick = function(){
        document.getElementById('shopDrawerMask').classList.add('on');
        document.getElementById('shopDrawer').classList.add('on');
      };
    }
    
    if(window.__shopShowMask) window.__shopShowMask();
  }

  window.openShop = openShop;

  document.addEventListener('click', function(e){
    var row = e.target && e.target.closest ? e.target.closest('#page-me .me-row[data-func="shop"]') : null;
    if(!row) return;
    e.preventDefault();
    e.stopPropagation();
    openShop();
  }, true);
})();