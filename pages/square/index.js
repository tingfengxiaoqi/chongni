const store = require('../../utils/store')
const api = require('../../utils/api')

const EMOJI_POOL = ['🐱', '🐶', '🛁', '💤', '🦴', '🌿', '🎾', '🐟', '☀️', '🏠', '✨', '❤️']

Page({
  data: {
    tab: 'recommend',
    posts: [],
    guest: false,
    loading: false,
    cityTip: '',
    showPost: false,
    postText: '',
    postImgs: ['✨', '🐾'],
    postPhoto: '',
    posting: false,
    emojiPool: EMOJI_POOL,
    showComments: false,
    commentPostId: '',
    commentList: [],
    commentDraft: '',
    sharePostId: '',
    shareText: ''
  },

  async onShow() {
    const state = store.load()
    if (!state.authed && !state.guest) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    this.setData({
      guest: !state.authed && !!state.guest,
      cityTip: state.city ? ('当前城市 · ' + state.city) : ''
    })
    if (this.data.tab === 'mine' && this.data.guest) {
      this.setData({ tab: 'recommend' })
    }
    await this.refresh()
  },

  onPullDownRefresh() {
    this.refresh().finally(() => wx.stopPullDownRefresh())
  },

  async refresh() {
    const state = store.load()
    const pet = store.currentPet(state)
    this.setData({ loading: true })
    const query = '?tab=' + encodeURIComponent(this.data.tab) +
      '&city=' + encodeURIComponent(state.city || '') +
      '&breed=' + encodeURIComponent(pet ? pet.breed : '')
    const res = await api.request('/api/posts' + query, 'GET')
    this.setData({ loading: false })
    if (res.ok) {
      this.setData({
        posts: res.data.posts || [],
        cityTip: state.city ? ('当前城市 · ' + state.city) : ''
      })
      return
    }
    wx.showToast({ title: res.error || '加载失败', icon: 'none' })
    this.setData({ posts: [] })
  },

  onTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === 'mine' && this.data.guest) {
      wx.showToast({ title: '登录后查看我的动态', icon: 'none' })
      return
    }
    this.setData({ tab })
    this.refresh()
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' })
  },

  async onLike(e) {
    if (this.data.guest) {
      wx.showToast({ title: '登录后才能点赞', icon: 'none' })
      return
    }
    const id = e.currentTarget.dataset.id
    const res = await api.request('/api/posts/' + encodeURIComponent(id) + '/like', 'POST', {})
    if (!res.ok) {
      wx.showToast({ title: res.error || '操作失败', icon: 'none' })
      return
    }
    const posts = (this.data.posts || []).map((p) => p.id === id ? res.data.post : p)
    this.setData({ posts })
  },

  onSharePost(e) {
    this.setData({
      sharePostId: e.currentTarget.dataset.id || '',
      shareText: e.currentTarget.dataset.text || ''
    })
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] })
    wx.showToast({ title: '点右上角分享给好友', icon: 'none' })
  },

  onShareAppMessage() {
    const id = this.data.sharePostId
    const text = this.data.shareText
    return {
      title: text ? String(text).slice(0, 28) : '宠溺广场 · 看看毛孩子们',
      path: id ? ('/pages/square/index?id=' + id) : '/pages/square/index'
    }
  },

  onPreview(e) {
    const src = e.currentTarget.dataset.src
    if (!src) return
    wx.previewImage({ urls: [src], current: src })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除动态',
      content: '删除后广场上就看不到了',
      confirmColor: '#E24B4B',
      success: async (res) => {
        if (!res.confirm) return
        const del = await api.request('/api/posts/' + encodeURIComponent(id), 'DELETE')
        if (!del.ok) {
          wx.showToast({ title: del.error || '删除失败', icon: 'none' })
          return
        }
        wx.showToast({ title: '已删除', icon: 'none' })
        this.refresh()
      }
    })
  },

  openPost() {
    if (this.data.guest) {
      wx.showToast({ title: '登录后才能发动态', icon: 'none' })
      return
    }
    this.setData({
      showPost: true,
      postText: '',
      postImgs: ['✨', '🐾'],
      postPhoto: '',
      posting: false
    })
  },
  closePost() { this.setData({ showPost: false }) },
  noop() {},
  onPostText(e) { this.setData({ postText: e.detail.value }) },

  onToggleEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    let imgs = (this.data.postImgs || []).slice()
    const idx = imgs.indexOf(emoji)
    if (idx >= 0) imgs.splice(idx, 1)
    else {
      if (imgs.length >= 4) imgs = imgs.slice(1)
      imgs.push(emoji)
    }
    this.setData({ postImgs: imgs })
  },

  onPickPhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (res) => {
        const path = res.tempFilePaths[0]
        const fs = wx.getFileSystemManager()
        fs.readFile({
          filePath: path,
          encoding: 'base64',
          success: (file) => {
            if ((file.data || '').length > 700000) {
              wx.showToast({ title: '照片太大，请换一张', icon: 'none' })
              return
            }
            this.setData({ postPhoto: 'data:image/jpeg;base64,' + file.data })
          }
        })
      }
    })
  },
  onClearPhoto() { this.setData({ postPhoto: '' }) },

  async savePost() {
    if (this.data.posting) return
    const text = (this.data.postText || '').trim()
    if (!text) return wx.showToast({ title: '写点什么吧', icon: 'none' })
    this.setData({ posting: true })
    const res = await api.request('/api/posts', 'POST', {
      text,
      imgs: this.data.postImgs,
      photo: this.data.postPhoto || ''
    })
    this.setData({ posting: false })
    if (!res.ok) return wx.showToast({ title: res.error || '发布失败', icon: 'none' })
    this.setData({ showPost: false, tab: 'mine' })
    wx.showToast({ title: '已发布', icon: 'none' })
    this.refresh()
  },

  async onOpenComments(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      showComments: true,
      commentPostId: id,
      commentList: [],
      commentDraft: ''
    })
    const res = await api.request('/api/posts/' + encodeURIComponent(id) + '/comments', 'GET')
    if (res.ok) this.setData({ commentList: res.data.comments || [] })
  },

  closeComments() { this.setData({ showComments: false, commentPostId: '' }) },
  onCommentDraft(e) { this.setData({ commentDraft: e.detail.value }) },

  async onSendComment() {
    if (this.data.guest) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const text = (this.data.commentDraft || '').trim()
    if (!text) return
    const id = this.data.commentPostId
    const res = await api.request('/api/posts/' + encodeURIComponent(id) + '/comments', 'POST', { text })
    if (!res.ok) {
      wx.showToast({ title: res.error || '发送失败', icon: 'none' })
      return
    }
    this.setData({
      commentDraft: '',
      commentList: [res.data.comment].concat(this.data.commentList || []),
      posts: (this.data.posts || []).map((p) => p.id === id ? res.data.post : p)
    })
  }
})
