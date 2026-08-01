import type { Bill } from '../entities/Bill.js'
import type { BillRepository } from './billRepository.js'

export class MemoryBillRepository implements BillRepository {
  private readonly bills = new Map<string, Bill>()

  save (bill: Bill): void {
    this.bills.set(bill.id, bill)
  }

  getById (id: string): Bill | undefined {
    return this.bills.get(id)
  }
}

export const billRepository: BillRepository = new MemoryBillRepository()
