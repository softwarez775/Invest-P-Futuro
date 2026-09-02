export type AgentContext = {
  monthlyIncome: number | null;
  today: string;
  monthExpenses: number;
  monthIncome: number;
  topCategories: { category: string; total: number }[];
  goals: { name: string; target: number; saved: number; deadline: string | null }[];
  recent: { description: string; amount: number; type: string; category: string; date: string }[];
};

export type AgentTurn = { role: "user" | "assistant"; content: string };

export type AgentResult = {
  reply: string;
  transactions: {
    description: string;
    amount: number;
    type: "gasto" | "receita";
    category: string;
    date: string;
  }[];
  goals: { name: string; target: number; saved: number; deadline: string | null }[];
  tips: string[];
  monthlyIncome: number | null;
};

const CATEGORIES = [
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
];

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "transactions", "goals", "tips", "monthlyIncome"],
  properties: {
    reply: { type: "string" },
    transactions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "amount", "type", "category", "date"],
        properties: {
          description: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["gasto", "receita"] },
          category: { type: "string", enum: CATEGORIES },
          date: { type: "string", description: "AAAA-MM-DD" },
        },
      },
    },
    goals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "target", "saved", "deadline"],
        properties: {
          name: { type: "string" },
          target: { type: "number" },
          saved: { type: "number" },
          deadline: { type: ["string", "null"] },
        },
      },
    },
    tips: { type: "array", items: { type: "string" } },
    monthlyIncome: { type: ["number", "null"] },
  },
} as const;

function systemPrompt(ctx: AgentContext) {
  return [
    "Você é a Monys, agente financeira brasileira de um app de finanças pessoais por conversa.",
    "Fale sempre em português do Brasil, com linguagem simples, acolhedora e sem jargão técnico.",
    "Sua função: entender o que a pessoa contou em linguagem natural e transformar em registros.",
    'Responda somente com um JSON válido neste formato: {"reply":"string","transactions":[],"goals":[],"tips":[],"monthlyIncome":null}.',
    "",
    "Regras:",
    "- Quando a pessoa citar um gasto ou uma entrada de dinheiro, devolva cada item em `transactions` com valor positivo em reais, categoria da lista permitida e data no formato AAAA-MM-DD.",
    `- Hoje é ${ctx.today}. Interprete 'hoje', 'ontem', 'sexta passada' com base nisso.`,
    "- Se a pessoa não citar nenhum gasto novo, devolva `transactions` vazio. Nunca invente valores nem repita gastos já registrados.",
    "- Quando ela definir uma meta (viagem, reserva de emergência, comprar algo), devolva em `goals` com valor alvo e o quanto já guardou (0 se não disser).",
    "- Se ela disser quanto ganha por mês, preencha `monthlyIncome`; senão devolva null.",
    "- Em `tips` inclua no máximo 2 dicas curtas de economia ou investimento, práticas e ligadas aos dados dela. Vazio quando não fizer sentido.",
    "- Você também deve incluir cotações atualizadas (aproximadas ou fictícias se não tiver acesso a dados reais em tempo real, mas mantenha-as realistas) do Dólar, Bitcoin (sempre descrevendo o valor tanto em Dólar quanto em Reais) e taxas do Tesouro Direto (Selic, IPCA+ curto/médio/longo prazo) se a pessoa perguntar sobre investimentos ou se for relevante para as dicas.",
    "- Se a pessoa perguntar sobre onde investir ou como começar, analise o perfil de investidor dela (conservador, moderado ou agressivo) com base nos objetivos e tolerância ao risco citada e sugira opções em renda fixa, variável e criptomoedas de acordo com esse perfil.",
    "- `reply` é a sua resposta no chat: confirme o que registrou (com valores), comente algo útil (incluindo dicas de investimento e cotações se solicitado) e faça no máximo uma pergunta. Use markdown leve e no máximo 5 linhas.",
    "",
    "Situação atual da pessoa:",
    `- Renda mensal informada: ${ctx.monthlyIncome ? `R$ ${ctx.monthlyIncome}` : "não informada"}`,
    `- Neste mês: gastos R$ ${ctx.monthExpenses.toFixed(2)}, entradas R$ ${ctx.monthIncome.toFixed(2)}`,
    `- Maiores categorias do mês: ${
      ctx.topCategories.map((c) => `${c.category} R$ ${c.total.toFixed(2)}`).join(", ") || "nenhuma"
    }`,
    `- Metas: ${
      ctx.goals.map((g) => `${g.name} (guardou R$ ${g.saved} de R$ ${g.target})`).join("; ") ||
      "nenhuma"
    }`,
    `- Últimos registros: ${
      ctx.recent
        .map((t) => `${t.date} ${t.description} ${t.type} R$ ${t.amount} (${t.category})`)
        .join("; ") || "nenhum"
    }`,
  ].join("\n");
}

export async function runFinanceAgent(input: {
  messages: AgentTurn[];
  context: AgentContext;
}): Promise<AgentResult> {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) throw new Error("Configuração da IA ausente (GROQ_API_KEY).");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt(input.context) },
        ...input.messages.slice(-20),
      ],
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: { name: "finance_agent", strict: true, schema },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`A Groq recusou a solicitação (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("A IA não retornou conteúdo.");
  }
  const parsed = JSON.parse(raw) as AgentResult;
  const goals = (parsed.goals ?? [])
    .map((goal) => ({
      name: goal.name?.trim(),
      target: goal.target,
      saved: goal.saved,
      deadline: goal.deadline ?? null,
    }))
    .filter(
      (goal): goal is { name: string; target: number; saved: number; deadline: string | null } =>
        Boolean(goal.name) && typeof goal.target === "number" && goal.target > 0,
    );
  return {
    reply: parsed.reply ?? "",
    transactions: (parsed.transactions ?? []).filter((t) => t.amount > 0),
    goals,
    tips: parsed.tips ?? [],
    monthlyIncome:
      typeof parsed.monthlyIncome === "number" && parsed.monthlyIncome > 0
        ? parsed.monthlyIncome
        : null,
  };
}
