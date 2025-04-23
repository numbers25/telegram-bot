// File: src/bot.ts
import { Bot, session, Context, SessionFlavor } from "grammy";
import { config } from "dotenv";

config();

type MySession = {
  votes: Record<string, number>;
  books: string[];
};

type MyContext = Context & SessionFlavor<MySession>;

function createInitialSession(): MySession {
  return { votes: {}, books: [] };
}

const bot = new Bot<MyContext>(process.env.BOT_API!);

bot.use(session({ initial: createInitialSession }));

// Command: /start
bot.command("start", async (ctx) => {
  await ctx.reply(
    "📚 Welcome to the Book Club Bot! Type /help to see what you can do."
  );
});

// Command: /addbook <title>
bot.command("addbook", async (ctx) => {
  const title = ctx.message?.text?.split(" ").slice(1).join(" ");
  if (!title)
    return ctx.reply("❗ Please provide a book title, like: /addbook Dune");
  ctx.session.books.push(title);
  await ctx.reply(`✅ Added "${title}" to the book list.`);
});

// Command: /listbooks
bot.command("listbooks", async (ctx) => {
  if (ctx.session.books.length === 0) {
    return ctx.reply("📭 No books have been added yet.");
  }
  const list = ctx.session.books.map((b, i) => `${i + 1}. ${b}`).join("\n");
  await ctx.reply(`📚 Book List:\n${list}`);
});

// Start bot
bot.start();
console.log("🤖 Bot is running...");
