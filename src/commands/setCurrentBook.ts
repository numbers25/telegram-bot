import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";
import { isAdmin } from "../utils/isAdmin";

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Automatically set the end date to the last Sunday of the month
function getLastSunday(): Date {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
  return d;
}

export async function setCurrentBook(ctx: MyContext) {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) {
    return ctx.reply("🚫 You’re not authorized to use this command.");
  }

  const args = ctx.message?.text?.split(" ").slice(1);
  const title = args?.join(" ");

  if (!title) return ctx.reply("❗ Use: /setcurrent TITLE");

  const book = await prisma.book.findFirst({
    where: {
      title: {
        equals: title,
      },
    },
  });

  if (!book) return ctx.reply(`❗ Book titled "${title}" not found.`);

  await prisma.book.updateMany({ data: { isCurrent: false } }); // clear existing
  await prisma.book.update({
    where: { id: book.id },
    data: {
      isCurrent: true,
      startDate: getStartOfMonth(),
      endDate: getLastSunday(),
    },
  });

  await ctx.reply(
    `📘 \"${
      book.title
    }\" is now the current read.\n📆 ${getStartOfMonth().toDateString()} → ${getLastSunday().toDateString()}`
  );
}
