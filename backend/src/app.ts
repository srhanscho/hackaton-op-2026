import express from 'express'
import cors from 'cors'
import { billController } from './controllers/billController.js'
import { paymentController } from './controllers/paymentController.js'
import { callbackController } from './controllers/callbackController.js'

const app = express()

const PORT = Number(process.env.PORT) || 3000

app.use(cors())
app.use(express.json())

app.use('/api', billController)
app.use(paymentController)
app.use(callbackController)

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
