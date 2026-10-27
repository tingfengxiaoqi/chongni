const store = require('../../utils/store')
const catalog = require('../../data/catalog')
const api = require('../../utils/api')
const media = require('../../utils/media')

Page({
  data: {
    city: '上海',
    cats: ['全部', '主粮', '零食', '用品', '玩具', '健康', '清洁'],
    mallCat: '全部',
    goods: [],
    allGoods: [],
    cartCount: 0,
    fromServer: false
  },

  async onShow() {
    const state = store.load()
    if (!state.authed && !state.guest) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    this.setData({
      city: state.city || '上海',
      cartCount: (state.cart || []).reduce((s, i) => s + i.count, 0)
    })
    await this.loadGoods()
    this.refreshList()
  },

  mapGoods(list) {
    return (list || []).map((g) => ({
      id: g.id,
      name: g.name,
      sold: g.sold,
      price: g.price,
      cat: g.cat,
      icon: g.icon || '🛒',
      stock: g.stock,
      desc: g.desc || '',
      thumb: media.resolveUrl(g.thumb || (g.images && g.images[0]) || ''),
      intro: g.intro || ''
    }))
  },

  async loadGoods() {
    const res = await api.request('/api/goods', 'GET')
    if (res.ok && Array.isArray(res.data.goods) && res.data.goods.length) {
      this.setData({ allGoods: this.mapGoods(res.data.goods), fromServer: true })
      return
    }
    this.setData({ allGoods: this.mapGoods(catalog.goods), fromServer: false })
  },

  refreshList() {
    const goods = (this.data.allGoods || []).filter((g) => this.data.mallCat === '全部' || g.cat === this.data.mallCat)
    this.setData({ goods })
  },

  onCat(e) {
    this.setData({ mallCat: e.currentTarget.dataset.cat })
    this.refreshList()
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/goods/index?id=' + encodeURIComponent(id) })
  },

  onCart(e) {
    const state = store.load()
    if (!state.authed) {
      wx.showToast({ title: '登录后才能加购', icon: 'none' })
      return
    }
    const id = e.currentTarget.dataset.id
    const good = (this.data.allGoods || []).find((g) => g.id === id)
    if (!good) return
    if (good.stock !== undefined && Number(good.stock) <= 0) {
      wx.showToast({ title: '暂时缺货', icon: 'none' })
      return
    }
    const next = store.update((d) => {
      const hit = (d.cart || []).find((c) => c.id === good.id)
      if (hit) hit.count += 1
      else d.cart.push({
        id: good.id,
        name: good.name,
        price: good.price,
        icon: good.icon || '🛒',
        thumb: good.thumb || '',
        count: 1
      })
    })
    this.setData({ cartCount: (next.cart || []).reduce((s, i) => s + i.count, 0) })
    wx.showToast({ title: '已加入购物车', icon: 'none' })
  },

  goCart() {
    if (!store.load().authed) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/cart/index' })
  }
})
