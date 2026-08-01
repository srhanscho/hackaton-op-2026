import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CreateBill from './pages/CreateBill'
import VacaScreen from './pages/VacaScreen'
import Receipt from './pages/Receipt'
import PayScreen from './pages/PayScreen'
import ThanksScreen from './pages/ThanksScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateBill />} />
        <Route path="/vaca/:id" element={<VacaScreen />} />
        <Route path="/vaca/:id/recibo" element={<Receipt />} />
        <Route path="/pagar/:id" element={<PayScreen />} />
        <Route path="/pagar/:id/gracias" element={<ThanksScreen />} />
      </Routes>
    </BrowserRouter>
  )
}
