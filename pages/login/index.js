const store = require('../../utils/store')
const api = require('../../utils/api')
const nav = require('../../utils/nav')

Page({
  data: {
    phone: '',
    code: '',
    smsText: '获取验证码',
    loading: false,
    cooldown: 0
  },

  onShow() {
    const state = store.load()
    if (state.authed && api.getToken() && state.pets.length) {
      nav.switchTab('/pages/home/index')
      return
    }
    if (state.authed && api.getToken() && !state.pets.length) {
      nav.redirectTo('/pages/register/index')
    }
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },

  onPhone(e) { this.setData({ phone: e.detail.value }) },
  onCode(e) { this.setData({ code: e.detail.value }) },

  async onSend() {
    if (this.data.cooldown > 0 || this.data.loading) return
    const phone = (this.data.phone || '').trim()
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请填写 11 位手机号', icon: 'none' })
      return
    }
    const res = await api.sendSms(phone)
    if (!res.ok) {
      wx.showToast({ title: res.error || '发送失败', icon: 'none' })
      return
    }
    let tip = '验证码已发送'
    if (res.data && res.data.debugCode) tip = '开发码：' + res.data.debugCode
    wx.showToast({ title: tip, icon: 'none', duration: 2500 })
    if (res.data && res.data.debugCode) this.setData({ code: res.data.debugCode })
    let left = 60
    this.setData({ cooldown: left, smsText: left + 's' })
    this._timer = setInterval(() => {
      left -= 1
      if (left <= 0) {
        clearInterval(this._timer)
        this.setData({ cooldown: 0, smsText: '获取验证码' })
        return
      }
      this.setData({ cooldown: left, smsText: left + 's' })
    }, 1000)
  },

  async onLogin() {
    if (this.data.loading) return
    const phone = (this.data.phone || '').trim()
    const code = (this.data.code || '').trim()
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请填写 11 位手机号', icon: 'none' })
      return
    }
    if (!/^\d{4,6}$/.test(code)) {
      wx.showToast({ title: '请填写验证码', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    let wxCode = ''
    try {
      const loginRes = await new Promise((resolve) => {
        wx.login({ success: resolve, fail: () => resolve(null) })
      })
      wxCode = loginRes && loginRes.code ? loginRes.code : ''
    } catch (e) {}

    const res = await api.login(phone, code, wxCode)
    this.setData({ loading: false })
    if (!res.ok) {
      wx.showToast({ title: res.error || '登录失败', icon: 'none' })
      return
    }
    store.applySync({
      user: res.data.user,
      pets: res.data.pets || []
    })
    await store.syncFromServer()
    const state = store.load()
    if (!state.pets.length) {
      wx.redirectTo({ url: '/pages/register/index' })
      return
    }
    wx.switchTab({ url: '/pages/home/index' })
  },

  onGuest() {
    store.update((draft) => {
      draft.guest = true
      draft.authed = false
    })
    wx.switchTab({ url: '/pages/square/index' })
  }
})
