import { Link } from "@tanstack/react-router";
import { MessageSquare, Banknote, BarChart3, Lightbulb, Calculator, Coins } from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/logo-monys.png";

const NAV = [
  { to: "/", label: "Conversa", icon: MessageSquare },
  { to: "/metas", label: "Metas", icon: Banknote },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/dicas", label: "Dicas", icon: Lightbulb },
  { to: "/calc-juros", label: "Calc Juros", icon: Calculator },
  { to: "/calc-primeiro-milhao", label: "Calc 1ºM", icon: Coins },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="Monys, agente financeira do app"
              className="size-9 rounded-xl shadow-glow"
            />
            <span className="font-display text-base font-semibold tracking-tight text-foreground">
              Invest P/ Futuro
            </span>
          </Link>
          <nav className="glass hidden items-center gap-1 rounded-full p-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-[oklch(0.4_0.15_150)]"
                activeProps={{
                  className:
                    "rounded-full px-3.5 py-1.5 text-sm bg-primary text-primary-foreground font-semibold flex items-center gap-1.5",
                }}
                activeOptions={{ exact: item.to === "/" }}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:pb-12">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-glass-border bg-background/85 backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-6">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground transition-colors hover:text-[oklch(0.4_0.15_150)]"
              activeProps={{
                className:
                  "flex flex-col items-center gap-1 py-3 text-xs text-primary-foreground bg-primary rounded-lg",
              }}
              activeOptions={{ exact: item.to === "/" }}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
