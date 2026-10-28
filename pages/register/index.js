const store = require('../../utils/store')
const catalog = require('../../data/catalog')
const api = require('../../utils/api')
const mapUtil = require('../../utils/map')

Page({
  data: {
    mode: 'create',
    species: 'cat',
    name: '',
    breed: '',
    genders: ['公', '母', '未知'],
    genderIndex: 0,
    birthday: '',
    weight: '',
    avatar: '🐱',
    emojis: catalog.emojis.cat,
    photo: '',
    city: '',
    saving: false
  },

  onLoad(query) {
    const mode = query.mode === 'add' ? 'add' : 'create'
    const state = store.load()
    if (!state.authed || !api.getToken()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    this.setData({ mode, city: state.city || '' })
    wx.setNavigationBarTitle({ title: mode === 'add' ? '添加宠物' : '登记宠物' })
    this.ensureCity()
  },

  async ensureCity() {
    const state = store.load()
    if (state.city) {
      this.setData({ city: state.city })
      return
    }
    const city = await mapUtil.detectCity()
    if (!city) return
    this.setData({ city })
    store.update((d) => { d.city = city })
    await api.request('/api/auth/profile', 'PUT', { city })
  },

  syncSpecies(species) {
    const emojis = catalog.emojis[species] || []
    this.setData({
      species,
      emojis,
      avatar: emojis[0] || '🐾',
      photo: ''
    })
  },

  onSpecies(e) { this.syncSpecies(e.currentTarget.dataset.id) },
  onName(e) { this.setData({ name: e.detail.value }) },
  onBreed(e) { this.setData({ breed: e.detail.value }) },
  onGender(e) { this.setData({ genderIndex: Number(e.detail.value) }) },
  onBirthday(e) { this.setData({ birthday: e.detail.value }) },
  onWeight(e) { this.setData({ weight: e.detail.value }) },
  onEmoji(e) { this.setData({ avatar: e.currentTarget.dataset.emoji, photo: '' }) },

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
            if ((file.data || '').length > 900000) {
              wx.showToast({ title: '照片太大，请换一张', icon: 'none' })
              return
            }
            this.setData({ photo: 'data:image/jpeg;base64,' + file.data })
          },
          fail: () => {
            this.setData({ photo: path })
          }
        })
      }
    })
  },

  async onSave() {
    if (this.data.saving) return
    const name = (this.data.name || '').trim()
    const breed = (this.data.breed || '').trim()
    if (!name) {
      wx.showToast({ title: '给毛孩子起个名字吧', icon: 'none' })
      return
    }
    if (!breed) {
      wx.showToast({ title: '请填写品种', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    const payload = {
      species: this.data.species,
      name,
      breed,
      gender: this.data.genders[this.data.genderIndex],
      birthday: this.data.birthday,
      weight: this.data.weight ? Number(this.data.weight) : '',
      avatar: this.data.avatar,
      photo: this.data.photo || ''
    }
    const res = await api.request('/api/pets', 'POST', payload)
    this.setData({ saving: false })
    if (!res.ok) {
      wx.showToast({ title: res.error || '保存失败', icon: 'none' })
      return
    }
    const pet = res.data.pet
    store.update((draft) => {
      draft.pets = (draft.pets || []).concat([pet])
      draft.currentPetId = pet.id
      draft.authed = true
      draft.guest = false
    })
    wx.showToast({ title: '已保存', icon: 'none' })
    if (this.data.mode === 'add') {
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) })
    } else {
      wx.switchTab({ url: '/pages/home/index' })
    }
  }
})
