import { Context, SessionFlavor } from "grammy";
import { Conversation, ConversationFlavor } from "@grammyjs/conversations";

export type MySession = Record<string, never>;

export type MyContext = Context &
  SessionFlavor<MySession> &
  ConversationFlavor<Context>;
export type MyConversation = Conversation<MyContext>;
