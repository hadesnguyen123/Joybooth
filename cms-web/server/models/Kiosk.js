import { db } from './Database.js'

export const KioskModel = {
  getAll() {
    const data = db.read()
    return data.kiosks || []
  },

  getById(id) {
    const kiosks = this.getAll()
    return kiosks.find((k) => k.id === id) || null
  },

  updateHeartbeat(id, stats = {}) {
    const data = db.read()
    const kiosk = (data.kiosks || []).find((k) => k.id === id)
    if (!kiosk) return null

    kiosk.status = 'online'
    kiosk.lastHeartbeat = new Date().toISOString()
    if (typeof stats.paperRemaining === 'number') kiosk.paperRemaining = stats.paperRemaining
    if (typeof stats.printerTemperature === 'number') kiosk.printerTemperature = stats.printerTemperature
    if (stats.printerStatus) kiosk.printerStatus = stats.printerStatus
    if (stats.cameraStatus) kiosk.cameraStatus = stats.cameraStatus
    if (stats.currentVersion) kiosk.currentVersion = stats.currentVersion

    db.write(data)
    return kiosk
  },

  toggleLock(id) {
    const data = db.read()
    const kiosk = (data.kiosks || []).find((k) => k.id === id)
    if (!kiosk) return null

    kiosk.isLocked = !kiosk.isLocked
    db.write(data)
    db.appendLog('kiosk', `Kiosk [${kiosk.name}] được ${kiosk.isLocked ? 'KHÓA' : 'MỞ KHÓA'} từ xa`)
    return kiosk
  },

  refillPaper(id, amount = 400) {
    const data = db.read()
    const kiosk = (data.kiosks || []).find((k) => k.id === id)
    if (!kiosk) return null

    kiosk.paperRemaining = amount
    kiosk.paperCapacity = amount
    kiosk.printerStatus = 'ready'
    db.write(data)
    db.appendLog('hardware', `Kiosk [${kiosk.name}] đã nạp mới cuộn giấy in (${amount} tờ)`)
    return kiosk
  },

  recordPrint(id, copies) {
    const data = db.read()
    const kiosk = (data.kiosks || []).find((k) => k.id === id)
    if (!kiosk) return null

    kiosk.paperRemaining = Math.max(0, kiosk.paperRemaining - copies)
    if (kiosk.paperRemaining < 30) {
      kiosk.printerStatus = 'warning_low_paper'
    }
    db.write(data)
    return kiosk
  },
}
