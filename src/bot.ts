import { Bot, session } from "grammy";
import { config } from "dotenv";
import { conversations, createConversation } from "@grammyjs/conversations";
import { addBook } from "./commands/addBook";
import { MyContext, MySession } from "./utils/types";
import { listBooks } from "./commands/listBooks";

config();

function createInitialSession(): MySession {
  return { votes: {} };
}

const bot = new Bot<MyContext>(process.env.BOT_API!);

// Middleware order matters
bot.use(session({ initial: createInitialSession }));
bot.use(conversations());
bot.use(createConversation(addBook));

// Commands
bot.command("start", async (ctx) => {
  await ctx.reply(
    "📚 Welcome to the Book Club Bot! Type /help to see what you can do."
  );
  console.log(
    `🤖 User ${ctx.from?.username} (${ctx.from?.id}) started the bot.`
  );
});

bot.command("addbook", async (ctx) => {
  await ctx.conversation.enter("addBook");
});

bot.command("listbooks", listBooks);

bot.start();
console.log("🤖 Bot is running...");
