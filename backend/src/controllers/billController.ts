import { Router } from 'express'
import { crearCuenta, obtenerEstado } from '../models/services/billService.js'

export const billController = Router()

billController.post('/bills', async (req, res) => {
  try {
    const { restauranteWallet, moneda, total, participantes } = req.body
    const result = await crearCuenta({ restauranteWallet, moneda, total, participantes })
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
    res.status(404).json({ error: (error as Error).message })
  }
})
