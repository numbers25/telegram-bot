// src/commands/newPoll.ts
import { MyContext } from "../utils/types";
import { prisma } from "../utils/prisma";
import { isAdmin } from "../utils/isAdmin";

// Helper: compute last Sunday and month bounds
function getLastSunday(year: number, month: number): Date {
  const d = new Date(year, month + 1, 0);
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
  return d;
}
function getPollDates(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    startDate: getLastSunday(year, month),
    endDate: new Date(year, month + 1, 0),
  };
}

export async function newPoll(ctx: MyContext) {
  if (!ctx.from || !isAdmin(ctx.from.id)) {
    return ctx.reply("🚫 Only admins can start a new poll.");
  }

  const chatTgId = ctx.chat!.id.toString();

  // 1) deactivate any existing poll
  await prisma.poll.updateMany({
    where: { chat: { telegramChatId: chatTgId }, isActive: true },
    data: { isActive: false },
  });

  // 2) compute dates
  const { startDate, endDate } = getPollDates();

  // 3) create the new poll
  const poll = await prisma.poll.create({
    data: {
      chat: { connect: { telegramChatId: chatTgId } },
      title: `${startDate.toLocaleString("default", {
        month: "long",
      })} ${startDate.getFullYear()} Book Vote`,
      startDate,
      endDate,
      isActive: true,
    },
  });

  await ctx.reply(
    `🗳️ New poll #${poll.id} created!\n` +
      `Suggestions open now until ${startDate.toDateString()}.\n` +
      `Voting will run from then until ${endDate.toDateString()}.`
  );
}
