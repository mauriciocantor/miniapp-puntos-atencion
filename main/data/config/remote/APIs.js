module.exports = class APIs {
  static get URL_BASE () {
    return URL_BASE
  }

  static get HEADERS () {
    return HEADERS
  }
}

const URL_BASE = {
  SELF_SERVICE_V1: 'https://apiselfservice.co/api/index.php/v1/soap'
}

const HEADERS = {
  X_SESSION_ID: '',
  X_MC_DEVICE_ID: '',
  X_MC_LINE: 0,
  X_MC_LOB: 0,
  X_MC_SO: 'Android',
  CACHE_CONTROL: 'no-cache',
  CONTENT_TYPE: 'application/json; charset=UTF-8'
}
