const store = require('../../utils/store')
const catalog = require('../../data/catalog')
const api = require('../../utils/api')
const nav = require('../../utils/nav')

Page({
  data: {
    guest: false,
    greet: '',
    city: '',
    pet: null,
    age: '未知',
    wormText: '—',
    spend: 0,
    overdue: 0,
    cases: [],
    expenses: [],
    upcoming: [],
    reminderTypes: catalog.reminderTypes,
    expenseCats: catalog.expenseCats,
    genders: ['公', '母', '未知'],
    repeats: ['不重复', '每周', '每月', '每三个月', '每年'],
    showReminder: false,
    showExpense: false,
    showCase: false,
    showEdit: false,
    remType: 'worm',
    remTitle: '',
    remDate: '',
    remRepeatIndex: 0,
    remNote: '',
    expTitle: '',
    expAmount: '',
    expCatIndex: 0,
    expDate: '',
    caseTitle: '',
    caseDate: '',
    caseHospital: '',
    caseNote: '',
    editName: '',
    editBreed: '',
    editGenderIndex: 0,
    editBirthday: '',
    editWeight: ''
  },

  async onShow() {
    const showId = (this._showId || 0) + 1
    this._showId = showId
    const state = store.load()
    if (!state.authed && !state.guest) {
      nav.redirectTo('/pages/login/index')
      return
    }
    if (state.authed && api.getToken()) {
      await store.syncFromServer()
      if (this._showId !== showId) return
    }
    const next = store.load()
    if (next.authed && !next.pets.length) {
      nav.redirectTo('/pages/register/index')
      return
    }
    if (this._showId !== showId) return
    this.refresh()
  },

  refresh() {
    const state = store.load()
    if (state.guest && !state.pets.length) {
      this.setData({
        guest: true,
        greet: store.greet(),
        city: state.city || '未定位',
        pet: null
      })
      return
    }
    const pet = store.currentPet(state)
    const worm = this.nextWormDays(state, pet)
    const month = store.today().slice(0, 7)
    const spend = (state.expenses || [])
      .filter((e) => e.petId === pet.id && String(e.date).startsWith(month))
      .reduce((s, e) => s + Number(e.amount || 0), 0)
    const overdue = (state.reminders || []).filter((r) => r.petId === pet.id && r.date < store.today() && !r.done).length
    const typeMap = {}
    ;(catalog.reminderTypes || []).forEach((t) => { typeMap[t.id] = t })
    const upcoming = (state.reminders || [])
      .filter((r) => r.petId === pet.id && !r.done && r.date >= store.today())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
      .map((r) => {
        const days = store.daysBetween(store.today(), r.date)
        const meta = typeMap[r.type] || { icon: '⭐', name: '提醒' }
        return Object.assign({}, r, {
          icon: meta.icon,
          typeName: meta.name,
          dueText: days === 0 ? '今天' : days + '天后'
        })
      })
    this.setData({
      guest: false,
      greet: store.greet(),
      city: state.city || '未定位',
      pet,
      age: store.ageText(pet.birthday),
      wormText: worm == null ? '—' : (worm === 0 ? '今天' : worm + '天'),
      spend,
      overdue,
      upcoming,
      cases: (state.cases || []).filter((c) => c.petId === pet.id).slice(-3).reverse(),
      expenses: (state.expenses || []).filter((e) => e.petId === pet.id).slice(-3).reverse(),
      remDate: store.today(),
      expDate: store.today(),
      caseDate: store.today()
    })
  },

  goCalendar() {
    wx.switchTab({ url: '/pages/calendar/index' })
  },

  nextWormDays(state, pet) {
    const list = (state.reminders || [])
      .filter((r) => r.petId === pet.id && r.type === 'worm' && r.date >= store.today())
      .sort((a, b) => a.date.localeCompare(b.date))
    if (!list.length) return null
    return store.daysBetween(store.today(), list[0].date)
  },

  goLogin() {
    api.setToken('')
    store.update((d) => { d.guest = false; d.authed = false })
    wx.redirectTo({ url: '/pages/login/index' })
  },

  onAddPet() {
    wx.navigateTo({ url: '/pages/register/index?mode=add' })
  },

  goMall() {
    wx.navigateTo({ url: '/pages/mall/index' })
  },

  closeModal() {
    this.setData({ showReminder: false, showExpense: false, showCase: false, showEdit: false })
  },
  noop() {},

  openReminder() {
    this.setData({
      showReminder: true,
      remType: 'worm',
      remTitle: '',
      remDate: store.today(),
      remRepeatIndex: 0,
      remNote: ''
    })
  },
  onRemType(e) { this.setData({ remType: e.currentTarget.dataset.id }) },
  onRemTitle(e) { this.setData({ remTitle: e.detail.value }) },
  onRemDate(e) { this.setData({ remDate: e.detail.value }) },
  onRemRepeat(e) { this.setData({ remRepeatIndex: Number(e.detail.value) }) },
  onRemNote(e) { this.setData({ remNote: e.detail.value }) },
  async saveReminder() {
    const title = (this.data.remTitle || '').trim()
    if (!title) return wx.showToast({ title: '写一下做什么', icon: 'none' })
    const pet = this.data.pet
    const res = await api.request('/api/reminders', 'POST', {
      type: this.data.remType,
      title,
      date: this.data.remDate,
      repeat: this.data.repeats[this.data.remRepeatIndex],
      petId: pet.id,
      petName: pet.name,
      note: this.data.remNote
    })
    if (!res.ok) return wx.showToast({ title: res.error || '保存失败', icon: 'none' })
    store.update((d) => { d.reminders.push(res.data.reminder) })
    this.closeModal()
    wx.showToast({ title: '提醒已加上', icon: 'none' })
    this.refresh()
  },

  openExpense() {
    this.setData({
      showExpense: true,
      expTitle: '',
      expAmount: '',
      expCatIndex: 0,
      expDate: store.today()
    })
  },
  onExpTitle(e) { this.setData({ expTitle: e.detail.value }) },
  onExpAmount(e) { this.setData({ expAmount: e.detail.value }) },
  onExpCat(e) { this.setData({ expCatIndex: Number(e.detail.value) }) },
  onExpDate(e) { this.setData({ expDate: e.detail.value }) },
  async saveExpense() {
    const title = (this.data.expTitle || '').trim()
    const amount = Number(this.data.expAmount)
    if (!title) return wx.showToast({ title: '写一下花在哪', icon: 'none' })
    if (!(amount >= 0)) return wx.showToast({ title: '请填写金额', icon: 'none' })
    const pet = this.data.pet
    const res = await api.request('/api/expenses', 'POST', {
      title,
      amount,
      cat: this.data.expenseCats[this.data.expCatIndex],
      date: this.data.expDate,
      petId: pet.id,
      petName: pet.name
    })
    if (!res.ok) return wx.showToast({ title: res.error || '保存失败', icon: 'none' })
    store.update((d) => { d.expenses.push(res.data.expense) })
    this.closeModal()
    wx.showToast({ title: '已记一笔', icon: 'none' })
    this.refresh()
  },

  openCase() {
    this.setData({
      showCase: true,
      caseTitle: '',
      caseDate: store.today(),
      caseHospital: '',
      caseNote: ''
    })
  },
  onCaseTitle(e) { this.setData({ caseTitle: e.detail.value }) },
  onCaseDate(e) { this.setData({ caseDate: e.detail.value }) },
  onCaseHospital(e) { this.setData({ caseHospital: e.detail.value }) },
  onCaseNote(e) { this.setData({ caseNote: e.detail.value }) },
  async saveCase() {
    const title = (this.data.caseTitle || '').trim()
    if (!title) return wx.showToast({ title: '写一下标题', icon: 'none' })
    const pet = this.data.pet
    const res = await api.request('/api/cases', 'POST', {
      title,
      date: this.data.caseDate,
      hospital: this.data.caseHospital,
      note: this.data.caseNote,
      petId: pet.id,
      petName: pet.name
    })
    if (!res.ok) return wx.showToast({ title: res.error || '保存失败', icon: 'none' })
    store.update((d) => { d.cases.push(res.data.case) })
    this.closeModal()
    wx.showToast({ title: '病例已保存', icon: 'none' })
    this.refresh()
  },

  openEdit() {
    const pet = this.data.pet
    const genders = this.data.genders
    let genderIndex = genders.indexOf(pet.gender)
    if (genderIndex < 0) genderIndex = 0
    this.setData({
      showEdit: true,
      editName: pet.name,
      editBreed: pet.breed || '',
      editGenderIndex: genderIndex,
      editBirthday: pet.birthday || '',
      editWeight: pet.weight === '' || pet.weight == null ? '' : String(pet.weight)
    })
  },
  onEditName(e) { this.setData({ editName: e.detail.value }) },
  onEditBreed(e) { this.setData({ editBreed: e.detail.value }) },
  onEditGender(e) { this.setData({ editGenderIndex: Number(e.detail.value) }) },
  onEditBirthday(e) { this.setData({ editBirthday: e.detail.value }) },
  onEditWeight(e) { this.setData({ editWeight: e.detail.value }) },
  async saveEdit() {
    const name = (this.data.editName || '').trim()
    const breed = (this.data.editBreed || '').trim()
    if (!name) return wx.showToast({ title: '名字不能为空', icon: 'none' })
    if (!breed) return wx.showToast({ title: '请填写品种', icon: 'none' })
    const pet = this.data.pet
    const payload = {
      name,
      breed,
      gender: this.data.genders[this.data.editGenderIndex],
      birthday: this.data.editBirthday,
      weight: this.data.editWeight ? Number(this.data.editWeight) : ''
    }
    const res = await api.request('/api/pets/' + encodeURIComponent(pet.id), 'PUT', payload)
    if (!res.ok) return wx.showToast({ title: res.error || '保存失败', icon: 'none' })
    store.update((d) => {
      const hit = d.pets.find((p) => p.id === pet.id)
      if (hit) Object.assign(hit, res.data.pet)
    })
    this.closeModal()
    wx.showToast({ title: '资料已更新', icon: 'none' })
    this.refresh()
  }
})
