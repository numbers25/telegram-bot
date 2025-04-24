import { Bot, session } from "grammy";
import { config } from "dotenv";
import { conversations, createConversation } from "@grammyjs/conversations";
import { addBook } from "./commands/addBook";
import { MyContext, MySession } from "./utils/types";
import { listBooks } from "./commands/listBooks";
import { setCurrent } from "./admin/setCurrent";
import { isCurrent } from "./commands/isCurrent";
import { newPoll } from "./admin/newPoll";
import { bootstrapSchedulers } from "./utils/broadcast";
import { vote } from "./commands/voting";
import "./utils/scheduler";

config();

function createInitialSession(): MySession {
  return {};
}

export const bot = new Bot<MyContext>(process.env.BOT_API!);

bot.use(session({ initial: createInitialSession }));

bot.use(conversations());
bot.use(createConversation(addBook));
bot.use(createConversation(setCurrent));
bot.use(createConversation(newPoll));
bot.use(createConversation(vote));

// COMMANDS
bot.command("start", async (ctx) => {
  await ctx.reply(
    "📚 Hey there little bookworm, type /help to see what you can do..."
  );
  console.log(
    `🤖 User ${ctx.from?.username} (${ctx.from?.id}) started the bot.`
  );
});

// Add books to the list
bot.command("suggest", async (ctx) => {
  await ctx.conversation.enter("addBook");
});

// List all books on the (voting) list
bot.command("list", listBooks);

// Check the current book
bot.command("current", isCurrent);

// Vote for a book
bot.command("vote", async (ctx) => {
  await ctx.conversation.enter("vote");
});

// Set the current book for the month - ADMIN
bot.command("setcurrent", async (ctx) => {
  await ctx.conversation.enter("setCurrent");
});

// Create new poll - ADMIN
bot.command("newpoll", async (ctx) => {
  await ctx.conversation.enter("newPoll");
});

bot.start();
console.log("🤖 Bot is running...");

(async () => {
  await bootstrapSchedulers();
  console.log("🤖 Scheduler bootstrapped.");
})();
