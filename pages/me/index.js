const store = require('../../utils/store')
const chat = require('../../utils/chat')
const api = require('../../utils/api')

Page({
  data: {
    nickname: '铲屎官',
    city: '',
    days: 1,
    friendCount: 0,
    postCount: 0,
    cartCount: 0,
    orderCount: 0,
    unread: 0,
    showSettings: false,
    editNick: '',
    editCity: ''
  },

  async onShow() {
    const state = store.load()
    if (!state.authed && !state.guest) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    if (state.authed && api.getToken()) {
      await store.syncFromServer()
      await chat.refreshInbox()
    }
    const next = store.load()
    const days = Math.max(1, store.daysBetween(next.joinedAt || store.today(), store.today()) + 1)
    this.setData({
      nickname: next.nickname || '铲屎官',
      city: next.city || '未定位',
      days,
      friendCount: (next.friends || []).length,
      postCount: (next.posts || []).filter((p) => p.mine || p.userId === next.userId).length,
      cartCount: (next.cart || []).reduce((s, i) => s + i.count, 0),
      orderCount: (next.orders || []).length,
      unread: chat.unreadCount(next)
    })
  },

  goFriends() {
    wx.navigateTo({ url: '/pages/friends/index' })
  },

  goMessages() {
    wx.navigateTo({ url: '/pages/messages/index' })
  },

  goSquare() {
    wx.switchTab({ url: '/pages/square/index' })
  },

  goMall() {
    wx.navigateTo({ url: '/pages/mall/index' })
  },

  goCart() {
    wx.navigateTo({ url: '/pages/cart/index' })
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/orders/index' })
  },

  openSettings() {
    this.setData({
      showSettings: true,
      editNick: this.data.nickname,
      editCity: this.data.city
    })
  },
  closeSettings() { this.setData({ showSettings: false }) },
  noop() {},
  onNick(e) { this.setData({ editNick: e.detail.value }) },
  onCity(e) { this.setData({ editCity: e.detail.value }) },
  async saveSettings() {
    const nickname = (this.data.editNick || '').trim() || '铲屎官'
    const city = (this.data.editCity || '').trim()
    if (!city) return wx.showToast({ title: '请填写城市', icon: 'none' })
    if (api.getToken()) {
      const res = await api.request('/api/auth/profile', 'PUT', { nickname, city })
      if (!res.ok) {
        wx.showToast({ title: res.error || '保存失败', icon: 'none' })
        return
      }
      store.applySync({ user: res.data.user })
    } else {
      store.update((d) => {
        d.nickname = nickname
        d.city = city
      })
    }
    this.setData({ showSettings: false })
    wx.showToast({ title: '已保存', icon: 'none' })
    this.onShow()
  },
  async onLogout() {
    await api.logout()
    store.update((d) => {
      d.authed = false
      d.guest = false
      d.userId = ''
      d.friends = []
      d.messages = []
      d.orders = []
      d.pets = []
      d.reminders = []
      d.expenses = []
      d.cases = []
    })
    this.setData({ showSettings: false })
    wx.redirectTo({ url: '/pages/login/index' })
  },
  onReset() {
    wx.showModal({
      title: '清除本地缓存',
      content: '会退出登录并清空本机缓存；云端账号数据仍保留。',
      confirmColor: '#FF6A2A',
      success: async (res) => {
        if (!res.confirm) return
        await api.logout()
        store.clear()
        wx.redirectTo({ url: '/pages/login/index' })
      }
    })
  }
})

