import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";
import { ensureEntities } from "../utils/ensureEntities";
import { isAdmin } from "../utils/isAdmin";
import { listBooks } from "./listBooks";

export async function addBook(
  conv: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  const { chat, user } = await ensureEntities(ctx);
  if (!chat || !user) {
    return ctx.reply(
      "Something went wrong while resolving chat. Please try again."
    );
  }

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

  if (!isAdmin(ctx.from!.id)) {
    const existing = await prisma.bookOption.findFirst({
      where: {
        pollId: poll.id,
        suggestedById: user.id,
      },
    });
    if (existing) {
      return ctx.reply("You’ve already suggested a book for this poll :-(");
    }
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

  const poolCount = await prisma.bookOption.count({
    where: { pollId: poll.id },
  });
  if (poolCount >= 5) {
    const oldest = await prisma.bookOption.findFirst({
      where: { pollId: poll.id },
      orderBy: { createdAt: "asc" },
    });
    if (oldest) {
      await prisma.bookOption.delete({ where: { id: oldest.id } });
      await ctx.reply(
        `❗ Limit of 5 suggestions is full. Removed the oldest suggestion: "${oldest.title} by ${oldest.author}".`
      );
    }
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

  await ctx.reply(`✅ Suggested "${title}" by ${author}.`);
  await listBooks(ctx);
}
