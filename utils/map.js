const api = require('./api')

function getLocation() {
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success(res) {
        resolve({
          lat: res.latitude,
          lng: res.longitude,
          accuracy: res.accuracy
        })
      },
      fail() {
        resolve(null)
      }
    })
  })
}

function ensureLocationAuth() {
  return new Promise((resolve) => {
    wx.getSetting({
      success(setting) {
        if (setting.authSetting['scope.userLocation']) {
          resolve(true)
          return
        }
        wx.authorize({
          scope: 'scope.userLocation',
          success() { resolve(true) },
          fail() { resolve(false) }
        })
      },
      fail() { resolve(false) }
    })
  })
}

async function locate() {
  const ok = await ensureLocationAuth()
  if (!ok) return { ok: false, needSetting: true, error: '需要开启定位权限' }
  const loc = await getLocation()
  if (!loc) return { ok: false, needSetting: true, error: '定位失败，请检查系统定位开关' }
  return { ok: true, lat: loc.lat, lng: loc.lng }
}

async function searchNearby(lat, lng, type) {
  const path = '/api/map/nearby?lat=' + encodeURIComponent(lat) +
    '&lng=' + encodeURIComponent(lng) +
    '&type=' + encodeURIComponent(type || 'hospital')
  return api.request(path, 'GET')
}

function normalizeCity(value) {
  let city = value
  if (Array.isArray(city)) city = city[0] || ''
  city = String(city || '').trim()
  if (!city || city === '[]') return ''
  return city.replace(/市$/, '')
}

/** 定位并逆地理得到城市名；失败返回空字符串 */
async function detectCity() {
  const loc = await locate()
  if (!loc.ok) return ''
  const res = await searchNearby(loc.lat, loc.lng, 'hospital')
  if (!res.ok) return ''
  return normalizeCity(res.data && res.data.city)
}

function openPlace(place) {
  if (!place || place.lat == null || place.lng == null) {
    wx.showToast({ title: '没有坐标', icon: 'none' })
    return
  }
  wx.openLocation({
    latitude: Number(place.lat),
    longitude: Number(place.lng),
    name: place.name || '',
    address: place.address || '',
    scale: 16
  })
}

function callPlace(place) {
  const tel = place && place.tel
  if (!tel) {
    wx.showToast({ title: '暂无电话', icon: 'none' })
    return
  }
  wx.makePhoneCall({ phoneNumber: String(tel).replace(/-/g, '') })
}

module.exports = {
  locate,
  searchNearby,
  detectCity,
  normalizeCity,
  openPlace,
  callPlace
}
