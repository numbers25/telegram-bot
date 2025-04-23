import { prisma } from "../utils/prisma";
import { MyContext } from "../utils/types";
import { Conversation } from "@grammyjs/conversations";

export async function addBook(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  await ctx.reply("📘 What is the title of the book?");
  const titleMsg = await conversation.wait();
  const title = titleMsg.message?.text;

  if (!title) {
    await ctx.reply("❗ Title cannot be empty. Try /addbook again.");
    return;
  }

  await ctx.reply("✍️ Who is the author?");
  const authorMsg = await conversation.wait();
  const author = authorMsg.message?.text;

  if (!author) {
    await ctx.reply("❗ Author cannot be empty. Try /addbook again.");
    return;
  }

  await prisma.book.create({ data: { title, author } });
  await ctx.reply(`✅ Added \"${title}\" by ${author} to the book list.`);
}
