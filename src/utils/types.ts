import { Context, SessionFlavor } from "grammy";
import { Conversation, ConversationFlavor } from "@grammyjs/conversations";

export type MySession = {
  votes: Record<string, number>;
};

export type MyContext = Context &
  SessionFlavor<MySession> &
  ConversationFlavor<Context>;
export type MyConversation = Conversation<MyContext>;
