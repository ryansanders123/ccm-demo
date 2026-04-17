import { z } from "zod";

const uuid = z.string().uuid();
const amount = z.string().regex(/^\d+(\.\d{1,2})?$/, "amount must have at most 2 decimals")
  .refine(v => parseFloat(v) > 0, "amount must be > 0")
  .refine(v => parseFloat(v) <= 99999999.99, "amount too large");

export const donationInputSchema = z.object({
  donee_id: uuid,
  fund_id: uuid,
  type: z.enum(["cash", "check", "online"]),
  amount,
  date_received: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_number: z.string().trim().min(1).max(50).optional(),
  reference_id: z.string().trim().min(1).max(100).optional(),
  note: z.string().trim().max(1000).optional(),
}).superRefine((v, ctx) => {
  if (v.type === "check" && !v.check_number) ctx.addIssue({ code: "custom", message: "check_number required for checks", path: ["check_number"] });
  if (v.type !== "check" && v.check_number)  ctx.addIssue({ code: "custom", message: "check_number only allowed for checks", path: ["check_number"] });
  if (v.type === "online" && !v.reference_id) ctx.addIssue({ code: "custom", message: "reference_id required for online", path: ["reference_id"] });
  if (v.type !== "online" && v.reference_id)  ctx.addIssue({ code: "custom", message: "reference_id only allowed for online", path: ["reference_id"] });
});

export const voidInputSchema = z.object({
  id: uuid,
  reason: z.string().trim().min(1).max(500),
});

export const inviteInputSchema = z.object({
  email: z.string().email().max(320),
});

export const doneeInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
});

export const fundInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
