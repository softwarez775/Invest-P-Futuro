import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb, TrendingUp, Banknote, RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useFinance } from "@/lib/finance-store";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getMarketRates } from "@/lib/market.functions";

const MARKET_QUERIES = queryOptions({
  queryKey: ["market-rates"],
  queryFn: () => getMarketRates(),
  refetchInterval: 1000 * 60 * 5, // 5 minutes
});

const BASE = [
  "Separe o valor da meta no começo do mês, antes de gastar o resto.",
  "Perfil Conservador: Foco em Renda Fixa (Tesouro Selic, CDBs) para segurança e liquidez.",
  "Perfil Moderado: Equilíbrio entre Renda Fixa e uma parcela pequena em FIIs ou Ações de dividendos.",
  "Perfil Agressivo: Maior exposição em Renda Variável (Ações, ETFs) e uma pequena parte em Cripto (BTC, ETH).",
  "Revise assinaturas: cancelar uma que você não usa já rende economia todo mês.",
  "Antes de compras acima de R$ 200, espere 24 horas e reavalie.",
];

// Os indicadores de taxas são agora dinâmicos via marketData.taxes

export const Route = createFileRoute("/dicas")({
  head: () => ({
    meta: [
      { title: "Dicas de economia — Invest P/ Futuro" },
      {
        name: "description",
        content:
          "Dicas de economia personalizadas pela Monys a partir dos seus gastos, além de hábitos práticos para sobrar mais dinheiro no fim do mês.",
      },
      { property: "og:title", content: "Dicas de economia — Invest P/ Futuro" },
      {
        property: "og:description",
        content: "Sugestões personalizadas para gastar melhor e alcançar suas metas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(MARKET_QUERIES),
  component: DicasPage,
});

function DicasPage() {
  const { tips } = useFinance();
  const { data: marketData, isFetching } = useSuspenseQuery(MARKET_QUERIES);

  const allIndicators = [
    {
      name: "Dólar (USD/BRL)",
      value: marketData.usd.value,
      change: marketData.usd.change,
      icon: TrendingUp,
    },
    { name: "Tesouro Selic", value: marketData.taxes.selic, change: "Atualizado", icon: Banknote },
    {
      name: "Bitcoin (BTC)",
      value: marketData.btc.value,
      change: marketData.btc.change,
      icon: TrendingUp,
    },
  ];

  return (
    <AppShell
      title="Dicas para sobrar mais"
      subtitle="Conforme você conversa, a Monys guarda aqui as sugestões feitas com base nos seus próprios gastos."
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Mercado Financeiro Hoje</h2>
            {isFetching && <RefreshCcw className="size-4 animate-spin text-primary/40" />}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allIndicators.map((item) => (
              <div
                key={item.name}
                className={`glass group relative overflow-hidden rounded-2xl p-4 transition-all hover:border-primary/30 ${
                  item.name === "Tesouro Selic"
                    ? "lg:col-start-2 lg:row-start-2"
                    : item.name === "Bitcoin (BTC)"
                      ? "lg:col-start-3 lg:row-start-1"
                      : "lg:col-start-1 lg:row-start-1"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {item.name}
                  </span>
                  <div className="rounded-lg bg-primary/10 p-1">
                    <item.icon className="size-4 text-primary" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="whitespace-pre-line text-xl font-bold leading-tight font-display">
                    {item.value}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      item.change.startsWith("+") || parseFloat(item.change.replace(",", ".")) > 0
                        ? "text-[#22c55e]"
                        : item.change.startsWith("-") ||
                            parseFloat(item.change.replace(",", ".")) < 0
                          ? "text-rose-400"
                          : "text-primary/70"
                    }`}
                  >
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Da Monys, para você</h2>
          {tips.length === 0 ? (
            <div className="glass flex w-full flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center">
              <Lightbulb className="size-8 text-primary" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Ainda não há dicas personalizadas. Registre alguns gastos na conversa e elas
                aparecem aqui.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {tips.map((tip) => (
                <li key={tip} className="glass rounded-2xl p-4 text-sm">
                  <Lightbulb className="mb-2 size-4 text-primary" />
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Hábitos que sempre funcionam</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {BASE.map((tip) => (
              <li key={tip} className="glass rounded-2xl p-4 text-sm text-muted-foreground">
                {tip}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
