import cron from "node-cron";
import { prisma } from "../utils/prisma";
import { bot } from "../bot"; // ensure you export `bot` from bot.ts
import { cfg } from "../admin/automaticPoll"; // the in-memory config

// Run this every hour
cron.schedule("0 * * * *", async () => {
  if (!cfg) return; // not yet configured

  // Find chats whose **last** poll's readingEnd is in the past
  const chats = await prisma.chat.findMany({
    include: {
      polls: {
        orderBy: { readingEnd: "desc" },
        take: 1,
      },
    },
  });

  const now = new Date();
  for (const chat of chats) {
    const last = chat.polls[0];
    // If no poll exists or readingEnd is passed, start a new cycle
    if (!last || last.readingEnd <= now) {
      // Deactivate any stray active poll
      await prisma.poll.updateMany({
        where: { chatId: chat.id, isActive: true },
        data: { isActive: false },
      });

      // Compute the windows
      const suggestionEnd = new Date(now);
      suggestionEnd.setDate(suggestionEnd.getDate() + cfg.suggestionDays);

      const votingEnd = new Date(suggestionEnd);
      votingEnd.setDate(votingEnd.getDate() + cfg.votingDays);

      const readingEnd = new Date(votingEnd);
      readingEnd.setDate(readingEnd.getDate() + cfg.readingDays);

      // Create the new poll
      const poll = await prisma.poll.create({
        data: {
          chat: { connect: { id: chat.id } },
          title: `Auto poll ${now.toDateString()}`,
          startDate: suggestionEnd,
          endDate: votingEnd,
          readingEnd,
          isActive: true,
        },
      });

      // Announce in the group
      await bot.api.sendMessage(
        chat.telegramChatId,
        `🗳️ New automatic poll #${poll.id}!\n` +
          `• Suggest until ${suggestionEnd.toDateString()}\n` +
          `• Vote until ${votingEnd.toDateString()}\n` +
          `• Read until ${readingEnd.toDateString()}`
      );
    }
  }
});

console.log("⏰ Automatic scheduling process, run /automatic to configure.");
