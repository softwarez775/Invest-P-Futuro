import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  fmt,
  fmtFull,
  onlyDigits,
  percentToNumber,
} from "@/lib/compound-interest";

export const Route = createFileRoute("/calc-primeiro-milhao")({
  head: () => ({
    meta: [
      { title: "Calculadora do 1º Milhão — Invest P/ Futuro" },
      {
        name: "description",
        content:
          "Defina sua meta de R$ 1.000.000 (ou personalizada), prazo e rentabilidade e descubra quanto precisa aportar por mês, com reajuste anual pela inflação.",
      },
      { property: "og:title", content: "Calculadora do 1º Milhão — Invest P/ Futuro" },
      {
        property: "og:description",
        content: "Quanto aportar por mês para chegar ao seu primeiro milhão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalcPrimeiroMilhaoPage,
});

const STORAGE_KEY = "primeiro-milhao-form-v1";

interface FormState {
  meta: string;
  prazo: string;
  taxa: string;
  inicial: string;
  inflacao: string;
}

const DEFAULT_FORM: FormState = {
  meta: "1.000.000",
  prazo: "10",
  taxa: "13",
  inicial: "0",
  inflacao: "5",
};

function sanitizeForm(saved: Partial<FormState>): FormState {
  const str = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
  return {
    meta: str(saved.meta, DEFAULT_FORM.meta),
    prazo: str(saved.prazo, DEFAULT_FORM.prazo),
    taxa: str(saved.taxa, DEFAULT_FORM.taxa),
    inicial: str(saved.inicial, DEFAULT_FORM.inicial),
    inflacao: str(saved.inflacao, DEFAULT_FORM.inflacao),
  };
}

interface MilhaoResult {
  metaReal: number;
  metaNominalFinal: number;
  taxaMensal: number;
  aporteInicial: number;
  aporteUltimoAno: number;
  aporteSemReajuste: number;
  totalInvestido: number;
  jurosGerados: number;
  totalAportadoComReajuste: number;
  meses: number;
  rows: Array<{
    m: number;
    ano: number;
    aporte: number;
    jurosMes: number;
    saldo: number;
    totalAportado: number;
    totalJuros: number;
    isReajuste: boolean;
  }>;
  years: Array<{
    label: string;
    investido: number;
    rendimento: number;
    saldo: number;
  }>;
  temInflacao: boolean;
}

function simulateMilhao(form: FormState): MilhaoResult {
  const meta = currencyToNumber(form.meta) || 1_000_000;
  const anos = Math.max(1, parseInt(onlyDigits(form.prazo) || "0", 10) || 1);
  const taxaAnualPct = percentToNumber(form.taxa) ?? 0;
  const inicial = currencyToNumber(form.inicial) || 0;
  const inflacaoAnualPct = percentToNumber(form.inflacao);
  const temInflacao = inflacaoAnualPct !== null;

  const meses = anos * 12;
  const taxaAnual = taxaAnualPct / 100;
  const inflacaoAnual = temInflacao ? (inflacaoAnualPct as number) / 100 : 0;
  const taxaMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1;
  const inflacaoMensal = temInflacao ? Math.pow(1 + inflacaoAnual, 1 / 12) - 1 : 0;

  const metaNominalFinal = temInflacao
    ? meta * Math.pow(1 + inflacaoAnual, anos)
    : meta;
  const metaReal = meta;

  const fatorReajusteAnual = temInflacao ? 1 + inflacaoAnual : 1;

  let aporteInicialMensal = 0;
  if (taxaMensal > 0) {
    // Para uma anuidade CRESCENTE (payment grows each year by inflation rate)
    // FV = PMT × a × Σ[g^k × (1+i)^(n-12-12k)]
    // onde: a = [((1+i)^12 - 1) / i], g = 1 + inflacao, i = taxa mensal
    
    if (temInflacao && inflacaoAnual > 0) {
      // Anuidade crescente
      const g = 1 + inflacaoAnual;
      const annuityFactor = (Math.pow(1 + taxaMensal, 12) - 1) / taxaMensal;
      
      let sum = 0;
      for (let k = 0; k < anos; k++) {
        sum += Math.pow(g, k) * Math.pow(1 + taxaMensal, meses - 12 - 12 * k);
      }
      
      const fv = metaNominalFinal - inicial * Math.pow(1 + taxaMensal, meses);
      if (fv > 0 && sum > 0) {
        aporteInicialMensal = fv / (annuityFactor * sum);
      }
    } else {
      // Anuidade fixa (sem crescimento)
      const fv = metaNominalFinal - inicial * Math.pow(1 + taxaMensal, meses);
      if (fv > 0) {
        aporteInicialMensal = (fv * taxaMensal) / (Math.pow(1 + taxaMensal, meses) - 1);
      }
    }
  } else {
    aporteInicialMensal = (metaNominalFinal - inicial) / meses;
  }

  const rows: MilhaoResult["rows"] = [];
  const years: MilhaoResult["years"] = [];

  let saldo = inicial;
  let totalAportado = inicial;
  let totalJuros = 0;
  let aporteAtual = aporteInicialMensal;

  for (let m = 1; m <= meses; m++) {
    const isReajuste = temInflacao && m > 1 && (m - 1) % 12 === 0;
    if (isReajuste) {
      aporteAtual = aporteAtual * fatorReajusteAnual;
    }
    const jurosMes = saldo * taxaMensal;
    saldo = saldo + jurosMes + aporteAtual;
    totalAportado += aporteAtual;
    totalJuros += jurosMes;

    rows.push({
      m,
      ano: Math.ceil(m / 12),
      aporte: aporteAtual,
      jurosMes,
      saldo,
      totalAportado,
      totalJuros,
      isReajuste,
    });

    if (m % 12 === 0) {
      years.push({
        label: `${m / 12}º ano`,
        investido: totalAportado,
        rendimento: totalJuros,
        saldo,
      });
    }
  }

  const aporteUltimoAno = aporteInicialMensal * Math.pow(fatorReajusteAnual, Math.max(0, anos - 1));

  let aporteSemReajuste = 0;
  if (taxaMensal > 0) {
    const fv = metaNominalFinal - inicial * Math.pow(1 + taxaMensal, meses);
    if (fv > 0) {
      aporteSemReajuste = (fv * taxaMensal) / (Math.pow(1 + taxaMensal, meses) - 1);
    }
  } else {
    aporteSemReajuste = (metaNominalFinal - inicial) / meses;
  }

  return {
    metaReal,
    metaNominalFinal,
    taxaMensal,
    aporteInicial: aporteInicialMensal,
    aporteUltimoAno,
    aporteSemReajuste,
    totalInvestido: totalAportado,
    jurosGerados: totalJuros,
    totalAportadoComReajuste: totalAportado,
    meses,
    rows,
    years,
    temInflacao,
  };
}

const inputClass =
  "w-full bg-transparent py-3 text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground/40";

const thBase =
  "sticky top-0 z-10 border-b border-glass-border bg-card px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider whitespace-nowrap text-muted-foreground";

const tdBase = "border-b border-glass-border px-3 py-2 text-xs whitespace-nowrap";

function CalcPrimeiroMilhaoPage() {
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
      /* ignore */
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form, hydrated]);

  const result = useMemo(() => simulateMilhao(form), [form]);

  const updateField = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleCurrency = (field: keyof FormState) => (value: string) => updateField(field, value);

  const handleReset = () => setForm({ ...DEFAULT_FORM });

  return (
    <AppShell
      title="Calculadora do 1º Milhão"
      subtitle="Defina sua meta, prazo e rentabilidade esperada. A calculadora reajusta o aporte pela inflação a cada ano."
    >
      <div className="space-y-6">
        <ParametersCard
          form={form}
          onChange={updateField}
          onCurrency={handleCurrency}
          onReset={handleReset}
        />
        <HighlightCards result={result} />
        <ResultCards result={result} />
        <ChartCard years={result.years} />
        <ScheduleTable rows={result.rows} />
      </div>
    </AppShell>
  );
}

interface ParametersCardProps {
  form: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  onCurrency: (field: keyof FormState) => (value: string) => void;
  onReset: () => void;
}

function ParametersCard({ form, onChange, onCurrency, onReset }: ParametersCardProps) {
  return (
    <Card className="glass border-glass-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Parâmetros da simulação</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Preencha os campos abaixo e veja a projeção em tempo real.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          Limpar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldCurrency
            id="meta"
            label="Meta (poder de compra de hoje)"
            value={form.meta}
            onChange={onCurrency("meta")}
          />
          <FieldNumber
            id="prazo"
            label="Prazo (anos)"
            value={form.prazo}
            onChange={(v) => onChange("prazo", onlyDigits(v))}
            suffix="anos"
          />
          <FieldNumber
            id="taxa"
            label="Rentabilidade anual (sua hipótese)"
            value={form.taxa}
            onChange={(v) => onChange("taxa", v)}
            suffix="% ao ano"
          />
          <FieldCurrency
            id="inicial"
            label="Patrimônio inicial"
            value={form.inicial}
            onChange={onCurrency("inicial")}
          />
          <div className="sm:col-span-2">
            <FieldNumber
              id="inflacao"
              label="Inflação anual estimada"
              value={form.inflacao}
              onChange={(v) => onChange("inflacao", v)}
              suffix="% ao ano"
              placeholder="—"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
}

function FieldShell({
  id,
  label,
  suffix,
  children,
}: {
  id: string;
  label: string;
  suffix?: string;
  children: React.ReactNode;
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
        {suffix !== undefined ? null : null}
        <span className="text-sm font-medium text-muted-foreground">R$</span>
        {children}
        {suffix ? (
          <span className="text-xs font-medium text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}

function FieldCurrency({ id, label, value, onChange }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass/60 px-3 transition-colors focus-within:border-primary/60">
        <span className="text-sm font-medium text-muted-foreground">R$</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function FieldNumber({ id, label, value, onChange, suffix, placeholder }: FieldProps) {
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
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        {suffix ? (
          <span className="text-xs font-medium text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}

function HighlightCards({ result }: { result: MilhaoResult }) {
  return (
    <Card className="glass border-glass-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Meta corrigida</CardTitle>
        <p className="text-xs text-muted-foreground">
          {result.temInflacao
            ? `Valor nominal ao final do prazo considerando a inflação informada`
            : "Sem reajuste de inflação considerado"}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {fmtFull(result.metaNominalFinal)}
          </span>
          <span className="text-xs text-muted-foreground">
            equivale ao poder de compra da sua meta hoje
          </span>
        </div>
        <div className="rounded-xl border border-glass-border bg-glass/40 p-3 text-xs text-muted-foreground">
          {result.temInflacao ? (
            <>
              Seu aporte começa em{" "}
              <span className="font-semibold text-foreground">{fmtFull(result.aporteInicial)}</span>{" "}
              e sobe {((result.temInflacao ? 1 : 0) as unknown) ? "" : ""}
              pela inflação todo ano. No último ano você aporta{" "}
              <span className="font-semibold text-foreground">
                {fmtFull(result.aporteUltimoAno)}
              </span>
              .
            </>
          ) : (
            <>
              Sem reajuste de inflação, o aporte mensal necessário é{" "}
              <span className="font-semibold text-foreground">{fmtFull(result.aporteInicial)}</span>
              .
            </>
          )}
        </div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Taxa mensal equivalente:{" "}
          <span className="text-foreground">
            {result.taxaMensal > 0 ? `${(result.taxaMensal * 100).toFixed(4)}% ao mês` : "—"}
          </span>{" "}
          · calculado como (1 + taxa anual)^(1/12) − 1
        </p>
      </CardContent>
    </Card>
  );
}

function ResultCards({ result }: { result: MilhaoResult }) {
  const cards: Array<{
    label: string;
    value: string;
    accent?: "primary" | "success" | "warning";
  }> = [
    {
      label: "Aporte inicial (Mês 1)",
      value: fmtFull(result.aporteInicial),
      accent: "primary",
    },
    {
      label: "Aporte no último ano",
      value: fmtFull(result.aporteUltimoAno),
    },
    {
      label: "Sem reajuste seria",
      value: fmtFull(result.aporteSemReajuste),
      accent: "warning",
    },
    {
      label: "Total investido",
      value: fmtFull(result.totalInvestido),
    },
    {
      label: "Juros gerados",
      value: fmtFull(result.jurosGerados),
      accent: "success",
    },
    {
      label: "Total aportado",
      value: fmtFull(result.totalAportadoComReajuste),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}

function ChartCard({ years }: { years: MilhaoResult["years"] }) {
  return (
    <Card className="glass border-glass-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução mês a mês</CardTitle>
        <p className="text-xs text-muted-foreground">
          Comparativo ano a ano entre o total aportado e o rendimento acumulado.
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
              name="Total aportado"
              fill="oklch(0.7 0.15 20)"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="rendimento"
              name="Juros"
              fill="oklch(0.78 0.12 85)"
              radius={[6, 6, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              name="Patrimônio"
              stroke="oklch(0.7 0.2 150)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ScheduleTable({ rows }: { rows: MilhaoResult["rows"] }) {
  return (
    <Card className="glass border-glass-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cronograma mês a mês</CardTitle>
        <p className="text-xs text-muted-foreground">
          Detalhamento da evolução do saldo, aporte mensal e juros ao longo do período.
        </p>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-auto rounded-xl border border-glass-border">
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
