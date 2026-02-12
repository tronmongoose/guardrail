import { z } from "zod";
import {
  ActionSchema,
  SessionSchema,
  WeekSchema,
  ProgramDraftSchema,
  ActionTypeSchema,
  PacingModeSchema,
  ProgramStatusSchema,
  ProgramListItemSchema,
} from "./schemas";

export type ActionType = z.infer<typeof ActionTypeSchema>;
export type PacingMode = z.infer<typeof PacingModeSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Week = z.infer<typeof WeekSchema>;
export type ProgramDraft = z.infer<typeof ProgramDraftSchema>;
export type ProgramStatus = z.infer<typeof ProgramStatusSchema>;
export type ProgramListItem = z.infer<typeof ProgramListItemSchema>;
