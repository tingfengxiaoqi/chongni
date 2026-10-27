const config = require('./config')

const SESSION_KEY = 'chongni_session_token'

function getToken() {
  try {
    return wx.getStorageSync(SESSION_KEY) || ''
  } catch (e) {
    return ''
  }
}

function setToken(token) {
  if (token) wx.setStorageSync(SESSION_KEY, token)
  else wx.removeStorageSync(SESSION_KEY)
}

function request(path, method, data) {
  return new Promise((resolve) => {
    const header = { 'content-type': 'application/json' }
    const token = getToken()
    if (token) {
      header.Authorization = 'Bearer ' + token
      header['x-session-token'] = token
    }
    wx.request({
      url: config.apiBase + path,
      method: method || 'GET',
      data: data || {},
      timeout: 12000,
      header,
      success(res) {
        const body = res.data || {}
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode, data: body })
        } else {
          resolve({
            ok: false,
            status: res.statusCode,
            error: body.error || '请求失败',
            data: body
          })
        }
      },
      fail(err) {
        resolve({ ok: false, status: 0, error: '网络异常，请检查服务端是否启动', data: null, err })
      }
    })
  })
}

async function sendSms(phone) {
  return request('/api/auth/sms', 'POST', { phone })
}

async function login(phone, code, wxCode) {
  const res = await request('/api/auth/login', 'POST', { phone, code, wxCode: wxCode || '' })
  if (res.ok && res.data.token) setToken(res.data.token)
  return res
}

async function logout() {
  await request('/api/auth/logout', 'POST', {})
  setToken('')
}

async function syncAll() {
  return request('/api/sync', 'GET')
}

module.exports = {
  SESSION_KEY,
  getToken,
  setToken,
  request,
  sendSms,
  login,
  logout,
  syncAll
}
