// src/commands/automatic.ts
import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../utils/types";
import { isAdmin } from "../utils/isAdmin";

export let cfg: {
  suggestionDays: number;
  votingDays: number;
  readingDays: number;
} | null = null;

export async function automaticConversation(
  conv: Conversation<MyContext>,
  ctx: MyContext
) {
  if (!ctx.from || !isAdmin(ctx.from.id)) {
    return ctx.reply("🚫 Only admins can configure automatic polling.");
  }

  await ctx.reply("⏱️ How many days should suggestions be open each cycle?");
  const a = await conv.wait();
  const suggestionDays = parseInt(a.message?.text || "", 10);
  if (isNaN(suggestionDays) || suggestionDays < 1) {
    return ctx.reply("❗ Enter a positive number of days.");
  }

  await ctx.reply("⏳ How many days should voting last?");
  const b = await conv.wait();
  const votingDays = parseInt(b.message?.text || "", 10);
  if (isNaN(votingDays) || votingDays < 1) {
    return ctx.reply("❗ Enter a positive number of days.");
  }

  await ctx.reply("📖 How many days for the reading period?");
  const c = await conv.wait();
  const readingDays = parseInt(c.message?.text || "", 10);
  if (isNaN(readingDays) || readingDays < 1) {
    return ctx.reply("❗ Enter a positive number of days.");
  }

  cfg = { suggestionDays, votingDays, readingDays };
  ctx.reply(
    `✅ Automatic cycle set:\n` +
      `• Suggestions: ${suggestionDays} days\n` +
      `• Voting: ${votingDays} days\n` +
      `• Reading: ${readingDays} days\n\n` +
      `I’ll now automatically start a new poll whenever the current reading period ends.`
  );
}
