import { Bot, session } from "grammy";
import { config } from "dotenv";
import { conversations, createConversation } from "@grammyjs/conversations";
import { addBook } from "./commands/addBook";
import { MyContext, MySession } from "./utils/types";
import { listBooks } from "./commands/listBooks";
import { setCurrent } from "./admin/setCurrent";
import { isCurrent } from "./commands/isCurrent";
import { newPoll } from "./admin/newPoll";
import "./utils/scheduler";

config();

function createInitialSession(): MySession {
  return {};
}

const bot = new Bot<MyContext>(process.env.BOT_API!);

bot.use(session({ initial: createInitialSession }));
bot.use(conversations());
bot.use(createConversation(addBook));
bot.use(createConversation(setCurrent));

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

// Set the current book for the month - ADMIN
bot.command("setcurrent", async (ctx) => {
  await ctx.conversation.enter("setCurrent");
});

// Create new poll - ADMIn
bot.command("newpoll", newPoll);

bot.start();
console.log("🤖 Bot is running...");
