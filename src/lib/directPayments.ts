export function buildDirectPaymentDescription(payerName: string, expenseDescription: string): string {
  return `Aporte de ${payerName} (pago directo): ${expenseDescription}`;
}
