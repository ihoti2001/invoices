// src/store/useBills.ts
import { useAppContext } from "./AppContext";

export function useBills() {
  const { loading, bills, addBill, updateBill, deleteBill, getNextBillNumber } = useAppContext();
  return { loading, bills, addBill, updateBill, deleteBill, getNextBillNumber };
}
