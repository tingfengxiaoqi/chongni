const store = require('../../utils/store')
const catalog = require('../../data/catalog')
const api = require('../../utils/api')
const media = require('../../utils/media')

function normalizeGoods(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name || '',
    sold: raw.sold != null ? raw.sold : '0',
    price: Number(raw.price) || 0,
    cat: raw.cat || '其他',
    icon: raw.icon || '🛒',
    stock: raw.stock != null ? Number(raw.stock) : 99,
    desc: raw.desc || '',
    intro: raw.intro || '',
    thumb: raw.thumb || '',
    images: Array.isArray(raw.images) ? raw.images : []
  }
}

Page({
  data: {
    id: '',
    goods: null,
    banners: [],
    detailImgs: [],
    cartCount: 0,
    loading: true
  },

  onLoad(query) {
    this.setData({ id: query.id || '' })
  },

  onShow() {
    const state = store.load()
    this.setData({
      cartCount: (state.cart || []).reduce((s, i) => s + i.count, 0)
    })
    if (this.data.id) this.load()
  },

  applyGoods(raw) {
    const goods = normalizeGoods(raw)
    if (!goods) {
      this.setData({ goods: null, banners: [], detailImgs: [] })
      return
    }
    const banners = []
    if (goods.thumb) banners.push(media.resolveUrl(goods.thumb))
    ;(goods.images || []).forEach((u) => {
      const url = media.resolveUrl(u)
      if (url && banners.indexOf(url) < 0) banners.push(url)
    })
    const detailImgs = (goods.images || []).map(media.resolveUrl).filter(Boolean)
    wx.setNavigationBarTitle({ title: goods.name || '商品详情' })
    this.setData({ goods, banners, detailImgs })
  },

  async load() {
    this.setData({ loading: true })
    const res = await api.request('/api/goods/' + encodeURIComponent(this.data.id), 'GET')
    if (res.ok && res.data.goods) {
      this.setData({ loading: false })
      this.applyGoods(res.data.goods)
      return
    }
    const local = (catalog.goods || []).find((g) => g.id === this.data.id)
    this.setData({ loading: false })
    this.applyGoods(local || null)
  },

  onPreview(e) {
    const src = e.currentTarget.dataset.src
    const urls = this.data.banners.length ? this.data.banners : this.data.detailImgs
    if (!src) return
    wx.previewImage({ current: src, urls: urls.length ? urls : [src] })
  },

  addToCart(count) {
    const state = store.load()
    if (!state.authed) {
      wx.showToast({ title: '登录后才能加购', icon: 'none' })
      return false
    }
    const goods = this.data.goods
    if (!goods) return false
    if (Number(goods.stock) <= 0) {
      wx.showToast({ title: '暂时缺货', icon: 'none' })
      return false
    }
    const next = store.update((d) => {
      const hit = (d.cart || []).find((c) => c.id === goods.id)
      if (hit) hit.count = Math.min(99, hit.count + count)
      else d.cart.push({
        id: goods.id,
        name: goods.name,
        price: goods.price,
        icon: goods.icon || '🛒',
        thumb: goods.thumb || '',
        count
      })
    })
    this.setData({ cartCount: (next.cart || []).reduce((s, i) => s + i.count, 0) })
    return true
  },

  onAdd() {
    if (!this.addToCart(1)) return
    wx.showToast({ title: '已加入购物车', icon: 'none' })
  },

  onBuy() {
    if (!this.addToCart(1)) return
    wx.navigateTo({ url: '/pages/checkout/index' })
  },

  goCart() {
    wx.navigateTo({ url: '/pages/cart/index' })
  },

  onShareAppMessage() {
    const g = this.data.goods
    return {
      title: g ? (g.name + ' · 宠溺商城') : '宠溺商城',
      path: '/pages/goods/index?id=' + encodeURIComponent(this.data.id || '')
    }
  }
})
