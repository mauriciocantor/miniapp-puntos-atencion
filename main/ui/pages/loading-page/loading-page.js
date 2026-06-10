const {
  callFirebase,
  callAppsFlyer,
  getIsUserInGuestMode
} = require('/main/utils/tags')

Page({
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
	async validatePermissionMP() {
		// Verificar si ya aceptó antes usando storage persistente
		my.getStorage({
			key: 'location_accepted',
			success: (res) => {
			if (res.data === 'true') {
				this.resetPopup()
				my.getLocation({
				timeout: 15,
				success: (res) => {
					const { latitude, longitude } = res
					this.setData({ latitude, longitude, render: true })
				},
				fail: () => this.errorPopup(),
				})
				return  // salir sin mostrar el modal
			}
			// No ha aceptado antes — continuar con el flujo normal
			this._showPermissionFlow()
			},
			fail: () => {
			// Key no existe — continuar con el flujo normal
			this._showPermissionFlow()
			},
		})
	},
	_showPermissionFlow() {
		my.getSetting({
			success: (res) => {
				const { platform } = this.data
				if (platform === "android") {
					const auth = res.authSetting["scope.location"]
					if (auth) {
						this.androidGetLocation()
					} else {
						this.alertPopup()
					}
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
		my.setStorage({
			key: 'location_accepted',
			data: 'true',
		})
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
		my.setStorage({
			key: 'location_accepted',
			data: 'true',
		})
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
})
