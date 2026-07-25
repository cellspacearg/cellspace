/* =================================================================
   CELL SPACE · CSAuth — detector de rol (Cap.2 / Parte 13)
   Fuente única de verdad del rol en el sitio público.
   Aditivo: NO toca el header ni auth-middleware. Solo publica estado.
   En producción no pinta nada; la UI de diagnóstico sale con ?csdebug=1
   ================================================================= */
(function () {
  'use strict';
  if (window.CSAuth) return; // idempotente

  // Admin único (client-side, solo para UI rápida; la verdad es my_role() en SQL)
  var ADMIN_EMAIL = (window.ADMIN_EMAIL || 'nahuel0123encinas@gmail.com').toLowerCase();

  // Matriz de permisos: UNA fuente para 14/17/18/19. 'all' = todos los logueados.
  var PERM_MATRIX = {
    see_prices:            { visitor:false, client:true,  technician:true,  admin:true  },
    see_stock:             { visitor:false, client:true,  technician:true,  admin:true  },
    can_buy:               { visitor:false, client:true,  technician:true,  admin:true  },
    can_cart:              { visitor:false, client:true,  technician:true,  admin:true  },
    see_technical_cats:    { visitor:false, client:false, technician:true,  admin:true  },
    see_exclusive_products:{ visitor:false, client:false, technician:true,  admin:true  },
    access_marketplace:    { visitor:false, client:false, technician:true,  admin:true  },
    access_central:        { visitor:false, client:false, technician:true,  admin:true  },
    access_forum:          { visitor:false, client:false, technician:true,  admin:true  },
    access_library:        { visitor:false, client:false, technician:true,  admin:true  },
    access_tools:          { visitor:false, client:false, technician:true,  admin:true  },
    access_downloads:      { visitor:false, client:false, technician:true,  admin:true  },
    admin_cms:             { visitor:false, client:false, technician:false, admin:true  }
  };
  var PERM_ORDER = Object.keys(PERM_MATRIX);
  var PERM_LABEL = {
    see_prices:'Ver precios', see_stock:'Ver stock', can_buy:'Comprar', can_cart:'Carrito',
    see_technical_cats:'Categorías técnicas', see_exclusive_products:'Productos exclusivos',
    access_marketplace:'Marketplace', access_central:'Central Space', access_forum:'Foro',
    access_library:'Biblioteca', access_tools:'Herramientas', access_downloads:'Descargas', admin_cms:'CMS /admin'
  };

  var state = { role:'visitor', email:null, uid:null, source:'pending', ms:0, ready:false };
  var readyQueue = [];
  var listeners = [];

  function sb() { return window.supabase && typeof window.supabase.from === 'function' ? window.supabase : null; }
  function isDebug() {
    try { return /[?&]csdebug=1/.test(location.search) || localStorage.getItem('cs_debug') === '1'; } catch (e) { return false; }
  }

  // ---- resolución del rol, en capas (robusta a SQL faltante) ----
  async function resolveRole(session) {
    if (!session || !session.user) return { role:'visitor', source:'sin sesión' };
    var email = (session.user.email || '').toLowerCase();
    var uid = session.user.id;
    var meta = (session.user.user_metadata) || {};

    // 1) admin por email (rápido, client-side)
    if (email && email === ADMIN_EMAIL) return { role:'admin', email:email, uid:uid, source:'email admin' };

    var client = sb();
    if (!client) return { role:(meta.role === 'technician' ? 'technician' : 'client'), email:email, uid:uid, source:'metadata (sin supabase)' };

    // 2) verdad server-side: función my_role()
    try {
      var rpc = await client.rpc('my_role');
      if (rpc && !rpc.error && rpc.data) {
        var r = String(rpc.data).toLowerCase();
        if (r === 'admin' || r === 'technician' || r === 'client') return { role:r, email:email, uid:uid, source:'rpc my_role()' };
      }
    } catch (e) { /* sigue al fallback */ }

    // 3) tabla profiles
    try {
      var pr = await client.from('profiles').select('role').eq('id', uid).maybeSingle();
      if (pr && !pr.error && pr.data && pr.data.role) return { role:String(pr.data.role).toLowerCase(), email:email, uid:uid, source:'tabla profiles' };
    } catch (e) {}

    // 4) metadata del signup
    if (meta.role === 'technician') return { role:'technician', email:email, uid:uid, source:'metadata' };
    return { role:'client', email:email, uid:uid, source:'default cliente' };
  }

  function commit(next) {
    var prev = state.role;
    state.role = next.role || 'visitor';
    state.email = next.email || (state.email || null);
    state.uid = next.uid || (state.uid || null);
    state.source = next.source || state.source;
    state.ready = true;
    // dispara ready una sola vez, change siempre
    while (readyQueue.length) { try { readyQueue.shift()(state); } catch (e) {} }
    listeners.forEach(function (fn) { try { fn(state, prev); } catch (e) {} });
    document.dispatchEvent(new CustomEvent('csauth:ready', { detail: state }));
    if (prev !== state.role) document.dispatchEvent(new CustomEvent('csauth:change', { detail: state }));
    if (isDebug()) renderDebug();
  }

  async function boot() {
    var t0 = performance.now();
    var client = sb();
    if (!client) { state.ms = Math.round(performance.now() - t0); commit({ role:'visitor', source:'supabase no disponible' }); return; }
    try {
      var s = await client.auth.getSession();
      var resolved = await resolveRole(s.data.session);
      state.ms = Math.round(performance.now() - t0);
      commit(resolved);
    } catch (e) {
      state.ms = Math.round(performance.now() - t0);
      commit({ role:'visitor', source:'error: ' + (e && e.message || e) });
    }
    // re-resolver en login / logout
    try {
      client.auth.onAuthStateChange(function (ev, sess) {
        if (ev === 'SIGNED_OUT') { state.ms = 0; commit({ role:'visitor', email:null, uid:null, source:'logout' }); }
        else if (ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED') {
          var t = performance.now();
          resolveRole(sess).then(function (r) { state.ms = Math.round(performance.now() - t); commit(r); });
        }
      });
    } catch (e) {}
  }

  // ---- API pública ----
  var API = {
    role: function () { return state.role; },
    is: function (r) { return state.role === r; },
    email: function () { return state.email; },
    ready: function () { return state.ready; },
    state: function () { return Object.assign({}, state); },
    matrix: function () { return PERM_MATRIX; },
    // ¿puede el rol actual hacer X?
    can: function (feature) {
      var row = PERM_MATRIX[feature]; if (!row) return false;
      return !!row[state.role];
    },
    // ejecuta onAllow si puede; si no, onDeny o el flujo "solicitar acceso" (Parte 14)
    guard: function (feature, onAllow, onDeny) {
      var run = function () {
        if (API.can(feature)) { if (onAllow) onAllow(); }
        else {
          document.dispatchEvent(new CustomEvent('csauth:denied', { detail: { feature: feature, role: state.role } }));
          if (onDeny) onDeny(); else if (isDebug()) toast('🔒 “' + (PERM_LABEL[feature] || feature) + '” requiere acceso (sos ' + state.role + ')');
        }
      };
      if (state.ready) run(); else API.onReady(run);
    },
    onReady: function (fn) { if (state.ready) fn(state); else readyQueue.push(fn); },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; },
    // diagnóstico
    debug: function (on) {
      try { localStorage.setItem('cs_debug', on ? '1' : '0'); } catch (e) {}
      if (on) { if (state.ready) renderDebug(); else API.onReady(renderDebug); }
      else { var n = document.getElementById('csAuthDebug'); if (n) n.remove(); }
    }
  };
  window.CSAuth = API;

  // ---- toast de sistema (solo debug) ----
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'csd-toast'; t.textContent = msg;
    document.body.appendChild(t); requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 350); }, 3000);
  }

  // ---- consola de diagnóstico (solo ?csdebug=1) ----
  var ROLE_META = {
    visitor:    { t:'Visitante',     i:'fa-ghost',          c:'#8a8a8a' },
    client:     { t:'Cliente',       i:'fa-user',           c:'#FF6A00' },
    technician: { t:'Técnico',       i:'fa-screwdriver-wrench', c:'#2bb6a3' },
    admin:      { t:'Administrador', i:'fa-crown',          c:'#e0a23a' }
  };
  function renderDebug() {
    var old = document.getElementById('csAuthDebug'); if (old) old.remove();
    document.body.classList.add('cs-debug');
    var m = ROLE_META[state.role] || ROLE_META.visitor;
    var chips = PERM_ORDER.map(function (k, i) {
      var on = !!PERM_MATRIX[k][state.role];
      return '<span class="csd-chip ' + (on ? 'on' : 'off') + '" style="--d:' + (i * 35) + 'ms">' +
        '<i class="fas ' + (on ? 'fa-check' : 'fa-lock') + '"></i>' + PERM_LABEL[k] + '</span>';
    }).join('');

    var node = document.createElement('div');
    node.id = 'csAuthDebug'; node.className = 'cs-auth-debug';
    node.innerHTML =
      '<div class="csd-scan" aria-hidden="true"></div>' +
      '<header class="csd-head">' +
        '<span class="csd-led"></span>' +
        '<span class="csd-kicker">CSAuth · diagnóstico</span>' +
        '<button class="csd-x" id="csdClose" title="Cerrar"><i class="fas fa-times"></i></button>' +
      '</header>' +
      '<div class="csd-role" style="--rc:' + m.c + '">' +
        '<span class="csd-role-ic"><i class="fas ' + m.i + '"></i></span>' +
        '<div><span class="csd-role-l">Rol detectado</span><span class="csd-role-v">' + m.t + '</span></div>' +
      '</div>' +
      '<dl class="csd-meta">' +
        '<div><dt>email</dt><dd>' + (state.email ? escapeHtml(state.email) : '—') + '</dd></div>' +
        '<div><dt>fuente</dt><dd>' + escapeHtml(state.source) + '</dd></div>' +
        '<div><dt>resuelto en</dt><dd class="csd-mono">' + state.ms + ' ms</dd></div>' +
      '</dl>' +
      '<div class="csd-perm-h">Permisos de este rol</div>' +
      '<div class="csd-perm">' + chips + '</div>' +
      '<footer class="csd-foot">' +
        '<button class="csd-btn" id="csdCopy"><i class="fas fa-copy"></i> Copiar</button>' +
        '<span class="csd-hint">?csdebug=1 · CSAuth.debug(false) para ocultar</span>' +
      '</footer>';
    document.body.appendChild(node);

    document.getElementById('csdClose').onclick = function () { API.debug(false); };
    document.getElementById('csdCopy').onclick = function () {
      var txt = 'CSAuth role=' + state.role + ' | email=' + (state.email || '-') + ' | source=' + state.source + ' | ' + state.ms + 'ms\n' +
        PERM_ORDER.map(function (k) { return (PERM_MATRIX[k][state.role] ? '[x] ' : '[ ] ') + PERM_LABEL[k]; }).join('\n');
      try { navigator.clipboard.writeText(txt); toast('Diagnóstico copiado'); } catch (e) { toast('No se pudo copiar'); }
    };
  }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
