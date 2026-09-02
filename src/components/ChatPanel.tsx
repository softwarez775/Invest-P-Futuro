import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { chatWithAgent } from "@/lib/finance-agent.functions";
import {
  brl,
  byCategory,
  currentMonthKey,
  financeActions,
  summarize,
  uid,
  useFinance,
} from "@/lib/finance-store";
import logo from "@/assets/logo-monys.png";

const SUGESTOES = [
  "Gastei 32 reais no almoço hoje",
  "Recebi meu salário de 3.500 reais",
  "Quero juntar 5 mil para uma viagem em dezembro",
  "Onde eu mais gastei este mês?",
];

export function ChatPanel() {
  const { messages, transactions, goals, monthlyIncome } = useFinance();
  const callAgent = useServerFn(chatWithAgent);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || busy) return;

    setText("");
    setBusy(true);
    financeActions.addMessage({ id: uid(), role: "user", text: trimmed });
    const pendingId = uid();
    financeActions.addMessage({ id: pendingId, role: "assistant", text: "", pending: true });

    const month = currentMonthKey();
    const monthSummary = summarize(transactions, month);

    try {
      const history = [
        ...messages
          .filter((m) => !m.pending && m.text)
          .map((m) => ({ role: m.role, content: m.text })),
        { role: "user" as const, content: trimmed },
      ];

      const result = await callAgent({
        data: {
          messages: history,
          context: {
            monthlyIncome,
            today: new Date().toISOString().slice(0, 10),
            monthExpenses: monthSummary.expenses,
            monthIncome: monthSummary.income,
            topCategories: byCategory(transactions, month)
              .slice(0, 5)
              .map((c) => ({ category: c.category, total: c.total })),
            goals: goals.map((g) => ({
              name: g.name,
              target: g.target,
              saved: g.saved,
              deadline: g.deadline,
            })),
            recent: transactions.slice(0, 12).map((t) => ({
              description: t.description,
              amount: t.amount,
              type: t.type,
              category: t.category,
              date: t.date,
            })),
          },
        },
      });

      financeActions.replaceMessage(pendingId, { text: result.reply, pending: false });

      if (result.transactions.length) {
        financeActions.addTransactions(result.transactions);
        const total = result.transactions.reduce(
          (sum, t) => sum + (t.type === "gasto" ? t.amount : 0),
          0,
        );
        toast.success(
          `${result.transactions.length} registro(s) salvos${total ? ` · ${brl(total)} em gastos` : ""}`,
        );
      }
      for (const goal of result.goals) {
        const goalName = typeof goal.name === "string" ? goal.name.trim() : "";
        if (!goalName || typeof goal.target !== "number" || goal.target <= 0) continue;
        const existing = goals.find((g) => g.name.toLowerCase().trim() === goalName.toLowerCase());
        if (existing) {
          financeActions.updateGoalSaved(existing.id, Math.max(existing.saved, goal.saved));
        } else {
          financeActions.addGoal({
            name: goalName,
            target: goal.target,
            saved: goal.saved,
            deadline: goal.deadline,
          });
          toast.success(`Meta "${goalName}" criada`);
        }
      }
      if (result.tips.length) financeActions.addTips(result.tips);
      if (result.monthlyIncome && result.monthlyIncome !== monthlyIncome) {
        financeActions.setMonthlyIncome(result.monthlyIncome);
      }
    } catch (error) {
      financeActions.removeMessage(pendingId);
      const message = error instanceof Error ? error.message : "Não consegui responder agora.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="glass-strong flex h-[calc(100vh-19rem)] min-h-[26rem] flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between gap-3 border-b border-glass-border px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Monys, sua agente financeira" className="size-8 rounded-lg" />
          <div>
            <p className="text-sm font-semibold">Monys</p>
            <p className="text-xs text-muted-foreground">
              {busy ? "escrevendo..." : "sua agente financeira"}
            </p>
          </div>
        </div>
        {!empty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => financeActions.resetConversation()}
            className="text-muted-foreground"
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Nova conversa
          </Button>
        )}
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="gap-1">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <img src={logo} alt="" className="size-16 rounded-2xl shadow-glow" aria-hidden />
              <div>
                <p className="font-display text-lg font-semibold">Me conta seu dia financeiro</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Escreva como você falaria com um amigo. Eu organizo os valores, as categorias e as
                  suas metas por você.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) =>
              message.pending ? (
                <Message from="assistant" key={message.id} className="max-w-[85%]">
                  <MessageContent className="glass border border-primary/10 bg-card/50 p-4">
                    <Shimmer>Organizando seus números...</Shimmer>
                  </MessageContent>
                </Message>
              ) : (
                <div key={message.id} className="flex flex-col gap-2">
                  <Message from={message.role} className="max-w-[85%]">
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "bg-gradient-primary font-medium text-primary-foreground shadow-sm"
                          : "glass border border-primary/10 bg-card/50 p-4 text-foreground shadow-sm"
                      }
                    >
                      <MessageResponse>{message.text}</MessageResponse>
                    </MessageContent>
                  </Message>
                </div>
              ),
            )
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="space-y-3 border-t border-primary/10 p-4">
        <div className="flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => void send(s)}
              className="glass rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <PromptInput
          onSubmit={(message, event) => {
            event.preventDefault();
            void send(message.text || text);
          }}
          className="rounded-2xl"
        >
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            placeholder="Ex: gastei 89 no mercado e 25 no uber ontem"
            disabled={busy}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={busy ? "submitted" : "ready"}
              disabled={busy || !text.trim()}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
