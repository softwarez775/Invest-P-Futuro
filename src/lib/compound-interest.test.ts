import { describe, it, expect } from "vitest";
import {
  simulateCompoundInterest,
  validateInputs,
  exportToCSV,
  type CompoundInterestInputs,
} from "./compound-interest";

describe("simulateCompoundInterest", () => {
  it("deve calcular juros básicos corretamente", () => {
    const result = simulateCompoundInterest({
      inicial: 1000,
      aporteBase: 100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 1,
      inflacaoPct: null,
      reajustePct: null,
    });

    expect(result.totalAportado).toBeCloseTo(2200, 0);
    expect(result.totalJuros).toBeCloseTo(184.65, 1);
    expect(result.patrimonioNominal).toBeCloseTo(2384.65, 1);
  });

  it("deve converter taxa mensal para anual corretamente", () => {
    const result = simulateCompoundInterest({
      inicial: 1000,
      aporteBase: 0,
      taxaInput: 1,
      taxaUnit: "mes",
      anos: 1,
      inflacaoPct: null,
      reajustePct: null,
    });

    expect(result.taxaAnoEquivalente).toBeCloseTo(12.6825, 2);
  });

  it("deve aplicar reajuste anual do aporte", () => {
    const result = simulateCompoundInterest({
      inicial: 0,
      aporteBase: 100,
      taxaInput: 0,
      taxaUnit: "ano",
      anos: 2,
      inflacaoPct: null,
      reajustePct: 10,
    });

    // Mês 13 deve ter aporte de 110 (100 * 1.1)
    expect(result.rows[12].aporte).toBeCloseTo(110, 0);
  });

  it("deve aplicar deflação por inflação", () => {
    const result = simulateCompoundInterest({
      inicial: 1000,
      aporteBase: 0,
      taxaInput: 10,
      taxaUnit: "ano",
      anos: 1,
      inflacaoPct: 5,
      reajustePct: null,
    });

    expect(result.patrimonioNominal).toBeCloseTo(1100, 0);
    expect(result.patrimonioReal).toBeCloseTo(1047.62, 1);
  });

  it("deve retornar um ano mínimo de 1", () => {
    const result = simulateCompoundInterest({
      inicial: 1000,
      aporteBase: 100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 0,
      inflacaoPct: null,
      reajustePct: null,
    });

    expect(result.anos).toBe(1);
    expect(result.rows.length).toBe(12);
  });
});

describe("validateInputs", () => {
  it("deve aceitar inputs válidos", () => {
    const result = validateInputs({
      inicial: 1000,
      aporteBase: 100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 10,
      inflacaoPct: 3,
      reajustePct: null,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve rejeitar valor inicial negativo", () => {
    const result = validateInputs({
      inicial: -1000,
      aporteBase: 100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 10,
      inflacaoPct: null,
      reajustePct: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Valor inicial não pode ser negativo");
  });

  it("deve rejeitar aporte negativo", () => {
    const result = validateInputs({
      inicial: 1000,
      aporteBase: -100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 10,
      inflacaoPct: null,
      reajustePct: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Aporte mensal não pode ser negativo");
  });

  it("deve rejeitar taxa menor que -100%", () => {
    const result = validateInputs({
      inicial: 1000,
      aporteBase: 100,
      taxaInput: -150,
      taxaUnit: "ano",
      anos: 10,
      inflacaoPct: null,
      reajustePct: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Taxa não pode ser menor que -100%");
  });

  it("deve rejeitar período menor que 1 ano", () => {
    const result = validateInputs({
      inicial: 1000,
      aporteBase: 100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 0,
      inflacaoPct: null,
      reajustePct: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Período deve ser no mínimo 1 ano");
  });

  it("deve rejeitar inflação menor que -100%", () => {
    const result = validateInputs({
      inicial: 1000,
      aporteBase: 100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 10,
      inflacaoPct: -150,
      reajustePct: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Inflação não pode ser menor que -100%");
  });

  it("deve aceitar inflação nula", () => {
    const result = validateInputs({
      inicial: 1000,
      aporteBase: 100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 10,
      inflacaoPct: null,
      reajustePct: null,
    });

    expect(result.valid).toBe(true);
  });

  it("deve rejeitar reajuste menor que -100%", () => {
    const result = validateInputs({
      inicial: 1000,
      aporteBase: 100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 10,
      inflacaoPct: null,
      reajustePct: -150,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Reajuste não pode ser menor que -100%");
  });

  it("deve retornar múltiplos erros", () => {
    const result = validateInputs({
      inicial: -1000,
      aporteBase: -100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: -5,
      inflacaoPct: null,
      reajustePct: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain("Valor inicial não pode ser negativo");
    expect(result.errors).toContain("Aporte mensal não pode ser negativo");
    expect(result.errors).toContain("Período deve ser no mínimo 1 ano");
  });
});

describe("exportToCSV", () => {
  it("deve gerar CSV válido", () => {
    const result = simulateCompoundInterest({
      inicial: 1000,
      aporteBase: 100,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 1,
      inflacaoPct: null,
      reajustePct: null,
    });

    const csv = exportToCSV(result);

    expect(csv).toBeTruthy();
    expect(csv).toContain("Mês,Aporte,Juros,Saldo,Total Aportado,Total Juros,Saldo Real");
    expect(csv.split("\n").length).toBe(13); // 1 header + 12 meses
  });

  it("deve incluir dados de inflação quando presente", () => {
    const result = simulateCompoundInterest({
      inicial: 1000,
      aporteBase: 0,
      taxaInput: 10,
      taxaUnit: "ano",
      anos: 1,
      inflacaoPct: 5,
      reajustePct: null,
    });

    const csv = exportToCSV(result);
    const lines = csv.split("\n");

    // Não deve ter "—" se há deflação
    expect(lines[1]).not.toContain("—");
  });

  it("deve escapar corretamente números decimais", () => {
    const result = simulateCompoundInterest({
      inicial: 1000,
      aporteBase: 50,
      taxaInput: 12,
      taxaUnit: "ano",
      anos: 1,
      inflacaoPct: null,
      reajustePct: null,
    });

    const csv = exportToCSV(result);
    const lines = csv.split("\n");

    // Verifica se o primeiro mês tem valores decimais corretos
    expect(lines[1]).toMatch(/\d+\.\d{2}/);
  });
});
