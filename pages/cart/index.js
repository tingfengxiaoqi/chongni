const store = require('../../utils/store')
const media = require('../../utils/media')

Page({
  data: {
    items: [],
    total: '0.00'
  },

  onShow() {
    const state = store.load()
    if (!state.authed && !state.guest) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    this.refresh()
  },

  refresh() {
    const items = (store.load().cart || []).map((i) => Object.assign({}, i, {
      thumb: media.resolveUrl(i.thumb || '')
    }))
    const total = items.reduce((s, i) => s + Number(i.price) * Number(i.count), 0)
    this.setData({
      items,
      total: total.toFixed(2)
    })
  },

  onQty(e) {
    const id = e.currentTarget.dataset.id
    const delta = Number(e.currentTarget.dataset.delta)
    store.update((d) => {
      const hit = (d.cart || []).find((c) => c.id === id)
      if (!hit) return
      hit.count += delta
      if (hit.count <= 0) d.cart = d.cart.filter((c) => c.id !== id)
      if (hit.count > 99) hit.count = 99
    })
    this.refresh()
  },

  onRemove(e) {
    const id = e.currentTarget.dataset.id
    store.update((d) => {
      d.cart = (d.cart || []).filter((c) => c.id !== id)
    })
    this.refresh()
  },

  goMall() {
    wx.navigateTo({ url: '/pages/mall/index' })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/goods/index?id=' + encodeURIComponent(id) })
  },


  goCheckout() {
    if (!this.data.items.length) return
    wx.navigateTo({ url: '/pages/checkout/index' })
  }
})
