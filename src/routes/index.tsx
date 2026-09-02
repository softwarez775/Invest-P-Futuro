import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChatPanel } from "@/components/ChatPanel";
import { brl, currentMonthKey, summarize, useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Invest P/ Futuro — organize seu dinheiro conversando" },
      {
        name: "description",
        content:
          "Registre gastos, crie metas e receba dicas de economia escrevendo em linguagem natural. Sem planilhas, sem formulários.",
      },
      { property: "og:title", content: "Invest P/ Futuro — organize seu dinheiro conversando" },
      {
        property: "og:description",
        content: "Controle financeiro por conversa: você escreve, a Monys organiza.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { transactions } = useFinance();
  const month = summarize(transactions, currentMonthKey());

  return (
    <AppShell
      title="Conte o que você gastou"
      subtitle="Escreva do jeito que vier na cabeça. A Monys entende, classifica e guarda tudo — só neste aparelho."
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Gastos do mês" value={brl(month.expenses)} tone="destructive" />
        <Stat label="Entradas do mês" value={brl(month.income)} tone="success" />
        <Stat
          label="Saldo do mês"
          value={brl(month.balance)}
          tone={month.balance >= 0 ? "success" : "destructive"}
        />
      </div>
      <ChatPanel />
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "success" | "destructive";
}) {
  const toneClass = {
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
  }[tone];

  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
