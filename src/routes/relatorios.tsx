import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  brl,
  byCategory,
  currentMonthKey,
  financeActions,
  monthlySeries,
  summarize,
  useFinance,
} from "@/lib/finance-store";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios do mês — Invest P/ Futuro" },
      {
        name: "description",
        content:
          "Veja seus gastos por categoria, a evolução dos últimos meses e o histórico completo das transações registradas por conversa.",
      },
      { property: "og:title", content: "Relatórios do mês — Invest P/ Futuro" },
      {
        property: "og:description",
        content: "Gastos por categoria, evolução mensal e histórico das suas transações.",
      },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { transactions, hydrated } = useFinance();
  const month = currentMonthKey();
  const resumo = summarize(transactions, month);
  const categorias = byCategory(transactions, month);
  const serie = monthlySeries(transactions, 6);
  const maiorSerie = Math.max(1, ...serie.map((s) => Math.max(s.gastos, s.receitas)));

  return (
    <AppShell
      title="Seus relatórios"
      subtitle="Um resumo direto do que entrou, do que saiu e de onde o seu dinheiro está indo."
    >
      {!hydrated ? (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <BarChart3 className="size-8 animate-pulse text-primary" />
          <p className="font-display text-lg font-semibold">Carregando seus dados</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <BarChart3 className="size-8 text-primary" />
          <p className="font-display text-lg font-semibold">Sem dados por enquanto</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Registre alguns gastos na conversa e os relatórios aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card label="Gastos do mês" value={brl(resumo.expenses)} className="text-destructive" />
            <Card label="Entradas do mês" value={brl(resumo.income)} className="text-success" />
            <Card
              label="Saldo do mês"
              value={brl(resumo.balance)}
              className={resumo.balance >= 0 ? "text-success" : "text-destructive"}
            />
          </div>

          <section className="glass space-y-3 rounded-3xl p-5">
            <h2 className="font-display text-lg font-semibold">Gastos por categoria</h2>
            {categorias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum gasto neste mês.</p>
            ) : (
              <ul className="space-y-3">
                {categorias.map((c) => (
                  <li key={c.category} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span>{c.category}</span>
                      <span className="text-muted-foreground">{brl(c.total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-primary"
                        style={{
                          width: `${(c.total / (categorias[0]?.total || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass space-y-4 rounded-3xl p-5">
            <h2 className="font-display text-lg font-semibold">Últimos 6 meses</h2>
            <div className="flex items-end gap-3">
              {serie.map((s) => (
                <div key={s.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end justify-center gap-1">
                    <div
                      className="w-3 rounded-t bg-destructive/70"
                      style={{ height: `${(s.gastos / maiorSerie) * 100}%` }}
                      title={`Gastos: ${brl(s.gastos)}`}
                    />
                    <div
                      className="w-3 rounded-t bg-success/70"
                      style={{ height: `${(s.receitas / maiorSerie) * 100}%` }}
                      title={`Receitas: ${brl(s.receitas)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{s.month}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Barra rosa = gastos · barra verde = receitas
            </p>
          </section>

          <section className="glass space-y-2 rounded-3xl p-5">
            <h2 className="font-display text-lg font-semibold">Histórico</h2>
            <ul className="divide-y divide-glass-border">
              {transactions.slice(0, 40).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.category} · {t.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        t.type === "gasto" ? "text-destructive" : "text-success"
                      }`}
                    >
                      {t.type === "gasto" ? "-" : "+"}
                      {brl(t.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remover ${t.description}`}
                      onClick={() => financeActions.removeTransaction(t.id)}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Card({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${className || "text-primary"}`}>
        {value}
      </p>
    </div>
  );
}
