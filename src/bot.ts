import { Bot, session } from "grammy";
import { config } from "dotenv";
import { conversations, createConversation } from "@grammyjs/conversations";
import { addBook } from "./commands/addBook";
import { MyContext, MySession } from "./utils/types";
import { listBooks } from "./commands/listBooks";
import { setCurrentBook } from "./commands/setCurrentBook";
import { isCurrent } from "./commands/isCurrent";

config();

function createInitialSession(): MySession {
  return { votes: {} };
}

const bot = new Bot<MyContext>(process.env.BOT_API!);

bot.use(session({ initial: createInitialSession }));
bot.use(conversations());
bot.use(createConversation(addBook));

// COMMANDS
bot.command("start", async (ctx) => {
  await ctx.reply("📚 Hey bookworm, type /help to see what you can do...");
  console.log(
    `🤖 User ${ctx.from?.username} (${ctx.from?.id}) started the bot.`
  );
});

// For adding books to the list
bot.command("addbook", async (ctx) => {
  await ctx.conversation.enter("addBook");
});

// List all books on the (voting) list
bot.command("listbooks", listBooks);

// Set the current book for the month
bot.command("setcurrent", setCurrentBook);

// Check the current book
bot.command("current", isCurrent);

bot.start();
console.log("🤖 Bot is running...");
