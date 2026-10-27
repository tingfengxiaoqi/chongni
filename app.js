const store = require('./utils/store')
const api = require('./utils/api')

App({
  onLaunch() {
    if (!api.getToken()) return
    store.syncFromServer().then((res) => {
      if (res && res.ok) return
      if (res && res.status === 401) {
        api.setToken('')
        store.update((d) => {
          d.authed = false
        })
      }
    })
  }
})
