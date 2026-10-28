const store = require('./store')
const api = require('./api')

function unreadCount(state) {
  if (state && typeof state.unread === 'number') return state.unread
  return (state.messages || []).filter((m) => m.unread).length
}

function lastPreview(state, friendId) {
  const friend = (state.friends || []).find((f) => f.id === friendId)
  return friend ? (friend.preview || friend.detail || '') : ''
}

async function getThread(friendId) {
  const res = await api.request('/api/chat/' + encodeURIComponent(friendId), 'GET')
  if (!res.ok) return []
  return res.data.messages || []
}

async function sendMessage(friendId, text) {
  const body = String(text || '').trim()
  if (!body) return null
  const res = await api.request('/api/chat/' + encodeURIComponent(friendId), 'POST', { text: body })
  if (!res.ok) {
    wx.showToast({ title: res.error || '发送失败', icon: 'none' })
    return null
  }
  return res.data.message
}

async function markRead(friendId) {
  await api.request('/api/chat/' + encodeURIComponent(friendId), 'PATCH', {})
}

async function addFriendByPhone(phone) {
  const res = await api.request('/api/friends', 'POST', { phone })
  if (!res.ok) {
    wx.showToast({ title: res.error || '添加失败', icon: 'none' })
    return null
  }
  store.update((d) => {
    d.friends = res.data.friends || []
  })
  return res.data.friends
}

async function addFriendFromPost(postId) {
  const res = await api.request('/api/friends', 'POST', { postId })
  if (!res.ok) {
    wx.showToast({ title: res.error || '添加失败', icon: 'none' })
    return null
  }
  store.update((d) => {
    d.friends = res.data.friends || []
  })
  return res.data
}

async function refreshFriends() {
  const res = await api.request('/api/friends', 'GET')
  if (!res.ok) return []
  store.update((d) => { d.friends = res.data.friends || [] })
  return res.data.friends || []
}

async function refreshInbox() {
  const res = await api.request('/api/messages', 'GET')
  if (!res.ok) return []
  store.update((d) => {
    d.messages = res.data.messages || []
    d.unread = res.data.unread || 0
  })
  return res.data.messages || []
}

module.exports = {
  getThread,
  sendMessage,
  markRead,
  unreadCount,
  lastPreview,
  addFriendByPhone,
  addFriendFromPost,
  refreshFriends,
  refreshInbox
}
