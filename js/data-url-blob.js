/* ★ 全局基础工具：把 base64 图片转成 Blob 对象 */
if (typeof window.dataURLToBlob !== 'function') {
  window.dataURLToBlob = function(dataUrl) {
    try {
      var parts = String(dataUrl || '').split(',');
      if (parts.length < 2) return new Blob([], { type: 'image/jpeg' });
      var mimeMatch = parts[0].match(/:(.*?);/);
      var mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      var binStr = atob(parts[1]);
      var len = binStr.length;
      var arr = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
      }
      return new Blob([arr], { type: mime });
    } catch (e) {
      console.error('dataURLToBlob 转换失败', e);
      return new Blob([], { type: 'image/jpeg' });
    }
  };
}