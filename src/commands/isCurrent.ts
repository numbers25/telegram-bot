import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";

export async function isCurrent(ctx: MyContext) {
  const tgChatId = ctx.chat?.id.toString();
  if (!tgChatId) {
    return ctx.reply("🚫 Unable to identify this chat.");
  }

  const lastPoll = await prisma.poll.findFirst({
    where: { chat: { telegramChatId: tgChatId }, isActive: false },
    orderBy: { endDate: "desc" },
    include: {
      options: {
        where: { currentRead: true },
        take: 1,
      },
    },
  });

  if (!lastPoll || lastPoll.options.length === 0) {
    return ctx.reply("📭 No current read has been set yet.");
  }

  const winner = lastPoll.options[0];
  const title = winner.title;
  const author = ` by ${winner.author}`;

  const today = new Date();

  let daysLeft: number = 0; // Default value
  if (lastPoll?.endDate) {
    const diffMs = lastPoll.endDate.getTime() - today.getTime();

    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  await ctx.reply(
    `📘 *Current Book*\n` +
      `_${title} by ${author}_\n` +
      `Reading period: ${lastPoll.startDate.toLocaleDateString(
        "en-FI"
      )} → ${lastPoll.endDate.toLocaleDateString("en-FI")}\n` +
      `${daysLeft} days left to read :-P`,
    { parse_mode: "Markdown" }
  );
}
