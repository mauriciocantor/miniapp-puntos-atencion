/**
 * SuperApp Runtime
 * Motor que ejecuta mini-programas compilados desde AXML
 * Se inyecta en el bundle final
 */

(function(global) {
  var _pages = {};
  var _components = {};
  var _currentPage = null;

  var Runtime = {

    // ── Registro ────────────────────────────────────────
    registerPage: function(name, PageClass) {
      _pages[name] = PageClass;
    },

    registerComponent: function(name, ComponentClass) {
      _components[name] = ComponentClass;
    },

    // ── App lifecycle ───────────────────────────────────
    initApp: function(config) {
      if (typeof config.onLaunch === 'function') {
        config.onLaunch({});
      }
      if (typeof config.onShow === 'function') {
        config.onShow({});
      }
    },

    // ── Page base class ─────────────────────────────────
    Page: function() {
      this.data = {};
      this._observers = [];
    },

    // ── Component base class ────────────────────────────
    Component: function() {
      this.props = {};
      this.data = {};
    },

    // ── Render engine ───────────────────────────────────
    render: function(rootEl) {
      console.log('[Runtime] iniciando render');
      var pageNames = Object.keys(_pages);
      console.log('[Runtime] páginas registradas:', pageNames);

      if (pageNames.length === 0) {
        console.error('[Runtime] No hay páginas registradas');
        rootEl.innerHTML = '<p style="padding:20px;color:red">Error: No hay páginas registradas</p>';
        return;
      }

      var PageClass = _pages[pageNames[0]];
      _currentPage = new PageClass();
      _currentPage.data = _currentPage.data || {};
      window.__superappPage = _currentPage;

      // Ejecutar lifecycle
      if (typeof _currentPage.onLoad === 'function') {
        _currentPage.onLoad({});
      }

      // Render inicial
      this._renderPage(_currentPage, rootEl);

      if (typeof _currentPage.onReady === 'function') {
        _currentPage.onReady();
      }
      if (typeof _currentPage.onShow === 'function') {
        _currentPage.onShow();
      }
    },

    _renderPage: function(page, rootEl) {
      // Si render=true y hay coordenadas, mostrar el mapa directamente
      if (page.data.render && page.data.latitude && page.data.longitude) {
        var mapUrl = 'https://apiselfservice.co/archivos/maps/index.html' +
          '?lat=' + page.data.latitude +
          '&lng=' + page.data.longitude;
        rootEl.innerHTML = '<iframe src="' + mapUrl + '" style="width:100%;height:100vh;border:none;"></iframe>';
        return;
      }

      // Si loader=false y hay modal, mostrar pantalla de permisos simplificada
      if (!page.data.loader && page.data.modal && page.data.modal.show) {
        rootEl.innerHTML = [
          '<div style="min-height:100vh;background:#f5f5f5;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;">',
          '<img src="assets/images/iconos-notificacion.svg" style="width:80px;margin-bottom:24px;" onerror="this.style.display=\'none\'">',
          '<p style="font-size:16px;color:#2D2D2D;text-align:center;margin-bottom:32px;line-height:1.5;">',
          (page.data.modal.text || '').replace(/\\n/g, '<br>'),
          '</p>',
          page.data.modalButtonSlot ? [
            '<button onclick="window.__superappPage.androidGetLocation && window.__superappPage.androidGetLocation()" ',
            'style="width:100%;padding:14px;background:#DA291C;color:white;border:none;border-radius:25px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:12px;">',
            (page.data.modal.textButton || 'Sí, permitir'),
            '</button>',
            '<button onclick="window.__superappPage.exitMiniprogram && window.__superappPage.exitMiniprogram()" ',
            'style="width:100%;padding:14px;background:transparent;color:#DA291C;border:1.5px solid #DA291C;border-radius:25px;font-size:15px;cursor:pointer;">',
            'En otro momento',
            '</button>',
          ].join('') : '',
          '</div>',
        ].join('');

        // Exponer la página para los botones
        window.__superappPage = page;
        return;
      }

      // Loader activo — mostrar spinner
      rootEl.innerHTML = [
        '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;">',
        '<img src="assets/images/claro_loading.gif" style="width:80px;" onerror="this.style.display=\'none\'">',
        '<p style="color:#888;margin-top:16px;font-size:14px;">Cargando...</p>',
        '</div>',
      ].join('');
    },

    // ── Template resolver ───────────────────────────────
    _resolveTemplate: function(html, data) {
      // Resolver {{ variable }}
      html = html.replace(/\{\{([^}]+)\}\}/g, function(match, expr) {
        try {
          var val = _evaluate(expr.trim(), data);
          return val !== undefined && val !== null ? val : '';
        } catch(e) {
          return '';
        }
      });

      // Resolver data-if
      var temp = document.createElement('div');
      temp.innerHTML = html;
      _processDirectives(temp, data);
      return temp.innerHTML;
    },

    // ── Event binding ───────────────────────────────────
    _bindEvents: function(rootEl, page) {
      var els = rootEl.querySelectorAll('[data-ontap]');
      els.forEach(function(el) {
        var method = el.getAttribute('data-ontap');
        el.addEventListener('click', function(e) {
          if (page[method] && typeof page[method] === 'function') {
            page[method].call(page, e);
          }
        });
      });
    },

    // ── WebView resolver ─────────────────────────────────
    _resolveWebViews: function(rootEl, data) {
      var iframes = rootEl.querySelectorAll('iframe[data-src]');
      iframes.forEach(function(iframe) {
        var src = iframe.getAttribute('data-src');
        src = src.replace(/\{\{([^}]+)\}\}/g, function(match, expr) {
          try {
            return _evaluate(expr.trim(), data) || '';
          } catch(e) { return ''; }
        });
        iframe.src = src;
      });
    },
  };

  // ── setData reactivo ─────────────────────────────────
  Runtime.Page.prototype.setData = function(newData) {
    Object.assign(this.data, newData);
    if (_currentPage === this) {
      var rootEl = document.getElementById('app');
      if (rootEl) Runtime._renderPage(this, rootEl);
    }
  };

  Runtime.Component.prototype.setData = Runtime.Page.prototype.setData;

  // ── Helpers privados ─────────────────────────────────
  function _evaluate(expr, data) {
    if (!expr || !expr.trim()) return undefined;
    var keys = Object.keys(data);
    var vals = keys.map(function(k) { return data[k]; });
    try {
      return new Function(keys, 'return (' + expr + ')').apply(null, vals);
    } catch(e) {
        console.error('[Runtime] _evaluate error:', expr, e.message);
      return undefined;
    }
  }

    function _processDirectives(el, data) {
        // data-if / data-else
        var ifEls = Array.from(el.querySelectorAll('[data-if]'));
        ifEls.forEach(function(node) {
            if (!node.parentNode) return;
            var rawExpr = node.getAttribute('data-if') || '';
            var expr = rawExpr.replace(/^\s*\{\{\s*/, '').replace(/\s*\}\}\s*$/, '').trim();
            if (!expr) { node.removeAttribute('data-if'); return; }
            var show = _evaluate(expr, data);
            if (!show) {
            var next = node.nextElementSibling;
            if (next && next.hasAttribute('data-else')) next.remove();
            node.remove();
            } else {
            var next2 = node.nextElementSibling;
            if (next2 && next2.hasAttribute('data-else')) next2.remove();
            }
        });

        // data-for
        var forEls = Array.from(el.querySelectorAll('[data-for]'));
        forEls.forEach(function(node) {
            if (!node.parentNode) return;
            var rawList = node.getAttribute('data-for') || '';
            var listExpr = rawList.replace(/^\s*\{\{\s*/, '').replace(/\s*\}\}\s*$/, '').trim();
            var list = _evaluate(listExpr, data);
            if (!Array.isArray(list)) return;
            var itemName = node.getAttribute('data-for-item') || 'item';
            var indexName = node.getAttribute('data-for-index') || 'index';
            var template = node.outerHTML;
            var result = '';
            list.forEach(function(item, idx) {
            var itemData = Object.assign({}, data);
            itemData[itemName] = item;
            itemData[indexName] = idx;
            var itemHtml = template.replace(/\{\{([^}]+)\}\}/g, function(m, expr) {
                try { return _evaluate(expr.trim(), itemData) || ''; }
                catch(e) { return ''; }
            });
            result += itemHtml;
            });
            if (node.parentNode) node.outerHTML = result;
        });
    }

  global.SuperAppRuntime = Runtime;

})(window);