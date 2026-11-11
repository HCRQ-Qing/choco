/* 文件：js/video-fav.js */
(function(){
  'use strict';

  var GROUP_KEY = 'mj_video_fav_groups_v1';

  function getGroups(){
    var m = null;
    try{ m = JSON.parse(localStorage.getItem(GROUP_KEY) || '[]'); }catch(e){}
    if(!Array.isArray(m) || !m.length) return ['默认收藏夹'];
    return m;
  }
  function saveGroups(a){
    try{ localStorage.setItem(GROUP_KEY, JSON.stringify(a)); }catch(e){}
  }

  window.VideoFav = {
    getGroups: getGroups,
    saveGroups: saveGroups,
    
    promptGroup: function(videoId, cb){
      var groups = getGroups();
      var mask = document.createElement('div');
      mask.className = 'modal show';
      mask.style.zIndex = '99999';
      
      var html = '<div class="overlay" data-close></div><div class="sheet" style="max-width:300px;border-radius:20px;padding:22px 20px 16px">';
      html += '<div class="sheet-head" style="display:block;text-align:center;padding:0 0 16px;border-bottom:0.6px dashed #eee;margin-bottom:12px"><h3 style="font-size:15px;font-weight:300;letter-spacing:4px;margin:0">收藏到</h3><button class="x" data-close type="button" style="position:absolute;right:14px;top:14px;font-size:14px;color:#ccc;border:none;background:transparent">✕</button></div>';
      html += '<div class="sheet-body" style="max-height:250px;overflow-y:auto;padding:0">';
      html += groups.map(function(g){
        return '<div class="chk-row" data-pick="' + g + '" style="padding:12px 4px;border-bottom:0.6px dashed #f0f0f0;cursor:pointer"><div class="nm" style="font-size:13.5px;letter-spacing:1px">📁 ' + g + '</div></div>';
      }).join('');
      html += '<div class="chk-row" id="newGroupBtn" style="padding:14px 4px;cursor:pointer;justify-content:center"><div class="nm" style="color:#1a1a1a;font-size:13px">＋ 新建收藏夹</div></div>';
      html += '</div></div>';
      
      mask.innerHTML = html;
      document.body.appendChild(mask);

      var close = function(){ if(mask.parentNode) mask.remove(); };
      mask.querySelectorAll('[data-close]').forEach(function(el){ el.addEventListener('click', close); });
      
      mask.querySelectorAll('[data-pick]').forEach(function(el){
        el.addEventListener('click', function(){
          close();
          cb(el.dataset.pick);
        });
      });

      mask.querySelector('#newGroupBtn').addEventListener('click', function(){
        var name = prompt('新建收藏夹名称');
        if(!name || !name.trim()) return;
        name = name.trim();
        var arr = getGroups();
        if(arr.indexOf(name) < 0){ arr.push(name); saveGroups(arr); }
        close();
        cb(name);
      });
    },

    renderFolders: function(pool, onOpen){
      var groups = getGroups();
      var counts = {};
      groups.forEach(function(g){ counts[g] = 0; });
      counts['默认收藏夹'] = counts['默认收藏夹'] || 0;

      pool.forEach(function(v){
        if(v.fav){
          var g = v.favGroup || '默认收藏夹';
          counts[g] = (counts[g] || 0) + 1;
        }
      });

      var html = '<div class="vp-section-title">我的收藏夹</div>';
      html += '<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">';
      
      groups.forEach(function(g){
        var c = counts[g] || 0;
        html += '<div class="vp-fav-folder" data-group="' + g + '" style="display:flex;align-items:center;gap:12px;padding:14px;background:#fff;border:0.7px solid #eee;border-radius:12px;cursor:pointer">';
        html += '<div style="width:38px;height:38px;background:#fafafa;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px">📁</div>';
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="font-size:14px;font-weight:500;color:#1a1a1a">' + g + '</div>';
        html += '<div style="font-size:11px;color:#aaa;margin-top:2px">' + c + ' 个视频</div>';
        html += '</div><div style="color:#ccc;font-size:14px">›</div></div>';
      });
      html += '</div>';

      setTimeout(function(){
        var body = document.getElementById('vpBody');
        if(!body) return;
        var folders = body.querySelectorAll('.vp-fav-folder');
        folders.forEach(function(el){
          el.addEventListener('click', function(){
            onOpen(el.dataset.group);
          });
        });
      }, 50);

      return html;
    },

    renderFolderDetail: function(pool, groupName, onBack){
      var items = pool.filter(function(v){ 
        return v.fav && (v.favGroup || '默认收藏夹') === groupName; 
      });

      var html = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">';
      html += '<button class="vp-back-btn" style="width:32px;height:32px;border:none;background:transparent;font-size:20px;cursor:pointer">‹</button>';
      html += '<div style="font-size:15px;font-weight:500;color:#1a1a1a">📁 ' + groupName + '</div>';
      html += '</div>';

      if(!items.length){
        html += '<div class="vp-empty">这个收藏夹是空的</div>';
      } else {
        var sorted = items.slice().sort(function(a, b){ return (b.time || 0) - (a.time || 0); });
        html += sorted.map(window.vpItemHTML).join('');
      }

      setTimeout(function(){
        var body = document.getElementById('vpBody');
        if(!body) return;
        var back = body.querySelector('.vp-back-btn');
        if(back) back.addEventListener('click', onBack);
      }, 50);

      return html;
    }
  };
})();