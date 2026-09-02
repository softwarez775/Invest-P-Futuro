import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  currencyToNumber,
  exportToCSV,
  formatCurrencyInput,
  fmt,
  fmtFull,
  fmtNumber,
  onlyDigits,
  percentToNumber,
  simulateCompoundInterest,
  validateInputs,
  type CompoundInterestInputs,
  type TaxaUnit,
} from "@/lib/compound-interest";

export const Route = createFileRoute("/calc-juros")({
  head: () => ({
    meta: [
      { title: "Calculadora de juros compostos — Invest P/ Futuro" },
      {
        name: "description",
        content:
          "Simule aporte mensal, prazo e taxa de juros compostos e veja a evolução do patrimônio mês a mês, com inflação e reajuste do aporte opcionais.",
      },
      { property: "og:title", content: "Calculadora de juros compostos — Invest P/ Futuro" },
      {
        property: "og:description",
        content: "Projete seu patrimônio com aportes mensais e juros compostos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalcJurosPage,
});

const STORAGE_KEY = "juros-compostos-form-v1";

interface FormState {
  valorInicial: string;
  aporteMensal: string;
  taxaJuros: string;
  periodo: string;
  inflacao: string;
  reajusteAporte: string;
  taxaUnit: TaxaUnit;
  advOpen: boolean;
}

const DEFAULT_FORM: FormState = {
  valorInicial: "0",
  aporteMensal: "1.000",
  taxaJuros: "12",
  periodo: "10",
  inflacao: "",
  reajusteAporte: "",
  taxaUnit: "ano",
  advOpen: false,
};

type TextField = Exclude<keyof FormState, "taxaUnit" | "advOpen">;

/** Lê os campos do formulário e converte para os inputs da simulação. */
function parseForm(form: FormState): CompoundInterestInputs {
  return {
    inicial: currencyToNumber(form.valorInicial),
    aporteBase: currencyToNumber(form.aporteMensal),
    taxaInput: percentToNumber(form.taxaJuros) ?? 0,
    taxaUnit: form.taxaUnit,
    anos: Math.max(1, parseInt(onlyDigits(form.periodo) || "0", 10) || 1),
    inflacaoPct: percentToNumber(form.inflacao),
    reajustePct: percentToNumber(form.reajusteAporte),
  };
}

/** Mantém apenas campos plausíveis vindos do sessionStorage. */
function sanitizeForm(saved: Partial<FormState>): FormState {
  const str = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
  return {
    valorInicial: str(saved.valorInicial, DEFAULT_FORM.valorInicial),
    aporteMensal: str(saved.aporteMensal, DEFAULT_FORM.aporteMensal),
    taxaJuros: str(saved.taxaJuros, DEFAULT_FORM.taxaJuros),
    periodo: str(saved.periodo, DEFAULT_FORM.periodo),
    inflacao: str(saved.inflacao, ""),
    reajusteAporte: str(saved.reajusteAporte, ""),
    taxaUnit: saved.taxaUnit === "mes" ? "mes" : "ano",
    advOpen: saved.advOpen === true,
  };
}

const inputClass =
  "w-full bg-transparent py-3 text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground/40";

const thBase =
  "sticky top-0 z-10 border-b border-glass-border bg-card px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider whitespace-nowrap text-muted-foreground";

const tdBase = "border-b border-glass-border px-3 py-2 text-xs whitespace-nowrap";

function CalcJurosPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FormState>;
        setForm(sanitizeForm(saved));
      }
    } catch {
      /* ignore corrupted storage */
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* storage indisponível */
    }
  }, [form, hydrated]);

  const result = useMemo(() => {
    const inputs = parseForm(form);
    const validation = validateInputs(inputs);

    if (!validation.valid) {
      console.warn("Inputs inválidos:", validation.errors);
    }

    return simulateCompoundInterest(inputs);
  }, [form]);

  const updateField = (field: TextField, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleCurrency = (field: TextField) => (value: string) =>
    updateField(field, formatCurrencyInput(value));

  const handleReset = () => {
    setForm({ ...DEFAULT_FORM, taxaUnit: form.taxaUnit, advOpen: false });
  };

  const handleDownloadCSV = () => {
    const csv = exportToCSV(result);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `juros-compostos-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Calculadora de juros compostos"
      subtitle="Simule aporte mensal, prazo e taxa para projetar seu patrimônio com a evolução mês a mês."
    >
      <div className="space-y-6">
        <ParametersCard
          form={form}
          onChange={updateField}
          onCurrency={handleCurrency}
          onToggleUnit={(unit) => setForm((prev) => ({ ...prev, taxaUnit: unit }))}
          onToggleAdvanced={(open) => setForm((prev) => ({ ...prev, advOpen: open }))}
          onReset={handleReset}
        />
        <ResultCards result={result} onDownloadCSV={handleDownloadCSV} />
        <ChartCard years={result.years} temAvancado={result.temAvancado} />
        <ScheduleTable rows={result.rows} />
      </div>
    </AppShell>
  );
}

/* ---------- Subcomponentes ---------- */

interface ParametersCardProps {
  form: FormState;
  onChange: (field: TextField, value: string) => void;
  onCurrency: (field: TextField) => (value: string) => void;
  onToggleUnit: (unit: TaxaUnit) => void;
  onToggleAdvanced: (open: boolean) => void;
  onReset: () => void;
}

function ParametersCard({
  form,
  onChange,
  onCurrency,
  onToggleUnit,
  onToggleAdvanced,
  onReset,
}: ParametersCardProps) {
  return (
    <Card className="glass border-glass-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Parâmetros do investimento</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Preencha os campos abaixo e veja a projeção em tempo real.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          Limpar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CurrencyField
            id="valorInicial"
            label="Valor inicial"
            value={form.valorInicial}
            onChange={onCurrency("valorInicial")}
          />
          <CurrencyField
            id="aporteMensal"
            label="Aporte mensal"
            value={form.aporteMensal}
            onChange={onCurrency("aporteMensal")}
          />
          <RateField
            id="taxaJuros"
            label="Taxa de juros"
            value={form.taxaJuros}
            unit={form.taxaUnit}
            onChange={(value) => onChange("taxaJuros", value)}
            onToggleUnit={onToggleUnit}
          />
          <NumberField
            id="periodo"
            label="Período (anos)"
            value={form.periodo}
            onChange={(value) => onChange("periodo", onlyDigits(value))}
            suffix="anos"
          />
        </div>

        <button
          type="button"
          onClick={() => onToggleAdvanced(!form.advOpen)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-glass-border bg-glass/60 px-4 py-3 text-left text-sm transition-colors hover:bg-glass"
        >
          <span className="flex items-center gap-2 font-medium text-foreground">
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${
                form.advOpen ? "rotate-180" : ""
              }`}
            />
            Avançado (opcional)
          </span>
          <span className="rounded-full border border-glass-border bg-background/40 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            inflação e reajuste
          </span>
        </button>

        {form.advOpen ? (
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-glass-border bg-glass/40 p-4 sm:grid-cols-2">
            <p className="col-span-full text-xs text-muted-foreground">
              Deixe em branco para não considerar. Ao preencher, o cálculo passa a exibir o
              patrimônio nominal e o patrimônio corrigido pela inflação.
            </p>
            <NumberField
              id="inflacao"
              label="Inflação anual estimada"
              value={form.inflacao}
              onChange={(value) => onChange("inflacao", value)}
              suffix="% ao ano"
              placeholder="—"
            />
            <NumberField
              id="reajusteAporte"
              label="Reajuste do aporte"
              value={form.reajusteAporte}
              onChange={(value) => onChange("reajusteAporte", value)}
              suffix="% ao ano"
              placeholder="—"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface FieldShellProps {
  id: string;
  label: string;
  suffix?: string | undefined;
  prefix?: string | undefined;
  placeholder?: string | undefined;
  inputMode?: "numeric" | "decimal" | undefined;
  children?: ReactNode;
}

function FieldShell({
  id,
  label,
  suffix,
  prefix,
  placeholder,
  inputMode = "numeric",
  children,
}: FieldShellProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass/60 px-3 transition-colors focus-within:border-primary/60">
        {prefix ? (
          <span className="text-sm font-medium text-muted-foreground">{prefix}</span>
        ) : null}
        {children ?? (
          <input
            id={id}
            type="text"
            inputMode={inputMode}
            placeholder={placeholder}
            className={inputClass}
          />
        )}
        {suffix ? (
          <span className="text-xs font-medium text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}

function CurrencyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldShell id={id} label={label} prefix="R$">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </FieldShell>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <FieldShell id={id} label={label} suffix={suffix} placeholder={placeholder}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </FieldShell>
  );
}

function RateField({
  id,
  label,
  value,
  unit,
  onChange,
  onToggleUnit,
}: {
  id: string;
  label: string;
  value: string;
  unit: TaxaUnit;
  onChange: (value: string) => void;
  onToggleUnit: (unit: TaxaUnit) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass/60 px-3 transition-colors focus-within:border-primary/60">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
        <span className="text-xs font-medium text-muted-foreground">
          {unit === "mes" ? "% ao mês" : "% ao ano"}
        </span>
      </div>
      <div className="inline-flex rounded-full border border-glass-border bg-glass/40 p-0.5 text-xs">
        {(["ano", "mes"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggleUnit(option)}
            className={`flex-1 rounded-full px-3 py-1 transition-colors ${
              unit === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option === "ano" ? "% ao ano" : "% ao mês"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultCards({
  result,
  onDownloadCSV,
}: {
  result: ReturnType<typeof simulateCompoundInterest>;
  onDownloadCSV: () => void;
}) {
  const cards: Array<{
    label: string;
    value: string;
    accent?: "primary" | "success" | "warning";
  }> = [
    { label: "Patrimônio final", value: fmtFull(result.patrimonioNominal), accent: "primary" },
    { label: "Total aportado", value: fmtFull(result.totalAportado) },
    { label: "Total em juros", value: fmtFull(result.totalJuros), accent: "success" },
  ];
  if (result.temAvancado && result.patrimonioReal !== null) {
    cards.push({
      label: "Patrimônio real (descontada inflação)",
      value: fmtFull(result.patrimonioReal),
      accent: "warning",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onDownloadCSV} variant="outline" size="sm">
          📥 Baixar CSV
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="glass border-glass-border">
            <CardContent className="flex flex-col gap-1.5 py-5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <span
                className={`text-2xl font-semibold tracking-tight tabular-nums ${
                  card.accent === "success"
                    ? "text-success"
                    : card.accent === "warning"
                      ? "text-warning"
                      : "text-primary"
                }`}
              >
                {card.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  years,
  temAvancado,
}: {
  years: ReturnType<typeof simulateCompoundInterest>["years"];
  temAvancado: boolean;
}) {
  return (
    <Card className="glass border-glass-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução do patrimônio</CardTitle>
        <p className="text-xs text-muted-foreground">
          Comparativo ano a ano entre o que foi investido e o rendimento dos juros.
        </p>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={years} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
            <XAxis
              dataKey="label"
              stroke="oklch(0.8 0.01 240)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="oklch(0.8 0.01 240)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => fmt(Number(value))}
            />
            <Tooltip
              cursor={{ fill: "oklch(1 0 0 / 4%)" }}
              contentStyle={{
                backgroundColor: "oklch(0.16 0.02 250)",
                border: "1px solid oklch(1 0 0 / 12%)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [fmtFull(Number(value)), name]}
            />
            <Bar
              dataKey="investido"
              name="Investido"
              fill="oklch(0.7 0.15 20)"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="rendimento"
              name="Rendimento"
              fill="oklch(0.78 0.12 85)"
              radius={[6, 6, 0, 0]}
            />
            {temAvancado ? (
              <Line
                type="monotone"
                dataKey="real"
                name="Patrimônio real"
                stroke="oklch(0.7 0.2 150)"
                strokeWidth={2}
                dot={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ScheduleTable({ rows }: { rows: ReturnType<typeof simulateCompoundInterest>["rows"] }) {
  const tableRef = useRef<HTMLDivElement>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!tableRef.current) return;
    if (event.key === "ArrowRight") {
      tableRef.current.scrollBy({ left: 80, behavior: "smooth" });
    } else if (event.key === "ArrowLeft") {
      tableRef.current.scrollBy({ left: -80, behavior: "smooth" });
    }
  };

  return (
    <Card className="glass border-glass-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cronograma mês a mês</CardTitle>
        <p className="text-xs text-muted-foreground">
          Detalhamento da evolução do saldo, aportes e juros ao longo do período.
        </p>
      </CardHeader>
      <CardContent>
        <div
          ref={tableRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="max-h-96 overflow-auto rounded-xl border border-glass-border focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <table className="min-w-full text-left">
            <thead>
              <tr>
                <th className={thBase}>Mês</th>
                <th className={thBase}>Aporte</th>
                <th className={thBase}>Juros do mês</th>
                <th className={thBase}>Total aportado</th>
                <th className={thBase}>Total em juros</th>
                <th className={thBase}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.m}
                  className={`transition-colors hover:bg-glass/40 ${
                    row.isReajuste ? "bg-primary/5" : ""
                  }`}
                >
                  <td className={tdBase}>{row.m}</td>
                  <td className={tdBase}>{fmtFull(row.aporte)}</td>
                  <td className={`${tdBase} text-success`}>{fmtFull(row.jurosMes)}</td>
                  <td className={tdBase}>{fmtFull(row.totalAportado)}</td>
                  <td className={`${tdBase} text-success`}>{fmtFull(row.totalJuros)}</td>
                  <td className={`${tdBase} font-semibold text-primary`}>{fmtFull(row.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
