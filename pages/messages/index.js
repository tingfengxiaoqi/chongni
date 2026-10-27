const chat = require('../../utils/chat')
const api = require('../../utils/api')

Page({
  data: { messages: [] },

  async onShow() {
    if (!api.getToken()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.redirectTo({ url: '/pages/login/index' }), 400)
      return
    }
    const messages = await chat.refreshInbox()
    this.setData({ messages })
  },

  onOpen(e) {
    const friendId = e.currentTarget.dataset.friend
    const system = e.currentTarget.dataset.system
    if (system || !friendId) {
      wx.showToast({ title: '这是系统通知', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/chat/index?id=' + friendId })
  }
})
