import { Router } from 'express'
import { finalizarPago } from '../models/services/paymentService.js'

export const callbackController = Router()

callbackController.get('/callback', async (req, res) => {
  // El billId se saca antes del try: el catch también lo necesita para saber
  // a qué cuenta devolver al amigo.
  const billId = String(req.query.billId ?? '')
  const front = process.env.FRONT_URL ?? ''

  try {
    const { interact_ref: interactRef, participanteId } = req.query
    if (!interactRef || !billId || !participanteId) {
      throw new Error('Parámetros de callback incompletos')
    }

    await finalizarPago({
      billId,
      participanteId: String(participanteId),
      interactRef: String(interactRef)
    })

    // Vuelve al FRONT, no al backend: aquí no hay ninguna pantalla.
    res.redirect(`${front}/pagar/${billId}/gracias`)
  } catch (error) {
    console.error(error)
    // Sin billId no hay pantalla de pago a la que volver.
    res.redirect(billId ? `${front}/pagar/${billId}?error=1` : `${front}/?error=1`)
  }
})
