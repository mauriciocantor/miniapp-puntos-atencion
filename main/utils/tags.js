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
