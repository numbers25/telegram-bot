// src/commands/newPoll.ts
import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";
import { isAdmin } from "../utils/isAdmin";
import { schedulePollNotifications } from "../utils/broadcast";
import { ensureEntities } from "../utils/ensureEntities";

export async function newPoll(
  conv: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  const { chat } = await ensureEntities(ctx);
  if (!chat) {
    return ctx.reply("🚫 Unable to identify this chat.");
  }

  if (!ctx.from || !isAdmin(ctx.from.id)) {
    return ctx.reply("🚫 Only admins can start a new poll.");
  }

  await ctx.reply(
    "🗓️ When should book suggestions close? (Reply with YYYY-MM-DDTHH:mm)"
  );
  const sugMsg = await conv.wait();
  const suggestionEnd = new Date(sugMsg.message?.text || "");
  if (isNaN(suggestionEnd.getTime())) {
    return ctx.reply(
      "❗ That wasn’t a valid date/time. Please use YYYY-MM-DDTHH:mm."
    );
  }

  await ctx.reply("🗳️ When should voting close? (Reply with YYYY-MM-DDTHH:mm)");
  const voteMsg = await conv.wait();
  const votingEnd = new Date(voteMsg.message?.text || "");
  if (isNaN(votingEnd.getTime()) || votingEnd <= suggestionEnd) {
    return ctx.reply(
      "❗ Voting end must be a valid date/time _after_ suggestions close."
    );
  }

  await ctx.reply(
    "📖 When should the reading period end? (Reply with YYYY-MM-DDTHH:mm)"
  );
  const readMsg = await conv.wait();
  const readingEnd = new Date(readMsg.message?.text || "");
  if (isNaN(readingEnd.getTime()) || readingEnd <= votingEnd) {
    return ctx.reply(
      "❗ Reading end must be a valid date/time _after_ voting closes."
    );
  }

  await ctx.reply("Give the poll a name:");
  const nameMsg = await conv.wait();
  const name = nameMsg.message?.text?.trim();
  if (!name) {
    return ctx.reply("❗ Poll name cannot be empty.");
  }

  const tgChatId = ctx.chat!.id.toString();

  await prisma.poll.updateMany({
    where: { chat: { telegramChatId: tgChatId }, isActive: true },
    data: { isActive: false },
  });

  const poll = await prisma.poll.create({
    data: {
      chat: { connect: { telegramChatId: tgChatId } },
      title: name,
      startDate: suggestionEnd,
      endDate: votingEnd,
      readingEnd,
      isActive: true,
    },
    include: {
      chat: { select: { telegramChatId: true } },
    },
  });

  const lastPoll = await prisma.poll.findFirst({
    where: { chatId: chat.id },
    include: { options: true },
    orderBy: { startDate: "desc" },
  });

  if (lastPoll && lastPoll.options.length > 0) {
    const leftoverIds = lastPoll.options.map((o) => o.id);
    await prisma.bookOption.updateMany({
      where: { id: { in: leftoverIds } },
      data: { pollId: poll.id },
    });
  }

  await ctx.reply(
    `✅ Poll created! Verify y/n?\n` +
      `• Suggestions: now → ${suggestionEnd.toLocaleString()}\n` +
      `• Voting: ${suggestionEnd.toLocaleString()} → ${votingEnd.toLocaleString()}\n` +
      `• Reading: ${votingEnd.toLocaleString()} → ${readingEnd.toLocaleString()}`
  );
  const verifyMsg = await conv.wait();
  const verify = verifyMsg.message?.text?.trim().toLowerCase();
  if (verify !== "y") {
    return ctx.reply("❗ Poll creation cancelled.");
  }
  schedulePollNotifications(poll);
}
