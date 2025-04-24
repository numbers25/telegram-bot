import { MyContext } from "./types";
import { prisma } from "./prisma";

export async function ensureEntities(ctx: MyContext) {
  let chat;
  let user;
  if (ctx.chat) {
    chat = await prisma.chat.upsert({
      where: { telegramChatId: ctx.chat.id.toString() },
      update: {
        title: ctx.chat.title ?? undefined,
      },
      create: {
        telegramChatId: ctx.chat.id.toString(),
        title: ctx.chat.title,
      },
    });
  }

  if (ctx.from) {
    user = await prisma.user.upsert({
      where: { telegramUserId: ctx.from.id.toString() },
      update: {
        username: ctx.from.username ?? undefined,
        firstName: ctx.from.first_name ?? undefined,
        lastName: ctx.from.last_name ?? undefined,
      },
      create: {
        telegramUserId: ctx.from.id.toString(),
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      },
    });
  }
  return { chat, user };
}
