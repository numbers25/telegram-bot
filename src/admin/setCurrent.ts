import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";
import { isAdmin } from "../utils/isAdmin";

export async function setCurrent(
  conv: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) {
    return ctx.reply("🚫 You’re not authorized to use this command.");
  }

  const tgChatId = ctx.chat?.id.toString();
  if (!tgChatId) return ctx.reply("🚫 Chat ID not found.");

  // Fetch the most recent closed poll and its options
  const lastPoll = await prisma.poll.findFirst({
    where: { chat: { telegramChatId: tgChatId }, isActive: false },
    orderBy: { endDate: "desc" },
    include: { options: { orderBy: { createdAt: "asc" } } },
  });
  if (!lastPoll) {
    return ctx.reply("❗ No poll found to force a result on.");
  }

  const options = lastPoll.options;
  if (options.length === 0) {
    return ctx.reply("❗ No options available in the last poll.");
  }

  // List options for admin
  const listText = options
    .map(
      (opt, i) =>
        `[${i + 1}] ${opt.title}${opt.author ? ` by ${opt.author}` : ""}`
    )
    .join("");
  await ctx.reply(`🗳️ Options from last poll: ${listText}`);

  // Ask for choice
  await ctx.reply(
    "🔢 Please enter the number of the option to set as current read:"
  );
  const msg = await conv.wait();
  const choice = parseInt(msg.message?.text?.trim() || "", 10);
  if (isNaN(choice) || choice < 1 || choice > options.length) {
    return ctx.reply(
      `❗ Invalid selection. Enter a number between 1 and ${options.length}.`
    );
  }

  const selected = options[choice - 1];

  // Clear existing currentRead flags
  await prisma.bookOption.updateMany({
    where: { pollId: lastPoll.id, currentRead: true },
    data: { currentRead: false },
  });

  // Set the forced winner
  await prisma.bookOption.update({
    where: { id: selected.id },
    data: { currentRead: true },
  });

  await ctx.reply(
    `✅ Option #${choice} ("${selected.title}") is now the current read.`
  );
}
