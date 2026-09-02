/**
 * Motor de cálculo de juros compostos com aportes mensais.
 *
 * Algoritmo: aporte aplicado no fim de cada mês, juros sobre o
 * saldo anterior, reajuste do aporte a cada aniversário de 12 meses e
 * deflação do saldo pela inflação anual estimada.
 */

export type TaxaUnit = "ano" | "mes";

export interface CompoundInterestInputs {
  /** Valor inicial aplicado no mês 0. */
  inicial: number;
  /** Aporte mensal base (antes do reajuste anual). */
  aporteBase: number;
  /** Taxa em porcentagem (12 = 12%). Interpretada conforme `taxaUnit`. */
  taxaInput: number;
  taxaUnit: TaxaUnit;
  /** Período em anos (mínimo 1). */
  anos: number;
  /** Inflação anual estimada em %. `null` = não considerar. */
  inflacaoPct: number | null;
  /** Reajuste anual do aporte em %. `null` = não considerar. */
  reajustePct: number | null;
}

export interface MonthRow {
  m: number;
  aporte: number;
  jurosMes: number;
  saldo: number;
  totalAportado: number;
  totalJuros: number;
  isReajuste: boolean;
  saldoReal: number | null;
}

export interface YearPoint {
  label: string;
  investido: number;
  rendimento: number;
  real: number | null;
}

export interface CompoundInterestResult {
  anos: number;
  aporteBase: number;
  inflacaoPct: number | null;
  reajustePct: number | null;
  temAvancado: boolean;
  /** Taxa mensal efetiva em decimal (0,01 = 1%). */
  taxaMensal: number;
  /** Taxa anual equivalente em porcentagem. */
  taxaAnoEquivalente: number;
  totalAportado: number;
  totalJuros: number;
  patrimonioNominal: number;
  patrimonioReal: number | null;
  aporteUltimoAno: number;
  rows: MonthRow[];
  years: YearPoint[];
}

export function simulateCompoundInterest(inputs: CompoundInterestInputs): CompoundInterestResult {
  const { inicial, aporteBase, taxaInput, taxaUnit } = inputs;
  const anos = Math.max(1, Math.round(inputs.anos) || 1);
  const inflacaoPct = inputs.inflacaoPct;
  const reajustePct = inputs.reajustePct;

  const temAvancado = inflacaoPct !== null || reajustePct !== null;
  const inflacao = (inflacaoPct ?? 0) / 100;
  const reajuste = (reajustePct ?? 0) / 100;

  let taxaMensal: number;
  let taxaAnoEquivalente: number;
  if (taxaUnit === "mes") {
    taxaMensal = taxaInput / 100;
    taxaAnoEquivalente = (Math.pow(1 + taxaMensal, 12) - 1) * 100;
  } else {
    taxaAnoEquivalente = taxaInput;
    taxaMensal = Math.pow(1 + taxaInput / 100, 1 / 12) - 1;
  }

  let saldo = inicial;
  let totalAportado = inicial;
  let totalJuros = 0;

  const rows: MonthRow[] = [];
  const years: YearPoint[] = [];

  for (let m = 1; m <= anos * 12; m++) {
    const ano = Math.floor((m - 1) / 12);
    const aporteMes = aporteBase * Math.pow(1 + reajuste, ano);
    const saldoAntes = saldo;
    const jurosMes = saldoAntes * taxaMensal;
    saldo = saldoAntes * (1 + taxaMensal) + aporteMes;
    totalAportado += aporteMes;
    totalJuros += jurosMes;

    const isReajuste = m > 1 && (m - 1) % 12 === 0;
    const saldoReal = temAvancado ? saldo / Math.pow(1 + inflacao, m / 12) : null;

    rows.push({
      m,
      aporte: aporteMes,
      jurosMes,
      saldo,
      totalAportado,
      totalJuros,
      isReajuste,
      saldoReal,
    });

    if (m % 12 === 0) {
      years.push({
        label: `Ano ${m / 12}`,
        investido: Math.round(totalAportado),
        rendimento: Math.round(totalJuros),
        real: saldoReal !== null ? Math.round(saldoReal) : null,
      });
    }
  }

  return {
    anos,
    aporteBase,
    inflacaoPct,
    reajustePct,
    temAvancado,
    taxaMensal,
    taxaAnoEquivalente,
    totalAportado,
    totalJuros,
    patrimonioNominal: saldo,
    patrimonioReal: temAvancado ? saldo / Math.pow(1 + inflacao, anos) : null,
    aporteUltimoAno: aporteBase * Math.pow(1 + reajuste, anos - 1),
    rows,
    years,
  };
}

/* ---------- Formatação (pt-BR) ---------- */

/** Valor completo: R$ 1.234,56 */
export const fmtFull = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Valor abreviado dos cartões: R$ 120 mil · R$ 1,22 mi */
export const fmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) {
    return "R$ " + (n / 1_000_000).toFixed(2).replace(".", ",") + " mi";
  }
  if (Math.abs(n) >= 1000) {
    return "R$ " + Math.round(n / 1000) + " mil";
  }
  return "R$ " + Math.round(n).toLocaleString("pt-BR");
};

/** Número com vírgula decimal: 0,9489 */
export const fmtNumber = (n: number, digits = 2) => n.toFixed(digits).replace(".", ",");

/* ---------- Leitura dos campos ---------- */

export const onlyDigits = (value: string) => String(value).replace(/\D/g, "");

/** "1.000" → 1000 (moedas aceitam apenas inteiros, como na referência). */
export const currencyToNumber = (value: string) => {
  const digits = onlyDigits(value);
  return digits ? parseInt(digits, 10) : 0;
};

/** Aceita "1,5" ou "1.5"; vazio/inválido → null. */
export const percentToNumber = (value: string): number | null => {
  const raw = value.replace(",", ".").trim();
  if (raw === "") return null;
  const v = parseFloat(raw);
  return Number.isNaN(v) ? null : v;
};

/** Formata o que foi digitado em campo de moeda: "1000" → "1.000". */
export const formatCurrencyInput = (value: string) => {
  const digits = onlyDigits(value);
  return digits ? parseInt(digits, 10).toLocaleString("pt-BR") : "";
};

/* ---------- Validação de Inputs ---------- */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateInputs(inputs: CompoundInterestInputs): ValidationResult {
  const errors: string[] = [];

  if (inputs.inicial < 0) {
    errors.push("Valor inicial não pode ser negativo");
  }
  if (inputs.aporteBase < 0) {
    errors.push("Aporte mensal não pode ser negativo");
  }
  if (inputs.taxaInput < -100) {
    errors.push("Taxa não pode ser menor que -100%");
  }
  if (inputs.anos < 1) {
    errors.push("Período deve ser no mínimo 1 ano");
  }
  if (inputs.inflacaoPct !== null && inputs.inflacaoPct < -100) {
    errors.push("Inflação não pode ser menor que -100%");
  }
  if (inputs.reajustePct !== null && inputs.reajustePct < -100) {
    errors.push("Reajuste não pode ser menor que -100%");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* ---------- Exportação de Dados ---------- */

export function exportToCSV(result: CompoundInterestResult): string {
  const header = ["Mês", "Aporte", "Juros", "Saldo", "Total Aportado", "Total Juros", "Saldo Real"];

  const rows = result.rows.map((row) => [
    row.m.toString(),
    row.aporte.toFixed(2),
    row.jurosMes.toFixed(2),
    row.saldo.toFixed(2),
    row.totalAportado.toFixed(2),
    row.totalJuros.toFixed(2),
    row.saldoReal?.toFixed(2) ?? "—",
  ]);

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return csv;
}
