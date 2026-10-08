import { Router } from 'express'
import { KioskController } from '../controllers/kioskController.js'
import { TransactionController } from '../controllers/transactionController.js'
import { PricingController } from '../controllers/pricingController.js'
import { FrameController } from '../controllers/frameController.js'
import { CouponController } from '../controllers/couponController.js'
import { AccountingController } from '../controllers/accountingController.js'
import { SystemController } from '../controllers/systemController.js'

const router = Router()

// Health check
router.get('/health', SystemController.healthCheck)
router.get('/kpis', SystemController.getKPIs)
router.get('/logs', SystemController.getAuditLogs)
router.get('/settings', SystemController.getSettings)
router.post('/settings', SystemController.updateSettings)

// Kiosks API (Dùng cho cả CMS Web & Kiosk Client)
router.get('/kiosks', KioskController.getKiosks)
router.get('/kiosks/:id', KioskController.getKioskById)
router.post('/kiosks/:id/heartbeat', KioskController.postHeartbeat)
router.post('/kiosks/:id/lock', KioskController.toggleLock)
router.post('/kiosks/:id/refill', KioskController.refillPaper)

// Transactions & Sessions API
router.get('/transactions', TransactionController.getTransactions)
router.post('/transactions', TransactionController.createTransaction)

// Pricing API
router.get('/pricing', PricingController.getPricing)
router.put('/pricing', PricingController.updatePricing)

// Frames API
router.get('/frames', FrameController.getFrames)
router.post('/frames', FrameController.addFrame)
router.post('/frames/:id/toggle', FrameController.toggleFrame)
router.delete('/frames/:id', FrameController.deleteFrame)

// Coupons API
router.get('/coupons', CouponController.getCoupons)
router.post('/coupons', CouponController.createCoupon)
router.post('/coupons/:code/toggle', CouponController.toggleCoupon)
router.delete('/coupons/:code', CouponController.deleteCoupon)
router.get('/coupons/verify', CouponController.verifyCoupon)

// Accounting API
router.get('/accounting/reconcile', AccountingController.getReconciliation)
router.get('/accounting/export', AccountingController.exportCSV)

export default router
