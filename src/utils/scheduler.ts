import cron from "node-cron";
import { prisma } from "./prisma";
import { Bot } from "grammy";
import { config } from "dotenv";

config();
const bot = new Bot(process.env.BOT_API!);

function getLastSunday(year: number, month: number): Date {
  const d = new Date(year, month + 1, 0);
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
  return d;
}

// Closing previous poll and choosing winner!!
cron.schedule("0 0 1 * *", async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const activePolls = await prisma.poll.findMany({ where: { isActive: true } });
  for (const prevPoll of activePolls) {
    await prisma.poll.update({
      where: { id: prevPoll.id },
      data: { isActive: false },
    });

    // Tally votes
    const results = await prisma.vote.groupBy({
      by: ["optionId"],
      where: { option: { pollId: prevPoll.id } },
      _count: { optionId: true },
      orderBy: { _count: { optionId: "desc" } },
      take: 1,
    });
    if (results.length) {
      const topId = results[0].optionId;
      await prisma.bookOption.updateMany({
        where: { pollId: prevPoll.id, currentRead: true },
        data: { currentRead: false },
      });

      await prisma.bookOption.update({
        where: { id: topId },
        data: { currentRead: true },
      });
    }
  }

  // For each chat, create next poll
  const chats = await prisma.chat.findMany();
  for (const chat of chats) {
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = (month + 1) % 12;
    const pollStart = getLastSunday(year, month);
    const pollEnd = new Date(year, month + 1, 0);

    await prisma.poll.create({
      data: {
        chatId: chat.id,
        title: `${nextYear}-${nextMonth + 1} Book Vote`,
        startDate: pollStart,
        endDate: pollEnd,
        isActive: true,
      },
    });

    await bot.api.sendMessage(
      chat.telegramChatId,
      `🗳️ A new book vote for ${nextYear}-${
        nextMonth + 1
      } is open for suggestions until ${pollStart.toDateString()}. Use /suggest to add your book!`
    );
  }
});

// 2️⃣ Last Sunday of month at 00:00 — ensure poll is open and announce
cron.schedule("0 0 * * 0", async () => {
  const now = new Date();
  const d = getLastSunday(now.getFullYear(), now.getMonth());
  if (now.getDate() !== d.getDate()) return;

  const polls = await prisma.poll.findMany({ where: { isActive: true } });
  for (const poll of polls) {
    const chat = await prisma.chat.findUnique({ where: { id: poll.chatId } });
    if (!chat) continue;
    await bot.api.sendMessage(
      chat.telegramChatId,
      `🗳️ Voting for "${
        poll.title
      }" is now open until ${poll.endDate.toDateString()}! Use /vote to cast your vote.`
    );
  }
});

// Start the cron scheduler
console.log("⏰ Scheduler running...");
