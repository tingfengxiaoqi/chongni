const KEY = 'chongni_mp_v1'
const api = require('./api')

function today() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function defaultState() {
  return {
    authed: false,
    guest: false,
    phone: '',
    userId: '',
    nickname: '铲屎官',
    city: '',
    avatar: '🐾',
    joinedAt: today(),
    pets: [],
    currentPetId: '',
    reminders: [],
    expenses: [],
    cases: [],
    posts: [],
    friends: [],
    messages: [],
    chats: {},
    cart: [],
    orders: [],
    unread: 0,
    lastSyncAt: ''
  }
}

function load() {
  try {
    const saved = wx.getStorageSync(KEY)
    if (!saved || typeof saved !== 'object') return defaultState()
    const base = defaultState()
    return Object.assign({}, base, saved, {
      pets: Array.isArray(saved.pets) ? saved.pets : [],
      reminders: Array.isArray(saved.reminders) ? saved.reminders : [],
      expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
      cases: Array.isArray(saved.cases) ? saved.cases : [],
      posts: Array.isArray(saved.posts) ? saved.posts : [],
      friends: Array.isArray(saved.friends) ? saved.friends : [],
      messages: Array.isArray(saved.messages) ? saved.messages : [],
      chats: saved.chats && typeof saved.chats === 'object' ? saved.chats : {},
      cart: Array.isArray(saved.cart) ? saved.cart : [],
      orders: Array.isArray(saved.orders) ? saved.orders : []
    })
  } catch (e) {
    return defaultState()
  }
}

function save(state) {
  wx.setStorageSync(KEY, state)
  return state
}

function update(mutator) {
  const state = load()
  mutator(state)
  return save(state)
}

function clear() {
  wx.removeStorageSync(KEY)
  api.setToken('')
}

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function daysBetween(a, b) {
  const x = new Date(a + 'T00:00:00')
  const y = new Date(b + 'T00:00:00')
  return Math.round((y - x) / 86400000)
}

function ageText(birthday) {
  if (!birthday) return '未知'
  const days = daysBetween(birthday, today())
  if (days < 0) return '未知'
  if (days < 60) return days + ' 天'
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  if (years <= 0) return months + ' 个月'
  return years + ' 岁' + (months ? months + ' 个月' : '')
}

function greet() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，铲屎官'
  if (h < 11) return '早上好，铲屎官'
  if (h < 14) return '中午好，铲屎官'
  if (h < 18) return '下午好，铲屎官'
  return '晚上好，铲屎官'
}

function currentPet(state) {
  const list = state.pets || []
  return list.find((p) => p.id === state.currentPetId) || list[0] || null
}

function applySync(data) {
  if (!data) return load()
  return update((d) => {
    if (data.user) {
      d.authed = true
      d.guest = false
      d.userId = data.user.id
      d.phone = data.user.phone
      d.nickname = data.user.nickname
      d.city = data.user.city
      d.avatar = data.user.avatar || '🐾'
      d.joinedAt = data.user.joinedAt || d.joinedAt
    }
    if (Array.isArray(data.pets)) {
      d.pets = data.pets
      if (!d.currentPetId || !d.pets.find((p) => p.id === d.currentPetId)) {
        d.currentPetId = d.pets[0] ? d.pets[0].id : ''
      }
    }
    if (Array.isArray(data.reminders)) d.reminders = data.reminders
    if (Array.isArray(data.expenses)) d.expenses = data.expenses
    if (Array.isArray(data.cases)) d.cases = data.cases
    if (Array.isArray(data.friends)) d.friends = data.friends
    if (Array.isArray(data.messages)) d.messages = data.messages
    if (Array.isArray(data.orders)) d.orders = data.orders
    if (data.unread !== undefined) d.unread = data.unread
    d.lastSyncAt = today()
  })
}

async function syncFromServer() {
  if (!api.getToken()) return { ok: false, error: '未登录' }
  const res = await api.syncAll()
  if (!res.ok) return res
  applySync(res.data)
  return res
}

function ensureAuth(options) {
  const state = load()
  const allowGuest = options && options.allowGuest
  const nav = require('./nav')
  if (!state.authed && !(allowGuest && state.guest)) {
    nav.redirectTo('/pages/login/index')
    return null
  }
  if (state.authed && !state.pets.length && !(options && options.allowEmptyPet)) {
    nav.redirectTo('/pages/register/index')
    return null
  }
  return state
}

module.exports = {
  KEY,
  today,
  load,
  save,
  update,
  clear,
  uid,
  daysBetween,
  ageText,
  greet,
  currentPet,
  ensureAuth,
  applySync,
  syncFromServer
}
