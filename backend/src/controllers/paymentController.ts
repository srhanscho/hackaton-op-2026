import { Router } from 'express'
import { iniciarPago } from '../models/services/paymentService.js'

export const paymentController = Router()

paymentController.post('/api/bills/:id/pay', async (req, res) => {
  try {
    const { participanteId, walletAddress } = req.body
    const finishUri = `${req.protocol}://${req.get('host')}/callback?billId=${req.params.id}&participanteId=${participanteId}`

    const { redirectUrl } = await iniciarPago({
      billId: req.params.id,
      participanteId,
      walletAddress,
      finishUri
    })

    res.json({ redirectUrl })
  } catch (error) {
    console.error(error)
    res.status(400).json({ error: (error as Error).message })
  }
})
