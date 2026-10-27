const store = require('../../utils/store')
const chat = require('../../utils/chat')
const api = require('../../utils/api')

Page({
  data: {
    friendId: '',
    friendName: '',
    friendAvatar: '🐾',
    messages: [],
    draft: '',
    scrollInto: 'bottom'
  },

  async onLoad(query) {
    const friendId = query.id || ''
    if (!api.getToken()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    await chat.refreshFriends()
    const state = store.load()
    const friend = (state.friends || []).find((f) => f.id === friendId)
    if (!friend) {
      wx.showToast({ title: '找不到这位好友', icon: 'none' })
      setTimeout(() => wx.navigateBack({ fail() {} }), 500)
      return
    }
    wx.setNavigationBarTitle({ title: friend.name })
    this.friendId = friendId
    this.setData({
      friendId,
      friendName: friend.name,
      friendAvatar: friend.avatar || '🐾'
    })
    await this.refresh(true)
    this._poll = setInterval(() => {
      if (this.friendId) this.refresh(false)
    }, 3000)
  },

  onShow() {
    if (this.friendId) this.refresh(false)
  },

  onUnload() {
    if (this._poll) clearInterval(this._poll)
  },

  async refresh(mark) {
    if (!this.friendId) return
    if (mark) await chat.markRead(this.friendId)
    const messages = await chat.getThread(this.friendId)
    const last = messages.length ? messages[messages.length - 1] : null
    this.setData({
      messages,
      scrollInto: last ? ('msg-' + last.id) : 'bottom'
    })
  },

  onInput(e) {
    this.setData({ draft: e.detail.value })
  },

  async onSend() {
    const text = (this.data.draft || '').trim()
    if (!text) return
    this.setData({ draft: '' })
    await chat.sendMessage(this.friendId, text)
    await this.refresh(false)
  }
})
