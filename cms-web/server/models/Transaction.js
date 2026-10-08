import { db } from './Database.js'
import { KioskModel } from './Kiosk.js'

export const TransactionModel = {
  getAll() {
    const data = db.read()
    return data.transactions || []
  },

  create(txnData) {
    const data = db.read()
    const id = txnData.id || `TXN-${Math.floor(10000 + Math.random() * 90000)}`
    const newTxn = {
      id,
      sessionId: txnData.sessionId || `SES-${Date.now()}`,
      kioskId: txnData.kioskId,
      kioskName: txnData.kioskName || (txnData.kioskId === 'kiosk_01' ? 'Kiosk 01 (Vincom)' : 'Kiosk 02 (Phố Đi Bộ)'),
      createdAt: txnData.createdAt || new Date().toISOString(),
      layoutType: txnData.layoutType || '2x6',
      copies: Number(txnData.copies) || 2,
      amount: Number(txnData.amount) || 0,
      paymentMethod: txnData.paymentMethod || 'vietqr',
      couponCode: txnData.couponCode || null,
      status: txnData.status || 'success',
      paperConsumed: Number(txnData.copies) || 2,
      driveLink: txnData.driveLink || '',
    }

    data.transactions = [newTxn, ...(data.transactions || [])]
    // Cập nhật KPIs
    data.kpis.totalPhotos += newTxn.layoutType === '2x6' ? 4 : 6
    data.kpis.totalSessions += 1

    db.write(data)

    // Khấu trừ giấy in trên Kiosk
    if (newTxn.kioskId && newTxn.copies) {
      KioskModel.recordPrint(newTxn.kioskId, newTxn.copies)
    }

    db.appendLog(
      'transaction',
      `Đơn hàng mới [${newTxn.id}] - ${newTxn.amount.toLocaleString()}đ qua ${newTxn.paymentMethod.toUpperCase()} (${newTxn.kioskName})`
    )

    return newTxn
  },

  reconcile() {
    const data = db.read()
    const txns = data.transactions || []

    const vietqrTotal = txns
      .filter((t) => t.paymentMethod === 'vietqr' && t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0)

    const cashTotal = txns
      .filter((t) => t.paymentMethod === 'cash' && t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalPaperPrints = txns
      .filter((t) => t.status === 'success')
      .reduce((sum, t) => sum + t.paperConsumed, 0)

    // Theo dõi độ chênh lệch
    const expectedPaperConsumption = totalPaperPrints
    const actualRecordedConsumption = totalPaperPrints // Trong mock, khớp 100%

    return {
      vietqrTotal,
      cashTotal,
      totalRevenue: vietqrTotal + cashTotal,
      totalPaperPrints,
      expectedPaperConsumption,
      actualRecordedConsumption,
      discrepancyCount: 0,
      isBalanced: true,
      auditedAt: new Date().toISOString(),
    }
  },
}
