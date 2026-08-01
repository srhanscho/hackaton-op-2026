import { Router } from 'express'
import { iniciarPago } from '../models/services/paymentService.js'

export const paymentController = Router()

paymentController.post('/api/bills/:id/pay', async (req, res) => {
  try {
    const { participanteId, walletAddress } = req.body
    // Detrás del túnel, req.protocol da http y el auth server rechaza el
    // finishUri. BASE_URL es la única fuente de verdad de cómo nos ven desde
    // afuera; el fallback es solo para correr en local sin .env.
    const base = process.env.BASE_URL ?? `${req.protocol}://${req.get('host')}`
    const finishUri = `${base}/callback?billId=${req.params.id}&participanteId=${participanteId}`

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
