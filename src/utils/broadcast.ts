// src/utils/scheduler.ts
import schedule from "node-schedule";
import { bot } from "../bot";
import { prisma } from "./prisma";

// send a chat notification safely
async function notify(chatId: string, text: string) {
  try {
    await bot.api.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("📣 notify failed:", err);
  }
}

async function tallyAndClosePoll(pollId: number, chatId: string) {
  // 1) Fetch poll + options + votes
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: { include: { votes: true } },
    },
  });
  if (!poll) return;

  // 2) Tally
  const results = poll.options.map((opt) => ({ opt, count: opt.votes.length }));
  const max = Math.max(...results.map((r) => r.count));
  const ties = results
    .filter((r) => r.count === max)
    .sort((a, b) => a.opt.createdAt.getTime() - b.opt.createdAt.getTime());
  const winner = ties[0];

  // 3) Build & send the result message
  const lines = results
    .map((r) => `• ${r.opt.title}: ${r.count} vote${r.count !== 1 ? "s" : ""}`)
    .join("\n");
  await bot.api.sendMessage(
    chatId,
    `📊 *Poll #${poll.title ?? ""} Results*  
  ${lines}
  
  🏆 *Winner:* ${winner.opt.title}`,
    { parse_mode: "Markdown" }
  );

  // 4) Remove the winner & archive it
  await prisma.bookOption.delete({ where: { id: winner.opt.id } });
  await prisma.readBook.create({
    data: {
      chatId: poll.chatId,
      title: winner.opt.title,
      author: winner.opt.author,
    },
  });

  // 5) Deactivate the poll
  await prisma.poll.update({
    where: { id: poll.id },
    data: { isActive: false },
  });
}

// whenever you have a freshly created Poll, call this:
export function schedulePollNotifications(poll: {
  id: number;
  chatId: number;
  chat: { telegramChatId: string };
  startDate: Date;
  endDate: Date;
  readingEnd: Date;
  title: string | null;
}) {
  const chatId = poll.chat.telegramChatId;

  notify(
    chatId,
    `🟢 Poll #${poll.title ?? ""} is live!\n` +
      `• Suggest now until *${poll.startDate.toLocaleString()}*`
  );

  // Schedule suggestions-close → voting-open
  schedule.scheduleJob(poll.startDate, () => {
    notify(
      chatId,
      `🔔 Suggestions closed for poll #${poll.id}.\n` +
        `🗳️ Voting open until *${poll.endDate.toLocaleString()}*`
    );
  });

  // voting-close → reading-open
  schedule.scheduleJob(poll.endDate, () => {
    notify(
      chatId,
      `⏹️ Voting closed for poll #${poll.id}.\n` +
        `📖 Reading period open until *${poll.readingEnd.toLocaleString()}*`
    );
  });

  schedule.scheduleJob(poll.endDate, () => {
    tallyAndClosePoll(poll.id, chatId).catch(console.error);
  });

  // reading-close → final wrap-up & deactivate
  schedule.scheduleJob(poll.readingEnd, async () => {
    // Re-fetch the book you inserted in tallyAndClosePoll:
    const lastRead = await prisma.readBook.findFirst({
      where: { chatId: poll.id },
      orderBy: { readAt: "desc" },
    });

    const bookTitle = lastRead?.title ?? "your book";

    await notify(
      chatId,
      `🚩 Reading period has ended!\n` + `📚 Time to discuss *${bookTitle}*`
    );

    await prisma.poll.update({
      where: { id: poll.chatId },
      data: { isActive: false },
    });
  });
}

// On startup, pick up any polls still “in the future”
export async function bootstrapSchedulers() {
  const now = new Date();
  const upcoming = await prisma.poll.findMany({
    where: { readingEnd: { gt: now } },
    include: { chat: true },
  });
  for (const poll of upcoming) {
    schedulePollNotifications(poll);
  }
}
