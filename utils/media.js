const config = require('./config')

function resolveUrl(url) {
  const text = String(url || '').trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text) || text.indexOf('data:') === 0) return text
  if (text.indexOf('/') === 0) return config.apiBase.replace(/\/$/, '') + text
  return text
}

module.exports = {
  resolveUrl
}
