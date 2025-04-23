import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";

export async function listBooks(ctx: MyContext) {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: "asc" },
  });

  if (books.length === 0) {
    return ctx.reply("📭 No books have been added yet.");
  }

  const list = books
    .map((b, i) => `${i + 1}. ${b.title} — ${b.author}`)
    .join("\n");

  await ctx.reply(`📚 *Book List*\n${list}`, { parse_mode: "Markdown" });
}
