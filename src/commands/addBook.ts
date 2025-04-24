import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";

export async function addBook(
  conv: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  // Ensure chat and user exist/upsert
  const tgChatId = ctx.chat!.id.toString();
  const chat = await prisma.chat.upsert({
    where: { telegramChatId: tgChatId },
    update: { title: ctx.chat?.title },
    create: { telegramChatId: tgChatId, title: ctx.chat?.title! },
  });
  const tgUserId = ctx.from!.id.toString();
  const user = await prisma.user.upsert({
    where: { telegramUserId: tgUserId },
    update: {
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
    },
    create: {
      telegramUserId: tgUserId,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
    },
  });

  // Find upcoming poll (isActive=true) and check suggestion window
  const now = new Date();
  const poll = await prisma.poll.findFirst({
    where: { chatId: chat.id, isActive: true },
    orderBy: { startDate: "asc" },
  });

  if (!poll) {
    return ctx.reply("🚫 No poll is set up yet. Ask an admin to /newpoll.");
  }
  if (now >= poll.startDate) {
    return ctx.reply(
      `⏰ Suggestions are closed — voting is already open until ${poll.endDate.toDateString()}.`
    );
  }

  // Enforce one suggestion per user per poll
  const existing = await prisma.bookOption.findUnique({
    where: {
      pollId_suggestedById: { pollId: poll.id, suggestedById: user.id },
    },
  });
  if (existing) {
    return ctx.reply("You’ve already suggested a book for this poll :-(");
  }

  // Multi-step input: title & author
  await ctx.reply("📘 What’s the title of the book?");
  const titleMsg = await conv.wait();
  const title = titleMsg.message?.text?.trim();
  if (!title) {
    return ctx.reply("❗ Title cannot be empty. Try /suggest again.");
  }

  await ctx.reply("✍️ Who is the author?");
  const authorMsg = await conv.wait();
  const author = authorMsg.message?.text?.trim();
  if (!author) {
    return ctx.reply("❗ Author cannot be empty. Try /suggest again.");
  }

  // Create suggestion
  await prisma.bookOption.create({
    data: {
      pollId: poll.id,
      title,
      author,
      suggestedById: user.id,
    },
  });

  await ctx.reply(
    `✅ Suggested "${title}"${
      author ? ` by ${author}` : ""
    } for the upcoming vote!`
  );
}
