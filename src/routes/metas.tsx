import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { brl, financeActions, useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Metas financeiras — Invest P/ Futuro" },
      {
        name: "description",
        content:
          "Acompanhe o progresso das suas metas de economia: quanto já guardou, quanto falta e o prazo de cada objetivo.",
      },
      { property: "og:title", content: "Metas financeiras — Invest P/ Futuro" },
      {
        property: "og:description",
        content: "Veja quanto falta para cada objetivo e mantenha o ritmo das suas economias.",
      },
    ],
  }),
  component: MetasPage,
});

function MetasPage() {
  const { goals } = useFinance();

  return (
    <AppShell
      title="Suas metas"
      subtitle="Peça na conversa (“quero juntar 5 mil até dezembro”) e a meta aparece aqui automaticamente."
    >
      {goals.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <Banknote className="size-8 text-primary" />
          <p className="font-display text-lg font-semibold">Nenhuma meta ainda</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Fale com a Monys sobre um objetivo e ela cria a meta com valor e prazo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
            return (
              <div key={goal.id} className="glass space-y-3 rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="glass flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Banknote className="size-5" />
                    </div>
                    <div>
                      <p className="font-display text-lg font-semibold text-primary">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {goal.deadline ? `Prazo: ${goal.deadline}` : "Sem prazo definido"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remover meta ${goal.name}`}
                    onClick={() => financeActions.removeGoal(goal.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-primary">{brl(goal.saved)}</span>
                  <span className="text-muted-foreground">de {brl(goal.target)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pct >= 100
                    ? "Meta concluída 🎉"
                    : `Faltam ${brl(Math.max(0, goal.target - goal.saved))} (${Math.round(pct)}% feito)`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
