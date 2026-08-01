import { Router } from 'express'
import { BillError, cerrarCuenta, crearCuenta, obtenerEstado } from '../models/services/billService.js'

export const billController = Router()

/** 404 y 400 los decide el service; lo demás es culpa nuestra. */
function statusDe (error: unknown): number {
  return error instanceof BillError ? error.status : 500
}

billController.post('/bills', async (req, res) => {
  try {
    // El contrato manda `restaurantWallet`. La moneda no viene en el body:
    // se lee de la wallet.
    const { restaurantWallet, total, participantes } = req.body
    const result = await crearCuenta({ restaurantWallet, total, participantes })
    res.status(201).json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: (error as Error).message })
  }
})

billController.get('/bills/:id', async (req, res) => {
  try {
    const result = await obtenerEstado(req.params.id)
    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(statusDe(error)).json({ error: (error as Error).message })
  }
})

// El botón Enviar. Devuelve 400 si todavía falta plata.
billController.post('/bills/:id/complete', async (req, res) => {
  try {
    const recibo = await cerrarCuenta(req.params.id)
    res.json({ recibo })
  } catch (error) {
    console.error(error)
    res.status(statusDe(error)).json({ error: (error as Error).message })
  }
})
