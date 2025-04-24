import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";
import { ensureEntities } from "../utils/ensureEntities";

export async function listBooks(ctx: MyContext) {
  const { chat } = await ensureEntities(ctx);
  if (!chat) {
    return ctx.reply("🚫 Unable to identify this chat.");
  }

  let poll = await prisma.poll.findFirst({
    where: { chatId: chat.id, isActive: true },
    include: { options: { orderBy: { createdAt: "asc" } } },
  });

  if (!poll) {
    poll = await prisma.poll.findFirst({
      where: { chatId: chat.id },
      include: { options: { orderBy: { createdAt: "asc" } } },
      orderBy: { startDate: "desc" },
    });
  }

  if (!poll || poll.options.length === 0) {
    return ctx.reply(
      "📭 No book suggestions have been made yet. Type /suggest to suggest a book!"
    );
  }

  const list = poll.options
    .map(
      (opt, i) =>
        `${i + 1}. ${opt.title}${opt.author ? ` — ${opt.author}` : ""}`
    )
    .join("\n");

  await ctx.reply(`📚 *Book List*\n${list}`, { parse_mode: "Markdown" });
}
