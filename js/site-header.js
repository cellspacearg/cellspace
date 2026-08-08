// ========================================
// Header unificado del sitio (announcement-bar + header + nav)
// Elimina la duplicación del mismo header en las páginas principales.
//
// Uso: colocar al inicio del <body>
//   <div id="site-header"
//        data-active="index|tienda|servicios|central"
//        data-search-placeholder="..."
//        data-search-action="performSearch|performHeaderSearch"
//        data-cart-href="#"                    (opcional, default "#")
//        data-cart-onclick="toggleCart(); return false;"  (opcional; vacío = sin drawer)>
//   </div>
//   <script src="js/site-header.js"></script>
//
// Se inyecta de forma SÍNCRONA (el mount ya existe cuando corre este script),
// así los IDs que usa auth-middleware.js (guestActions, userActions, adminMenu,
// userDropdown, cartCount, etc.) están disponibles antes de que ese script corra.
// ========================================
(function () {
  var mount = document.getElementById('site-header');
  if (!mount) return;

  var active = mount.getAttribute('data-active') || '';
  var placeholder = mount.getAttribute('data-search-placeholder') || 'Buscar productos, herramientas, servicios...';
  var searchAction = mount.getAttribute('data-search-action') || 'performSearch';
  var cartHref = mount.hasAttribute('data-cart-href') ? mount.getAttribute('data-cart-href') : '#';
  var cartOnclick = mount.hasAttribute('data-cart-onclick') ? mount.getAttribute('data-cart-onclick') : 'toggleCart(); return false;';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function act(key) { return active === key ? ' active' : ''; }

  var ann = [
    ['fa-truck', 'Envíos a todo el país por OCA y Andreani'],
    ['fa-shield-alt', 'Garantía en todos los productos'],
    ['fa-dollar-sign', 'Compra mínima $150.000 pesos'],
    ['fa-bolt', 'Pedidos despachados en 24hs hábiles'],
    ['fa-boxes', 'Stock y precios actualizados'],
    ['fa-lock', 'Pago 100% seguro']
  ];
  function annItems() {
    return ann.map(function (a) {
      return '<div class="announcement-item"><i class="fas ' + a[0] + '"></i><span>' + a[1] + '</span></div>';
    }).join('');
  }

  var cartAttrs = 'href="' + esc(cartHref) + '"' + (cartOnclick ? ' onclick="' + esc(cartOnclick) + '"' : '');

  var html =
    '<div class="announcement-bar">' +
      '<div class="announcement-wrapper">' +
        '<div class="announcement-scroll">' + annItems() + annItems() + '</div>' +
      '</div>' +
    '</div>' +
    '<header class="site-header" id="siteHeader">' +
      '<div class="header-top">' +
        '<div class="container">' +
          '<div class="header-top-content">' +
            '<a href="index.html" class="logo">' +
              '<img src="assets/logo.png" alt="Cell Space Argentina" width="45" height="45">' +
              '<div class="logo-text"><span class="logo-main">CELL SPACE</span><span class="logo-sub">ARGENTINA</span></div>' +
            '</a>' +
            '<div class="header-search">' +
              '<input type="text" id="headerSearchInput" class="search-input" placeholder="' + esc(placeholder) + '" enterkeyhint="search">' +
              '<button class="search-btn" onclick="' + esc(searchAction) + '()" aria-label="Buscar"><i class="fas fa-search"></i></button>' +
            '</div>' +
            '<div class="header-actions">' +
              '<div id="guestActions" class="header-auth-group">' +
                '<a href="register-client.html" class="header-action" style="color: var(--orange); font-weight: 700;"><i class="fas fa-user-plus"></i><span>Regístrate</span></a>' +
                '<a href="login.html" class="btn-login-header"><i class="fas fa-sign-in-alt"></i><span>Iniciar Sesión</span></a>' +
              '</div>' +
              '<div id="userActions" class="header-auth-group" style="display: none;">' +
                '<div class="user-dropdown" id="userDropdown">' +
                  '<button class="user-btn" onclick="toggleUserDropdown()">' +
                    '<div class="user-avatar-small"><span id="userInitial">?</span></div>' +
                    '<div class="user-info"><span class="user-name" id="userNameDisplay">Usuario</span><span class="user-badge" id="userRoleBadge">Cliente</span></div>' +
                    '<span class="dropdown-arrow">▼</span>' +
                  '</button>' +
                  '<div class="dropdown-menu" id="userDropdownMenu">' +
                    '<a href="perfil.html" class="dropdown-item"><i class="fas fa-user-cog"></i> Mi Perfil</a>' +
                    '<a href="mis-pedidos.html" class="dropdown-item"><i class="fas fa-box"></i> Mis Pedidos</a>' +
                    '<div id="adminMenu" style="display: none;">' +
                      '<div class="dropdown-divider"></div>' +
                      '<div class="dropdown-header">Administración</div>' +
                      '<a href="admin/index.html" class="dropdown-item"><i class="fas fa-cog"></i> Panel Admin</a>' +
                    '</div>' +
                    '<div class="dropdown-divider"></div>' +
                    '<a href="#" class="dropdown-item logout" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<a href="https://wa.me/5493782437674" target="_blank" rel="noopener" class="header-action"><i class="fas fa-headset"></i><span>Soporte</span></a>' +
              '<a ' + cartAttrs + ' class="header-action cart-action" aria-label="Carrito"><i class="fas fa-shopping-cart"></i><span>Carrito</span><span class="cart-count" id="cartCount">0</span></a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<nav class="main-navigation">' +
        '<div class="container">' +
          '<ul class="nav-menu">' +
            '<li><a href="index.html" class="nav-link' + act('index') + '">INICIO</a></li>' +
            '<li><a href="tienda.html" class="nav-link' + act('tienda') + '">TIENDA</a></li>' +
            '<li><a href="servicios.html" class="nav-link' + act('servicios') + '">SERVICIO TÉCNICO</a></li>' +
            '<li><a href="central-space.html" class="nav-link' + act('central') + '">CENTRAL SPACE</a></li>' +
            '<li><a href="index.html#contacto" class="nav-link">CONTACTO</a></li>' +
          '</ul>' +
        '</div>' +
      '</nav>' +
    '</header>';

  mount.outerHTML = html;
})();
