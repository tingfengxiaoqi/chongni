const store = require('../../utils/store')
const catalog = require('../../data/catalog')
const api = require('../../utils/api')

function typeMeta(id) {
  return catalog.reminderTypes.find((t) => t.id === id) || catalog.reminderTypes[3]
}

Page({
  data: {
    mode: 'calendar',
    year: 2026,
    month: 10,
    weeks: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],
    selectedDay: '',
    dayItems: [],
    reminderTypes: catalog.reminderTypes,
    expenses: [],
    monthSpend: 0
  },

  async onShow() {
    const state = store.load()
    if (!state.authed && !state.guest) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    if (state.authed && api.getToken()) await store.syncFromServer()
    const now = new Date()
    if (!this.data.selectedDay) {
      this.setData({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        selectedDay: store.today()
      })
    }
    this.refresh()
  },

  refresh() {
    const state = store.load()
    const y = this.data.year
    const m = this.data.month
    const first = new Date(y, m - 1, 1)
    const start = first.getDay()
    const count = new Date(y, m, 0).getDate()
    const days = []
    for (let i = 0; i < start; i++) days.push(null)
    for (let d = 1; d <= count; d++) {
      const date = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
      const marks = (state.reminders || [])
        .filter((r) => r.date === date)
        .map((r) => typeMeta(r.type).color)
      const uniq = []
      marks.forEach((c) => { if (uniq.indexOf(c) < 0) uniq.push(c) })
      days.push({ d, date, marks: uniq.slice(0, 3) })
    }
    const selected = this.data.selectedDay
    const dayItems = (state.reminders || [])
      .filter((r) => r.date === selected)
      .map((r) => {
        const t = typeMeta(r.type)
        return Object.assign({}, r, {
          color: t.color,
          typeName: t.name,
          overdue: r.date < store.today() && !r.done
        })
      })
    const monthKey = y + '-' + String(m).padStart(2, '0')
    const expenses = (state.expenses || []).slice().reverse()
    const monthSpend = expenses
      .filter((e) => String(e.date).startsWith(monthKey))
      .reduce((s, e) => s + Number(e.amount || 0), 0)
    this.setData({ days, dayItems, expenses, monthSpend })
  },

  onMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  prevMonth() {
    let y = this.data.year
    let m = this.data.month - 1
    if (m < 1) { m = 12; y -= 1 }
    this.setData({ year: y, month: m })
    this.refresh()
  },

  nextMonth() {
    let y = this.data.year
    let m = this.data.month + 1
    if (m > 12) { m = 1; y += 1 }
    this.setData({ year: y, month: m })
    this.refresh()
  },

  onSelectDay(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    this.setData({ selectedDay: date })
    this.refresh()
  },

  async onToggleDone(e) {
    const id = e.currentTarget.dataset.id
    const state = store.load()
    const item = (state.reminders || []).find((r) => r.id === id)
    if (!item) return
    const next = !item.done
    const res = await api.request('/api/reminders/' + encodeURIComponent(id), 'PATCH', { done: next })
    if (!res.ok) {
      wx.showToast({ title: res.error || '更新失败', icon: 'none' })
      return
    }
    store.update((d) => {
      const hit = d.reminders.find((r) => r.id === id)
      if (hit) hit.done = next
    })
    this.refresh()
  },

  goHomeRemind() {
    wx.switchTab({ url: '/pages/home/index' })
  },

  goHomeExpense() {
    wx.switchTab({ url: '/pages/home/index' })
  }
})
