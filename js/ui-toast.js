// ========================================
// csToast — notificaciones no bloqueantes (reemplazo de alert() de aviso)
// Self-contained: inyecta sus propios estilos, sin dependencias.
// Uso: csToast('mensaje', 'success' | 'error' | 'warn' | 'info')
//
// Nota: los alert() que van seguidos de una redirección/reload se mantienen
// como alert() a propósito (bloquean hasta que el usuario los ve). Este toast
// es solo para avisos donde la página no navega inmediatamente.
// ========================================
(function () {
  if (window.csToast) return; // idempotente

  var STYLE_ID = 'cs-toast-style';
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.cs-toast-wrap{position:fixed;top:18px;right:18px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:min(92vw,380px);pointer-events:none;}' +
      '.cs-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;background:rgba(21,21,21,0.98);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-left:4px solid var(--orange,#FF6A00);border-radius:12px;padding:13px 15px;font-family:Montserrat,system-ui,sans-serif;font-size:14px;line-height:1.4;box-shadow:0 12px 34px rgba(0,0,0,0.5);transform:translateX(120%);opacity:0;transition:transform .32s cubic-bezier(.2,.8,.2,1),opacity .32s;}' +
      '.cs-toast.show{transform:none;opacity:1;}' +
      '.cs-toast.success{border-left-color:#2bb673;}' +
      '.cs-toast.error{border-left-color:#ff4444;}' +
      '.cs-toast.warn{border-left-color:#e0a23a;}' +
      '.cs-toast .cs-toast-ic{flex-shrink:0;font-size:16px;line-height:1.3;}' +
      '.cs-toast .cs-toast-msg{flex:1;white-space:pre-line;word-break:break-word;}' +
      '.cs-toast .cs-toast-x{flex-shrink:0;background:none;border:none;color:#888;cursor:pointer;font-size:16px;line-height:1;padding:0 2px;}' +
      '.cs-toast .cs-toast-x:hover{color:#fff;}' +
      '@media (prefers-reduced-motion:reduce){.cs-toast{transition:opacity .2s;transform:none;}}';
    document.head.appendChild(s);
  }

  function wrap() {
    var w = document.getElementById('cs-toast-wrap');
    if (!w) {
      w = document.createElement('div');
      w.id = 'cs-toast-wrap';
      w.className = 'cs-toast-wrap';
      (document.body || document.documentElement).appendChild(w);
    }
    return w;
  }

  var ICONS = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };

  window.csToast = function (msg, type, opts) {
    try {
      ensureStyles();
      opts = opts || {};
      type = ICONS[type] ? type : 'info';
      var el = document.createElement('div');
      el.className = 'cs-toast ' + type;
      el.setAttribute('role', type === 'error' ? 'alert' : 'status');

      var ic = document.createElement('span');
      ic.className = 'cs-toast-ic';
      ic.textContent = ICONS[type];

      var body = document.createElement('div');
      body.className = 'cs-toast-msg';
      body.textContent = String(msg == null ? '' : msg);

      var x = document.createElement('button');
      x.className = 'cs-toast-x';
      x.setAttribute('aria-label', 'Cerrar');
      x.textContent = '×';

      el.appendChild(ic); el.appendChild(body); el.appendChild(x);
      wrap().appendChild(el);
      requestAnimationFrame(function () { el.classList.add('show'); });

      var timer;
      function dismiss() {
        clearTimeout(timer);
        el.classList.remove('show');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
      }
      x.addEventListener('click', dismiss);
      var ms = typeof opts.duration === 'number' ? opts.duration : (type === 'error' ? 6000 : 4000);
      if (ms > 0) timer = setTimeout(dismiss, ms);
      return dismiss;
    } catch (e) {
      // Fallback ultra-seguro: nunca romper el flujo del usuario
      try { alert(String(msg)); } catch (e2) {}
    }
  };
})();
