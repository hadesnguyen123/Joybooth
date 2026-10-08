import { TransactionModel } from '../models/Transaction.js'

export const TransactionController = {
  getTransactions(req, res) {
    try {
      const { kioskId, paymentMethod, limit } = req.query
      let list = TransactionModel.getAll()

      if (kioskId && kioskId !== 'all') {
        list = list.filter((t) => t.kioskId === kioskId)
      }
      if (paymentMethod && paymentMethod !== 'all') {
        list = list.filter((t) => t.paymentMethod === paymentMethod)
      }
      if (limit) {
        list = list.slice(0, Number(limit))
      }

      res.json({ success: true, count: list.length, data: list })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  createTransaction(req, res) {
    try {
      const newTxn = TransactionModel.create(req.body)
      res.status(201).json({ success: true, data: newTxn })
    } catch (err) {
      res.status(400).json({ success: false, error: err.message })
    }
  },
}
