import { Router } from 'express'
import { finalizarPago } from '../models/services/paymentService.js'

export const callbackController = Router()

callbackController.get('/callback', async (req, res) => {
  try {
    const { interact_ref: interactRef, billId, participanteId } = req.query
    if (!interactRef || !billId || !participanteId) {
      throw new Error('Parámetros de callback incompletos')
    }

    await finalizarPago({
      billId: String(billId),
      participanteId: String(participanteId),
      interactRef: String(interactRef)
    })

    res.redirect('/gracias')
  } catch (error) {
    console.error(error)
    res.redirect('/error')
  }
})
