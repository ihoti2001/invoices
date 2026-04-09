import { useAppContext } from "./AppContext";

export function useBills() {
  const { bills, addBill, updateBill, deleteBill, getNextBillNumber } = useAppContext();
  return { bills, addBill, updateBill, deleteBill, getNextBillNumber };
}
