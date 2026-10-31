export interface RentalInput {
  totalCost: number;
  units: number;
  monthlyRentPerUnit: number;
  monthlyExpensesPerUnit: number; // Administración, mantenimiento, impuestos...
  occupancyPercent: number;
  annualIncreasePercent: number; // Aumento anual de arriendo y gastos
  owners: number;
}

export interface RentalResult {
  costPerUnit: number;
  monthlyIncome: number; // Lo que entra con la ocupación indicada
  monthlyExpenses: number;
  monthlyNet: number;
  annualNet: number;
  annualYieldPercent: number; // Primer año, sobre el costo total
  paybackYears: number | null; // null: no se recupera en 100 años
  monthlyNetPerOwner: number;
}

const MAX_PAYBACK_YEARS = 100;

function paybackYears(totalCost: number, firstYearNet: number, annualIncreasePercent: number): number | null {
  if (firstYearNet <= 0) return null;
  let recovered = 0;
  let yearNet = firstYearNet;
  for (let year = 0; year < MAX_PAYBACK_YEARS; year++) {
    if (recovered + yearNet >= totalCost) return year + (totalCost - recovered) / yearNet;
    recovered += yearNet;
    yearNet *= 1 + annualIncreasePercent / 100;
  }
  return null;
}

export function simulateRental(input: RentalInput): RentalResult {
  const { totalCost, units, monthlyRentPerUnit, monthlyExpensesPerUnit, occupancyPercent, annualIncreasePercent, owners } = input;
  const monthlyIncome = monthlyRentPerUnit * units * (occupancyPercent / 100);
  // Los gastos se pagan aunque el apartaestudio esté desocupado
  const monthlyExpenses = monthlyExpensesPerUnit * units;
  const monthlyNet = monthlyIncome - monthlyExpenses;
  const annualNet = monthlyNet * 12;
  return {
    costPerUnit: units > 0 ? totalCost / units : 0,
    monthlyIncome,
    monthlyExpenses,
    monthlyNet,
    annualNet,
    annualYieldPercent: totalCost > 0 ? (annualNet / totalCost) * 100 : 0,
    paybackYears: totalCost > 0 ? paybackYears(totalCost, annualNet, annualIncreasePercent) : null,
    monthlyNetPerOwner: owners > 0 ? monthlyNet / owners : 0,
  };
}
