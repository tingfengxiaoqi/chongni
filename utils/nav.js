/** 推迟路由，避免 LifeCycle.load 尚未结束就跳转触发开发者工具报错 */

function defer(fn) {
  if (typeof wx.nextTick === 'function') {
    wx.nextTick(fn)
  } else {
    setTimeout(fn, 0)
  }
}

function redirectTo(url) {
  defer(() => wx.redirectTo({ url }))
}

function switchTab(url) {
  defer(() => wx.switchTab({ url }))
}

function reLaunch(url) {
  defer(() => wx.reLaunch({ url }))
}

module.exports = {
  defer,
  redirectTo,
  switchTab,
  reLaunch
}
