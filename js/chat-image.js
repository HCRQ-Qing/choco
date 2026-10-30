/* ============================================================
   聊天 / 群聊 · 上传图片
   - 点「图片」功能格子 → 打开文件选择器
   - 选完弹确认 → 每张图作为一条消息发出去
   - 图片 Blob 存 IndexedDB，消息里带 imageIdbKey
   - 点击图片 → 全屏查看
   ============================================================ */
(function(){
  if(window.__chatImageUploadReady) return;
  window.__chatImageUploadReady = true;

  /* 1. 聊天页：选完文件 → 确认 → 发送 */
  document.addEventListener('change', function(e){
    var t = e.target;
    if(!t || t.id !== 'chatImagePicker') return;
    var files = Array.prototype.slice.call(t.files || []);
    t.value = '';
    if(!files.length) return;

    /* 只保留图片 */
    files = files.filter(function(f){ return f && f.type && f.type.indexOf('image/') === 0; });
    if(!files.length){ toast('没有可用的图片'); return; }

    var n = files.length;
    var confirmMsg = n === 1 ? '确定发送这张图片？' : ('确定发送 ' + n + ' 张图片？');
    if(!confirm(confirmMsg)) return;

    sendImagesToChat(files);
  }, true);

  /* 1.5 存图公用函数：私聊群聊都走这里
     ownerId = 角色 id 或 群 id
     返回 Promise<{ key, msg }>，msg 里已经带上 imageIdbKey */
  function saveMsgImage(file, ownerId){
    var key = 'msgimg_' + ownerId + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
    return __idb.set(key, file).then(function(){
      return { key: key };
    });
  }

  /* 2. 发送：每张图作为一条消息，间隔 100~500ms */
  function sendImagesToChat(files){
    var roleId = getCurrentRoleId();
    if(!roleId){ toast('找不到当前角色'); return; }

    files.forEach(function(file, idx){
      setTimeout(function(){
        saveMsgImage(file, roleId).then(function(r){
          var key = r.key;
          var msg = {
            id: uid(),
            role: 'user',
            imageIdbKey: key,
            time: Date.now()
          };
          /* ★ 统一走状态机入口；最后一张发完才触发回复 */
          if(idx === files.length - 1){
            dispatchUserMsg(msg);
          } else {
            /* 中间张只 push，不触发状态机，避免多条互相抢已读 */
            msgs.push(msg);
            saveMsgs();
            window.__lastRenderSig = '';
            if(typeof renderChatFull === 'function') renderChatFull(true);
            else renderChat(true);
          }
        }).catch(function(err){
          console.error('图片存 IndexedDB 失败', err);
          toast('第 ' + (idx+1) + ' 张图片保存失败');
        });
      }, idx * (100 + Math.floor(Math.random() * 400)));
    });

    toast('已发送 ' + files.length + ' 张图片');
  }

  /* 3. 群聊页：选完文件 → 确认 → 发送 */
  document.addEventListener('change', function(e){
    var t = e.target;
    if(!t || t.id !== 'gchImagePicker') return;
    var files = Array.prototype.slice.call(t.files || []);
    t.value = '';
    if(!files.length) return;
    files = files.filter(function(f){ return f && f.type && f.type.indexOf('image/') === 0; });
    if(!files.length){ toast('没有可用的图片'); return; }
    var n = files.length;
    var confirmMsg = n === 1 ? '确定发送这张图片？' : ('确定发送 ' + n + ' 张图片？');
    if(!confirm(confirmMsg)) return;
    sendImagesToGroup(files);
  }, true);

  /* 4. 群聊发送 */
  function sendImagesToGroup(files){
    var g = (typeof getGroupById === 'function' && window.__curGroupId) ? getGroupById(window.__curGroupId) : null;
    if(!g){ toast('找不到群聊'); return; }
    var arr = getGroupMsgs(g.id);

    files.forEach(function(file, idx){
      setTimeout(function(){
        saveMsgImage(file, g.id).then(function(r){
          var key = r.key;
          arr.push({
            id: uid(),
            role: 'user',
            imageIdbKey: key,
            time: Date.now()
          });
          saveGroupMsgs(g.id, arr);
          g.lastMsgAt = Date.now();
          saveGroup(g);
          if(window.__curGroupId === g.id){
            if(typeof renderGroupChat === 'function') renderGroupChat();
          }
        }).catch(function(err){
          console.error('群聊图片存 IndexedDB 失败', err);
          toast('第 ' + (idx+1) + ' 张图片保存失败');
        });
      }, idx * (100 + Math.floor(Math.random() * 400)));
    });

    toast('已发送 ' + files.length + ' 张图片');
  }

  /* 5. 图片点击放大 */
  document.addEventListener('click', function(e){
    var img = e.target.closest && e.target.closest('.msg-image-bubble .img-real');
    if(!img) return;
    e.preventDefault();
    e.stopPropagation();
    var src = img.getAttribute('src');
    if(!src) return;

    var mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:16px';
    mask.innerHTML = '<img src="' + src + '" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:6px">';
    mask.addEventListener('click', function(){ mask.remove(); });
    document.body.appendChild(mask);
  }, true);
})();
