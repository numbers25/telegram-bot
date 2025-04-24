import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";
import { ensureEntities } from "../utils/ensureEntities";
import { isAdmin } from "../utils/isAdmin";

// 1) Voting conversation: user submits a numeric choice
export async function vote(
  conv: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  // ensure chat & user exist
  const { chat, user } = await ensureEntities(ctx);

  // find active poll & its options
  const poll = await prisma.poll.findFirst({
    where: { chatId: chat!.id, isActive: true },
    include: {
      options: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!poll || poll.options.length === 0) {
    return ctx.reply("🚫 No active poll or no options to vote on.");
  }

  // list options for voting
  const list = poll.options
    .map(
      (opt, i) =>
        `${i + 1}. ${opt.title}${opt.author ? ` — ${opt.author}` : ""}`
    )
    .join("\n");

  await ctx.reply(`🗳️ *Vote for a book*\n${list}`, { parse_mode: "Markdown" });

  // wait for numeric reply
  const resp = await conv.wait();
  const choice = parseInt(resp.message?.text || "", 10);
  if (isNaN(choice) || choice < 1 || choice > poll.options.length) {
    return ctx.reply("❗ Please reply with the number of your chosen option.");
  }

  const selected = poll.options[choice - 1];

  // enforce one vote per user per poll: remove old votes
  await prisma.vote.deleteMany({
    where: { userId: user!.id, option: { pollId: poll.id } },
  });

  // record new vote
  await prisma.vote.create({
    data: {
      userId: user!.id,
      optionId: selected.id,
    },
  });

  return ctx.reply(`✅ Your vote for "${selected.title}" has been recorded!`);
}
