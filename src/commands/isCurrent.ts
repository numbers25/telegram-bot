import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";

export async function isCurrent(ctx: MyContext) {
  const book = await prisma.book.findFirst({
    where: {
      isCurrent: true,
    },
  });

  const start = book?.startDate?.toLocaleDateString("en-FI") ?? "Unknown";
  const end = book?.endDate?.toLocaleDateString("en-FI") ?? "Unknown";

  const today = new Date();

  let daysLeft: number = 0; // Default value
  if (book?.endDate) {
    const diffMs = book.endDate.getTime() - today.getTime();

    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  if (book) {
    await ctx.reply(
      `📘 *Current Book*\n` +
        `_${book.title} by ${book.author}_\n` +
        `Reading period: ${start} → ${end}\n` +
        `${daysLeft} days left to read :-P`,
      { parse_mode: "Markdown" }
    );
  } else {
    await ctx.reply("📭 No current book found.");
  }
}
