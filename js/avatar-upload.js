(function(){
  if(window.__avatarUploadFixed) return;
  window.__avatarUploadFixed = true;

  window.triggerAvatarUpload = function(context) {
    var oldInput = document.getElementById('__globalAvatarInput');
    if (oldInput) oldInput.remove();

    var f = document.createElement('input');
    f.type = 'file';
    f.accept = 'image/*';
    f.id = '__globalAvatarInput';
    f.style.display = 'none';
    document.body.appendChild(f);

    f.addEventListener('change', function() {
      var file = f.files && f.files[0];
      f.remove();
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function(e) {
        var dataUrl = e.target.result;
        
        if (context === 'builtin') {
          var newMask = document.getElementById('mNewBuiltin');
          if (newMask && newMask.classList.contains('show')) {
            if (typeof biAvatarTmp !== 'undefined') biAvatarTmp = dataUrl;
            if (typeof renderBiAvatar === 'function') renderBiAvatar();
          } else {
            if (typeof blEditAvatarTmp !== 'undefined') blEditAvatarTmp = dataUrl;
            if (typeof renderBlEditAvatar === 'function') renderBlEditAvatar();
          }
        } else if (context === 'newfriend') {
          if (typeof nfAvatarTmp !== 'undefined') nfAvatarTmp = dataUrl;
          if (typeof renderNfAvatar === 'function') renderNfAvatar();
        } else if (context === 'cip') {
          var rid = typeof getCurrentRoleId === 'function' ? getCurrentRoleId() : '';
          if (rid && typeof saveRoleField === 'function' && window.__avatarStore) {
            window.__avatarStore.set(rid, dataUrl, function(stored){
              saveRoleField(rid, 'avatar', stored);
              var cipAv = document.getElementById('cipAvatar');
              if (cipAv) cipAv.innerHTML = typeof avatarHTML === 'function' ? avatarHTML(stored) : '';
              if (typeof refreshChatRole === 'function') refreshChatRole();
              if (typeof forceRepaintChat === 'function') forceRepaintChat('cip avatar');
            });
          }
        } else if (context === 'profile') {
          var pid = window.__profileViewId || (typeof getCurrentRoleId === 'function' ? getCurrentRoleId() : '');
          if (pid && typeof saveRoleField === 'function' && window.__avatarStore) {
            window.__avatarStore.set(pid, dataUrl, function(stored){
              saveRoleField(pid, 'avatar', stored);
              var pAv = document.getElementById('profileAvatar');
              if (pAv) pAv.innerHTML = typeof avatarHTML === 'function' ? avatarHTML(stored) : '';
              if (pid === (typeof getCurrentRoleId === 'function' ? getCurrentRoleId() : '')) {
                if (typeof refreshChatRole === 'function') refreshChatRole();
              }
              if (typeof forceRepaintChat === 'function') forceRepaintChat('profile avatar');
            });
          }
        } else if (context === 'me') {
          if (typeof userProfile !== 'undefined' && window.__avatarStore) {
            window.__avatarStore.set('me', dataUrl, function(stored){
              if (typeof window.__avatarStore.del === 'function') {
                window.__avatarStore.del(userProfile.avatar);
              }
              userProfile.avatar = stored;
              if (typeof saveUser === 'function') saveUser();
              if (typeof renderMePage === 'function') renderMePage();
              if (typeof refreshChatRole === 'function') refreshChatRole();
              if (typeof forceRepaintChat === 'function') forceRepaintChat('me avatar');
            });
          }
        }
      };
      reader.readAsDataURL(file);
    });

    f.click();
  };
})();