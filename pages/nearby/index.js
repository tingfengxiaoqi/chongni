const store = require('../../utils/store')
const mapUtil = require('../../utils/map')

Page({
  data: {
    city: '定位中…',
    address: '',
    tab: 'hospital',
    places: [],
    lat: 31.2304,
    lng: 121.4737,
    scale: 14,
    markers: [],
    locating: false,
    searching: false,
    locReady: false,
    locError: '',
    mapHint: ''
  },

  async onShow() {
    const state = store.load()
    if (!state.authed && !state.guest) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    if (!this.data.locReady) await this.refreshNearby(true)
    else await this.searchCurrentTab()
  },

  buildMarkers(places, lat, lng) {
    const markers = [{
      id: 0,
      latitude: lat,
      longitude: lng,
      width: 28,
      height: 28,
      callout: { content: '我', display: 'ALWAYS', padding: 6, borderRadius: 8, fontSize: 12 }
    }]
    ;(places || []).slice(0, 12).forEach((p, i) => {
      if (p.lat == null || p.lng == null) return
      markers.push({
        id: i + 1,
        latitude: Number(p.lat),
        longitude: Number(p.lng),
        width: 24,
        height: 24,
        title: p.name
      })
    })
    return markers
  },

  async refreshNearby(forceLocate) {
    if (this.data.locating || this.data.searching) return
    this.setData({ locating: true, locError: '', mapHint: '' })
    let lat = this.data.lat
    let lng = this.data.lng
    if (forceLocate || !this.data.locReady) {
      const loc = await mapUtil.locate()
      if (!loc.ok) {
        this.setData({
          locating: false,
          locReady: false,
          locError: loc.error || '定位失败',
          city: '未定位',
          places: [],
          markers: []
        })
        return
      }
      lat = loc.lat
      lng = loc.lng
      this.setData({ lat, lng, locReady: true })
    }
    this.setData({ locating: false })
    await this.searchCurrentTab()
  },

  async searchCurrentTab() {
    if (!this.data.locReady) {
      await this.refreshNearby(true)
      return
    }
    this.setData({ searching: true, mapHint: '' })
    const type = this.data.tab === 'shop' ? 'shop' : 'hospital'
    const res = await mapUtil.searchNearby(this.data.lat, this.data.lng, type)
    this.setData({ searching: false })
    if (!res.ok) {
      this.setData({
        places: [],
        markers: this.buildMarkers([], this.data.lat, this.data.lng),
        mapHint: res.error || '附近检索失败',
        city: this.data.city === '定位中…' ? '当前位置' : this.data.city
      })
      return
    }
    const places = res.data.places || []
    const city = res.data.city || this.data.city
    const address = res.data.address || ''
    store.update((d) => {
      if (city) d.city = city.replace(/市$/, '') || d.city
    })
    this.setData({
      places,
      city: city || '当前位置',
      address,
      mapHint: places.length ? '' : '附近暂无结果，可扩大范围或换个位置',
      markers: this.buildMarkers(places, this.data.lat, this.data.lng)
    })
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
    this.searchCurrentTab()
  },

  onRelocate() {
    this.refreshNearby(true)
  },

  onOpenSetting() {
    wx.openSetting({})
  },

  onPlaceTap(e) {
    const id = e.currentTarget.dataset.id
    const place = (this.data.places || []).find((p) => p.id === id)
    if (!place) return
    mapUtil.openPlace(place)
  },

  onCall(e) {
    const id = e.currentTarget.dataset.id
    const place = (this.data.places || []).find((p) => p.id === id)
    mapUtil.callPlace(place)
  },

  onMarkerTap(e) {
    const markerId = e.detail && e.detail.markerId
    if (!markerId) return
    const place = this.data.places[markerId - 1]
    if (place) mapUtil.openPlace(place)
  }
})
