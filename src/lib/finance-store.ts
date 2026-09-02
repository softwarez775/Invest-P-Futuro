import { useSyncExternalStore } from "react";

export type TxType = "gasto" | "receita";

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: TxType;
  category: string;
  date: string; // YYYY-MM-DD
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
};

export type FinanceState = {
  transactions: Transaction[];
  goals: Goal[];
  monthlyIncome: number | null;
  messages: ChatMessage[];
  tips: string[];
  hydrated: boolean;
};

export const CATEGORIES = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Contas",
  "Assinaturas",
  "Salário",
  "Outros",
] as const;

const STORAGE_KEY = "financas-conversa-v1";

const emptyState: FinanceState = {
  transactions: [],
  goals: [],
  monthlyIncome: null,
  messages: [],
  tips: [],
  hydrated: false,
};

function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const transaction = value as Partial<Transaction>;
  return (
    typeof transaction.id === "string" &&
    typeof transaction.description === "string" &&
    transaction.description.trim().length > 0 &&
    typeof transaction.amount === "number" &&
    Number.isFinite(transaction.amount) &&
    transaction.amount > 0 &&
    (transaction.type === "gasto" || transaction.type === "receita") &&
    typeof transaction.category === "string" &&
    typeof transaction.date === "string"
  );
}

function validTransactions(value: unknown): Transaction[] {
  return Array.isArray(value) ? value.filter(isTransaction) : [];
}

function readStorage(): FinanceState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...emptyState, hydrated: true };
    const parsed = JSON.parse(raw) as Partial<FinanceState>;
    return {
      transactions: validTransactions(parsed.transactions),
      goals: parsed.goals ?? [],
      monthlyIncome: parsed.monthlyIncome ?? null,
      messages: (parsed.messages ?? []).filter((m) => !m.pending),
      tips: parsed.tips ?? [],
      hydrated: true,
    };
  } catch {
    return { ...emptyState, hydrated: true };
  }
}

let state: FinanceState = emptyState;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage cheio ou indisponível */
  }
}

function setState(next: FinanceState, save = true) {
  state = next;
  if (save) persist();
  emit();
}

function ensureHydrated() {
  if (typeof window !== "undefined" && !hydrated) {
    hydrated = true;
    state = readStorage();
  }
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    state = readStorage();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFinance(): FinanceState {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (!hydrated) {
        hydrated = true;
        state = readStorage();
      }
      return state;
    },
    () => emptyState,
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const financeActions = {
  addTransactions(items: Omit<Transaction, "id">[]) {
    if (!items.length) return;
    ensureHydrated();
    const stored = readStorage();
    const validItems = items.filter((item) => isTransaction({ ...item, id: "pending" }));
    if (!validItems.length) return;
    setState({
      ...state,
      transactions: [
        ...validItems.map((t) => ({ ...t, id: uid() })),
        ...stored.transactions,
        ...state.transactions.filter((transaction) =>
          stored.transactions.every((saved) => saved.id !== transaction.id),
        ),
      ],
      hydrated: true,
    });
  },
  removeTransaction(id: string) {
    setState({ ...state, transactions: state.transactions.filter((t) => t.id !== id) });
  },
  addGoal(goal: Omit<Goal, "id">) {
    setState({ ...state, goals: [...state.goals, { ...goal, id: uid() }] });
  },
  updateGoalSaved(id: string, saved: number) {
    setState({
      ...state,
      goals: state.goals.map((g) => (g.id === id ? { ...g, saved: Math.max(0, saved) } : g)),
    });
  },
  removeGoal(id: string) {
    setState({ ...state, goals: state.goals.filter((g) => g.id !== id) });
  },
  setMonthlyIncome(value: number | null) {
    setState({ ...state, monthlyIncome: value });
  },
  addTips(tips: string[]) {
    const fresh = tips.filter((t) => t.trim() && !state.tips.includes(t.trim()));
    if (!fresh.length) return;
    setState({ ...state, tips: [...fresh, ...state.tips].slice(0, 30) });
  },
  addMessage(message: ChatMessage) {
    setState({ ...state, messages: [...state.messages, message] });
  },
  replaceMessage(id: string, patch: Partial<ChatMessage>) {
    setState({
      ...state,
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  },
  removeMessage(id: string) {
    setState({ ...state, messages: state.messages.filter((m) => m.id !== id) });
  },
  resetConversation() {
    setState({ ...state, messages: [] });
  },
};

/* ---------- Helpers de cálculo ---------- */

export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export const monthKey = (date: string) => date.slice(0, 7);

export function monthLabel(key: string) {
  const parts = key.split("-").map(Number);
  const d = new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function summarize(transactions: Transaction[], month?: string) {
  const filtered = month ? transactions.filter((t) => monthKey(t.date) === month) : transactions;
  const income = filtered.filter((t) => t.type === "receita").reduce((sum, t) => sum + t.amount, 0);
  const expenses = filtered.filter((t) => t.type === "gasto").reduce((sum, t) => sum + t.amount, 0);
  return { income, expenses, balance: income - expenses, count: filtered.length };
}

export function byCategory(transactions: Transaction[], month?: string) {
  const filtered = (
    month ? transactions.filter((t) => monthKey(t.date) === month) : transactions
  ).filter((t) => t.type === "gasto");
  const map = new Map<string, number>();
  for (const t of filtered) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function monthlySeries(transactions: Transaction[], months = 6) {
  const keys: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys.map((key) => {
    const s = summarize(transactions, key);
    return { month: monthLabel(key), gastos: s.expenses, receitas: s.income };
  });
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
