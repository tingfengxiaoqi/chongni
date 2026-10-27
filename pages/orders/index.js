const store = require('../../utils/store')
const api = require('../../utils/api')

Page({
  data: {
    tab: 'all',
    list: [],
    all: []
  },

  async onShow() {
    const state = store.load()
    if (!state.authed || !api.getToken()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    await this.pull()
  },

  async pull() {
    const res = await api.request('/api/orders/mine', 'GET')
    const all = res.ok ? (res.data.orders || []) : (store.load().orders || [])
    store.update((d) => { d.orders = all })
    this.setData({ all })
    this.applyFilter()
  },

  applyFilter() {
    const tab = this.data.tab
    let list = this.data.all || []
    if (tab === 'unpaid') list = list.filter((o) => o.payStatus === 'unpaid')
    else if (tab === 'pending') list = list.filter((o) => o.payStatus === 'paid' && o.status === 'pending')
    else if (tab === 'shipping') list = list.filter((o) => o.status === 'shipping')
    this.setData({ list })
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
    this.applyFilter()
  },

  goMall() {
    wx.navigateTo({ url: '/pages/mall/index' })
  },

  onPay(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认支付',
      content: '将通过服务端完成支付（当前为 sandbox 沙箱模式；配置微信支付商户后可走真实收银台）。',
      confirmColor: '#FF6A2A',
      success: async (res) => {
        if (!res.confirm) return
        const pay = await api.request('/api/orders/' + encodeURIComponent(id) + '/pay', 'POST', {})
        if (!pay.ok) {
          wx.showToast({ title: pay.error || '支付失败', icon: 'none' })
          return
        }
        wx.showToast({ title: '支付成功', icon: 'none' })
        this.pull()
      }
    })
  }
})
