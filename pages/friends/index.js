const store = require('../../utils/store')
const chat = require('../../utils/chat')
const api = require('../../utils/api')

Page({
  data: {
    friends: [],
    showAdd: false,
    addPhone: ''
  },

  async onShow() {
    const state = store.load()
    if (!state.authed || !api.getToken()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.redirectTo({ url: '/pages/login/index' }), 400)
      return
    }
    await this.refresh()
  },

  async refresh() {
    const friends = await chat.refreshFriends()
    this.setData({ friends })
  },

  onChat(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/chat/index?id=' + id })
  },

  openAdd() {
    this.setData({ showAdd: true, addPhone: '' })
  },
  closeAdd() { this.setData({ showAdd: false }) },
  noop() {},
  onAddPhone(e) { this.setData({ addPhone: e.detail.value }) },

  async saveAdd() {
    const phone = (this.data.addPhone || '').trim()
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '填写对方手机号', icon: 'none' })
      return
    }
    const friends = await chat.addFriendByPhone(phone)
    if (!friends) return
    this.setData({ showAdd: false, friends })
    wx.showToast({ title: '已添加好友', icon: 'none' })
  }
})
