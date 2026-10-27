const store = require('../../utils/store')
const api = require('../../utils/api')

Page({
  data: {
    items: [],
    total: '0.00',
    name: '',
    phone: '',
    address: '',
    remark: '',
    submitting: false
  },

  onShow() {
    const state = store.load()
    if (!state.authed || !api.getToken()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const cart = state.cart || []
    if (!cart.length) {
      wx.showToast({ title: '购物车为空', icon: 'none' })
      setTimeout(() => wx.navigateBack({ fail: () => wx.navigateTo({ url: '/pages/mall/index' }) }), 500)
      return
    }
    const items = cart.map((item) => Object.assign({}, item, {
      lineTotal: (Number(item.price) * Number(item.count)).toFixed(2)
    }))
    const total = cart.reduce((s, i) => s + Number(i.price) * Number(i.count), 0)
    this.setData({
      items,
      total: total.toFixed(2),
      name: this.data.name || state.nickname || '',
      phone: this.data.phone || state.phone || ''
    })
  },

  onName(e) { this.setData({ name: e.detail.value }) },
  onPhone(e) { this.setData({ phone: e.detail.value }) },
  onAddress(e) { this.setData({ address: e.detail.value }) },
  onRemark(e) { this.setData({ remark: e.detail.value }) },

  async onSubmit() {
    if (this.data.submitting) return
    const name = (this.data.name || '').trim()
    const phone = (this.data.phone || '').trim()
    const address = (this.data.address || '').trim()
    if (!name) return wx.showToast({ title: '请填写收货人', icon: 'none' })
    if (!/^1\d{10}$/.test(phone)) return wx.showToast({ title: '手机号不对', icon: 'none' })
    if (address.length < 6) return wx.showToast({ title: '请填写详细地址', icon: 'none' })

    this.setData({ submitting: true })
    const res = await api.request('/api/orders', 'POST', {
      name,
      phone,
      address,
      remark: (this.data.remark || '').trim(),
      items: this.data.items.map((item) => ({
        id: item.id,
        count: Number(item.count)
      }))
    })
    this.setData({ submitting: false })
    if (!res.ok) {
      wx.showToast({ title: res.error || '下单失败', icon: 'none' })
      return
    }
    const order = res.data.order
    store.update((d) => {
      d.cart = []
      d.orders = [order].concat(d.orders || []).slice(0, 50)
    })
    wx.showToast({ title: '下单成功', icon: 'none' })
    setTimeout(() => wx.redirectTo({ url: '/pages/orders/index' }), 400)
  }
})
