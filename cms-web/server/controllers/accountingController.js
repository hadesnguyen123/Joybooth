import { TransactionModel } from '../models/Transaction.js'

export const AccountingController = {
  getReconciliation(req, res) {
    try {
      const summary = TransactionModel.reconcile()
      res.json({ success: true, data: summary })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  exportCSV(req, res) {
    try {
      const txns = TransactionModel.getAll()
      const header = 'Mã Đơn,Thời Gian,Máy Kiosk,Khổ Ảnh,Số Bản In,Số Tiền (VND),Phương Thức,Mã Voucher,Trạng Thái,Link Drive\n'
      const rows = txns.map((t) =>
        `"${t.id}","${t.createdAt}","${t.kioskName}","${t.layoutType}",${t.copies},${t.amount},"${t.paymentMethod}","${t.couponCode || 'None'}","${t.status}","${t.driveLink || ''}"`
      ).join('\n')

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="joybooth_reconciliation_${new Date().toISOString().slice(0, 10)}.csv"`)
      res.send(`\uFEFF${header}${rows}`)
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },
}
