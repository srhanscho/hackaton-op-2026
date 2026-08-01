import type { Bill } from '../entities/Bill.js'

export interface BillRepository {
  save (bill: Bill): void
  getById (id: string): Bill | undefined
}
