import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runFinanceAgent } from "./finance-agent.server";

const InputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
  context: z.object({
    monthlyIncome: z.number().nullable(),
    today: z.string(),
    monthExpenses: z.number(),
    monthIncome: z.number(),
    topCategories: z.array(z.object({ category: z.string(), total: z.number() })),
    goals: z.array(
      z.object({
        name: z.string(),
        target: z.number(),
        saved: z.number(),
        deadline: z.string().nullable(),
      }),
    ),
    recent: z.array(
      z.object({
        description: z.string(),
        amount: z.number(),
        type: z.string(),
        category: z.string(),
        date: z.string(),
      }),
    ),
  }),
});

export const chatWithAgent = createServerFn({ method: "POST" })
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => runFinanceAgent(data));
