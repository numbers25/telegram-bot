import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";

export async function listBooks(ctx: MyContext) {
  const tgChatId = ctx.chat?.id.toString();
  if (!tgChatId) {
    return ctx.reply("🚫 Unable to identify this chat.");
  }

  // Fetch the active poll and its suggestions for this chat
  const poll = await prisma.poll.findFirst({
    where: { chat: { telegramChatId: tgChatId }, isActive: true },
    include: { options: { orderBy: { createdAt: "asc" } } },
  });
  if (!poll) {
    return ctx.reply("📭 There is no active vote right now.");
  }

  const options = poll.options;
  if (options.length === 0) {
    return ctx.reply("📭 No suggestions have been made yet.");
  }

  const list = options
    .map(
      (opt, i) =>
        `${i + 1}. ${opt.title}${opt.author ? ` — ${opt.author}` : ""}`
    )
    .join("\n");

  await ctx.reply(`📚 *Book List*\n${list}`, { parse_mode: "Markdown" });
}
