import type { Transaction } from '../types';

const DIRECT_PAYMENT_MARK = '(pago directo)';

export function buildDirectPaymentDescription(payerName: string, expenseDescription: string): string {
  return `Aporte de ${payerName} ${DIRECT_PAYMENT_MARK}: ${expenseDescription}`;
}

export interface DirectPaymentPair {
  contribution: Transaction;
  expense: Transaction;
}

export interface DirectPaymentReview {
  pairs: DirectPaymentPair[]; // Se pueden vincular con seguridad
  unmatched: Transaction[]; // Sin gasto equivalente: requieren revisión de una persona
}

// Los pagos directos antiguos se guardaban como dos documentos sin vínculo, con
// la misma fecha, monto y persona que registra. Si el gasto se editó o se borró
// ya no coincide, y por eso el aporte queda para revisión manual.
export function reviewDirectPayments(transactions: Transaction[]): DirectPaymentReview {
  const contributions = transactions.filter((t) =>
    t.type === 'contribution' && !t.linkedTransactionId && t.description.includes(DIRECT_PAYMENT_MARK)
  );
  const available = transactions.filter((t) => t.type === 'expense' && !t.linkedTransactionId);

  const pairs: DirectPaymentPair[] = [];
  const unmatched: Transaction[] = [];

  for (const contribution of contributions) {
    const index = available.findIndex((e) =>
      e.amount === contribution.amount &&
      e.date.getTime() === contribution.date.getTime() &&
      e.registeredBy === contribution.registeredBy
    );
    if (index === -1) {
      unmatched.push(contribution);
    } else {
      pairs.push({ contribution, expense: available[index] });
      available.splice(index, 1);
    }
  }

  return { pairs, unmatched };
}
