// SuperApp Mini-App Bundle

// Generado automáticamente — no editar

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
      // Iniciar la primera página registrada
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
      console.log('[Runtime] _renderPage - data:', JSON.stringify(page.data));
        var template = document.getElementById('__page_template__');
        if (!template) {
            console.error('[Runtime] No se encontró __page_template__');
            return;
        }
        console.log('[Runtime] template found, length:', template.innerHTML.length);
        var html = this._resolveTemplate(template.innerHTML, page.data);
        console.log('[Runtime] html resuelto, length:', html.length);
        rootEl.innerHTML = html;
        this._bindEvents(rootEl, page);
        this._resolveWebViews(rootEl, page.data);
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
    var ifEls = el.querySelectorAll('[data-if]');
    ifEls.forEach(function(node) {
        // Limpiar las llaves {{ }} del atributo
        var rawExpr = node.getAttribute('data-if');
        var expr = rawExpr.replace(/^\s*\{\{\s*/, '').replace(/\s*\}\}\s*$/, '').trim();
        
        var show = _evaluate(expr, data);
        if (!show) {
        var next = node.nextElementSibling;
        if (next && next.hasAttribute('data-else')) {
            next.style.display = '';
        }
        node.remove();
        } else {
        var next2 = node.nextElementSibling;
        if (next2 && next2.hasAttribute('data-else')) {
            next2.remove();
        }
        }
    });

    var expr = rawExpr.replace(/^\s*\{\{\s*/, '').replace(/\s*\}\}\s*$/, '').trim();

    // Saltar si la expresión queda vacía
    if (!expr) {
    node.removeAttribute('data-if');
    return;
    }

    // data-for
    var forEls = el.querySelectorAll('[data-for]');
    forEls.forEach(function(node) {
        var rawList = node.getAttribute('data-for');
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

        node.outerHTML = result;
    });
    }

  global.SuperAppRuntime = Runtime;

})(window);


// Polyfills para APIs de Alipay no disponibles en SuperApp
if (typeof my !== 'undefined') {
  if (!my.hideBackHome) my.hideBackHome = function() {};
  if (!my.setCanPullDown) my.setCanPullDown = function() {};
  if (!my.exitMiniProgram) my.exitMiniProgram = function() {
    window.SuperApp && window.SuperApp.navigateBack({});
  };
  if (!my.openSetting) my.openSetting = function() {};
  if (!my.env) my.env = { platform: /android/i.test(navigator.userAgent) ? 'Android' : 'iOS' };
  if (!my.call) my.call = function(name, params) {
    console.warn('[SuperApp] my.call not implemented:', name, params);
    return Promise.resolve({});
  };
}
SuperAppRuntime.initApp({
  onLaunch () { my.setCanPullDown({ canPullDown: false }) }
});


// === Página: main/ui/pages/loading-page/loading-page ===

// Polyfills para APIs de Alipay no disponibles en SuperApp
if (typeof my !== 'undefined') {
  if (!my.hideBackHome) my.hideBackHome = function() {};
  if (!my.setCanPullDown) my.setCanPullDown = function() {};
  if (!my.exitMiniProgram) my.exitMiniProgram = function() {
    window.SuperApp && window.SuperApp.navigateBack({});
  };
  if (!my.openSetting) my.openSetting = function() {};
  if (!my.env) my.env = { platform: /android/i.test(navigator.userAgent) ? 'Android' : 'iOS' };
  if (!my.call) my.call = function(name, params) {
    console.warn('[SuperApp] my.call not implemented:', name, params);
    return Promise.resolve({});
  };
}

var __module_bWFpbi91 = (function() {
  var module = { exports: {} };
  var exports = module.exports;
  /* eslint-env node */
/* global my */

function callAppsFlyer(name) {
	/* eslint-disable no-undef */
	const flujo_puntosatencion_sa = {
		AccountId: "",
		Email: ""
	}

	/* istanbul ignore next */
	my.call("AFLogEvent", {
		name,
		parameters: flujo_puntosatencion_sa
	})
	/* eslint-enable no-undef */
}

function callFirebase(flow, name) {
	/* eslint-disable no-undef */
	const flujo_puntosatencion_sa = {
		Event: name,
		AccountId: "",
		LineOfBusiness: "",
		Email: ""
	}

	/* istanbul ignore next */
	my.call("FIRLogEvent", {
		name: flow || "flujo_puntosatencion_sa",
		parameters: flujo_puntosatencion_sa
	})
	/* eslint-enable no-undef */
}

function getIsUserInGuestMode() {
	return new Promise((resolve, reject) => {
		my.call("MQGetIsUserInGuestMode")
			.then((values) => {
				resolve(values.result)
			})
			.catch((error) => {
				reject(error)
			})
	})
}

module.exports = {
	callAppsFlyer,
	callFirebase,
	getIsUserInGuestMode
}

  return module.exports;
})();
const {
  callFirebase,
  callAppsFlyer,
  getIsUserInGuestMode
} = __module_bWFpbi91



// Compilado por SuperApp Compiler
// Página: loading-page

class LoadingPagePage extends SuperAppRuntime.Page {
  constructor() {
    super();
    Object.assign(this, {
	data: {
		latitude: 0,
		longitude: 0,
		render: false,
		errorCounter: 0,
		authCounter: 0,
		isShown: true,
		loader: true,
		httpError: false,
		modalButtonSlot: false,
		modalTextSlot: false,
		modal: {
			show: false,
			icon: 'success',
			title: '',
			text: '',
			textButton: 'Aceptar'
		},
		onCloseModal: 'exitMiniprogram',
		isFirstTime: false,
		isFirstTimeOnShow: true,
		rememberChoiceError: false,
		firstTimeFirebase: true,
		isGuestModeUser: false
	},
	async onLoad () {
		const { isGuestMode } = await getIsUserInGuestMode()
		if (isGuestMode) {
			callFirebase("flujo_home_sa_zi", "sa_zi_bt_home_Puntosdeatencion")
		}

		this.setData({
			platform: my.env.platform.toLowerCase(),
			isGuestModeUser: isGuestMode
		})
	},
	onReady () {
		// validate permission
		this.validatePermissionMP()
	},
	async onShow () {
		my.hideBackHome()
		// event to execute when we get out to turn on permission and back again to miniprogram
		const { isFirstTimeOnShow, rememberChoiceError } = this.data

		// validate if error was 2002 or 2003 and execute then validations after turn on permission
		if (rememberChoiceError) {
			this.validatePermissionMP()
			this.setData({
				rememberChoiceError: false
			})
		}

		// this only execute when we get out and come back to the miniprogram
		// we try to handle execute this when start miniprogram
		if (isFirstTimeOnShow) {
			this.setData({
				isFirstTimeOnShow: false
			})
		} else {
			if (await this.isLocationEnabled()) {
				setTimeout(() => {
					my.getLocation({
						timeout: 15,
						success: (res) => {
							const { latitude, longitude } = res
							if (latitude && longitude) {
								my.setStorageSync({
									key: "coord",
									data: {
										latitude,
										longitude
									}
								})

								this.setData({
									latitude,
									longitude,
									render: true
								})

								//  this.redirectToMap();
							}
						}
					})
				}, 3500)
			}
		}
	},
	validatePermissionMP() {
		// get if miniprogram permission were turned on
		my.getSetting({
			success: (res) => {
				const { platform } = this.data
				// android validations
				if (platform === "android") {
					const auth = res.authSetting["scope.location"]
					if (auth) {
						this.androidGetLocation()
					} else {
						this.alertPopup()
					}
					// ios validations
				} else {
					const { location } = res.authSetting

					if (location) {
						this.iosGetLocation()
					} else {
						this.alertPopup()
					}
				}
			},
			fail: (res) => {
				this.errorPopup()
				return res
			}
		})
	},
	// validation to get in first instance permissions, we handle here auth and exceptions
	androidGetLocation() {
		if (!this.data.isShown) return
		this.validateFirebase()
		this.resetPopup()
		my.getLocation({
			timeout: 15,
			success: (res) => {
				const { latitude, longitude } = res
				if (latitude && longitude) {
					my.setStorageSync({
						key: "coord",
						data: {
							latitude,
							longitude
						}
					})
					// if set coords we go to map page
					this.setData({
						latitude,
						longitude,
						render: true
					})
				}
			},
			fail: (err) => {
				const { error } = err
				const { errorCounter, isFirstTime, authCounter } = this.data
				if (error === 11) {
					// validate first time and then start counter
					if (!isFirstTime) {
						my.showAuthGuide({
							authType: "LBS",
							success: ({ shown }) => {
								if (!shown) {
									my.showAuthGuide({
										authType: "LBSSERVICE",
										success: ({ shown }) => {
											if (!shown) {
												this.setData({
													isShown: false
												})
												this.errorPopup()
											}
										}
									})
								}
							}
						})
						this.setData({
							isFirstTime: true
						})
					}
					// validate if this actions is repeated 5 times to restart the counter to show my.showAuthGuide
					if (authCounter === 4) {
						this.setData({
							authCounter: 0
						})
						my.showAuthGuide({
							authType: "LBS",
							success: ({ shown }) => {
								if (!shown) {
									my.showAuthGuide({
										authType: "LBSSERVICE",
										success: ({ shown }) => {
											if (!shown) {
												this.setData({
													isShown: false
												})
												this.errorPopup()
											}
										}
									})
								}
							}
						})
						setTimeout(() => {
							this.androidGetLocation()
						}, 4000)
						return
					}
					// update the counter
					this.setData({
						authCounter: authCounter + 1
					})
					// validate again
					setTimeout(() => {
						this.androidGetLocation()
					}, 4000)
					return
				}

				// most common error and we validate 7 times (14 seg) to show error popup
				if (error >= 12 && error <= 14) {
					if (errorCounter === 7) {
						this.errorPopup()
						return
					}
					this.setData({
						errorCounter: errorCounter + 1
					})
					// validate after 2 segs
					setTimeout(() => {
						this.androidGetLocation()
					}, 2000)
					return
				}

				// error 18 is unknown error and need to show error and 2001 error when user not accept miniprogram permission
				if (error === 2001 || error === 18) {
					this.errorPopup()
					return
				}

				// error when user click remember my choice and decline miniprogram permission
				if (error === 2002 || error === 2003) {
					this.setData({
						rememberChoiceError: true
					})
					this.openSetting()
					return
				}
				// if is an unknown error show error popup
				this.errorPopup()
			}
		})
	},
	iosGetLocation() {
		if (!this.data.isShown) return
		this.validateFirebase()
		this.resetPopup()
		my.getLocation({
			timeout: 15,
			success: (res) => {
				const { latitude, longitude } = res
				if (latitude && longitude) {
					my.setStorageSync({
						key: "coord",
						data: {
							latitude,
							longitude
						}
					})

					this.setData({
						latitude,
						longitude,
						render: true
					})
				}
			},
			fail: (err) => {
				const { error } = err
				const { errorCounter, isFirstTime, authCounter } = this.data
				if (error === 11) {
					if (!isFirstTime) {
						my.showAuthGuide({
							authType: "LBS",
							success: ({ shown }) => {
								if (!shown) {
									my.showAuthGuide({
										authType: "LBSSERVICE",
										success: ({ shown }) => {
											if (!shown) {
												this.setData({
													isShown: false
												})
												this.errorPopup()
											}
										}
									})
								}
							}
						})
						this.setData({
							isFirstTime: true
						})
					}
					if (authCounter === 4) {
						this.setData({
							authCounter: 0
						})
						my.showAuthGuide({
							authType: "LBS",
							success: ({ shown }) => {
								if (!shown) {
									my.showAuthGuide({
										authType: "LBSSERVICE",
										success: ({ shown }) => {
											if (!shown) {
												this.setData({
													isShown: false
												})
												this.errorPopup()
											}
										}
									})
								}
							}
						})
						setTimeout(() => {
							this.iosGetLocation()
						}, 4000)
						return
					}
					this.setData({
						authCounter: authCounter + 1
					})
					setTimeout(() => {
						this.iosGetLocation()
					}, 4000)
					return
				}

				if (error >= 12 && error <= 14) {
					if (errorCounter === 7) {
						this.errorPopup()
						return
					}
					this.setData({
						errorCounter: errorCounter + 1
					})

					setTimeout(() => {
						this.iosGetLocation()
					}, 2000)
					return
				}

				if (error === 2001 || error === 18) {
					this.errorPopup()
					return
				}

				// ios flow is not showing error 2002 or 2003 when user click remember my choice
				if (error === 2002 || error === 2003) {
					this.setData({
						rememberChoiceError: true
					})
					this.openSetting()
					return
				}
				this.errorPopup()
			}
		})
	},
	async validateFirebase() {
		if (this.data.firstTimeFirebase) {
			let confirmTag = "sa_bt_pa_au_sipermitir"
			let tagflujo = "flujo_puntosatencion_sa"

			if (this.data.isGuestModeUser) {
				confirmTag = "sa_zi_bt_pa_au_sipermitir"
				tagflujo = "flujo_home_sa_zi"
			}
			callAppsFlyer(confirmTag)
			callFirebase(tagflujo, confirmTag)
			this.setData({
				firstTimeFirebase: false
			})
		}
	},
	// validate if location is enabled
	async isLocationEnabled() {
		const systemInfo = await my.getSystemInfo()
		return !!(systemInfo.locationEnabled && systemInfo.locationAuthorized)
	},
	// exit to miniprogram
	exitMiniprogram() {
		my.exitMiniProgram()
	},
	// error popup configs
	errorPopup() {
		this.setData({
			loader: false,
			httpError: true,
			modalTextSlot: true,
			modalButtonSlot: false,
			modal: {
				show: true,
				icon: "error",
				title: "Inténtalo más tarde",
				text: "Algo salió mal al procesar tu solicitud",
				textButton: "Aceptar"
			},
			onCloseModal: "exitMiniprogram"
		})
	},
	// alert popup configs
	alertPopup() {
		const { platform } = this.data
		this.setData({
			loader: false,
			httpError: false,
			modalTextSlot: false,
			modalButtonSlot: true,
			modal: {
				show: true,
				icon: "info",
				title: "",
				text: "Queremos conocer tu ubicación\n para mejorar tu experiencia",
				textButton: "Sí, permitir"
			},
			onCloseModal: platform === "android" ? "androidGetLocation" : "iosGetLocation"
		})
	},
	// reset popup configs
	resetPopup() {
		this.setData({
			httpError: false,
			modalButtonSlot: false,
			modalTextSlot: false,
			loader: true,
			modal: {
				...this.data.modal,
				show: false
			},
			onCloseModal: ""
		})
	},
	// open settings when already user decline miniprogram permission
	openSetting() {
		this.setData({
			rememberChoiceError: true
		})
		this.resetPopup()
		my.openSetting()
	}
    });
  }
}

// Registrar la página
SuperAppRuntime.registerPage('loading-page', LoadingPagePage);



// Iniciar la app


document.addEventListener("DOMContentLoaded", function() {

  SuperAppRuntime.render(document.getElementById("app"));

});