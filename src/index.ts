import { Bot, session, GrammyError, HttpError } from "grammy";
import express from "express";
import config from "./config";
import { MyContext, SessionData } from "./types/session";

// Import command handlers
import { handleTokenCommand } from "./commands/token";
import { handlePriceCommand } from "./commands/price";
import { handleHelpCommand } from "./commands/help";
import { handleStartCommand } from "./commands/start";

// Import callback and message handlers
import { handleCallbackQuery } from "./handlers/callbackHandlers";
import { handleTextMessage } from "./handlers/messageHandlers";

// Import Redis service
import { redisService } from "./services/redis";
import { handleHoldersCommand } from "./commands/holders";

// Create bot instance
const bot = new Bot<MyContext>(config.BOT_TOKEN);

bot.use(session({ initial: (): SessionData => ({}) }));

bot.api.setMyCommands([
	{ command: "token", description: "Get detailed token information" },
	{ command: "price", description: "Get token price chart" },
	{ command: "holders", description: "Get token holders list of top ten whales" },
	{ command: "help", description: "Show help information" },
	{ command: "start", description: "Start the bot" },
]);


bot.command("token", handleTokenCommand);
bot.command("price", handlePriceCommand);
bot.command("holders", handleHoldersCommand);
bot.command("help", handleHelpCommand);
bot.command("start", handleStartCommand);

bot.on("callback_query:data", handleCallbackQuery);

bot.on("message:text", handleTextMessage);

// Initialize Redis connection
redisService.connect().catch(console.error);

// Handle errors
bot.catch((err) => {
	const ctx = err.ctx;
	console.error(`Error while handling update ${ctx.update.update_id}:`);

	if (err.error instanceof GrammyError) {
		console.error("Error in request:", err.error.description);
	} else if (err.error instanceof HttpError) {
		console.error("Could not contact Telegram:", err.error);
	} else {
		console.error("Unknown error:", err.error);
	}
});

// Start bot
async function startBot() {
	await bot.start({
		onStart: (botInfo) => {
			console.log(`Bot @${botInfo.username} started!`);
		},
	});
}

if (process.env.NODE_ENV === "production") {
	const app = express();
	app.use(express.json());
	const WEBHOOK_URL =
		process.env.WEBHOOK_URL ||
		`https://your-webhook-url.com/bot${config.BOT_TOKEN}`;

	app.post(`/bot${config.BOT_TOKEN}`, (req, res) => {
		bot.handleUpdate(req.body);
		res.sendStatus(200);
	});

	// Set webhook
	bot.api.setWebhook(WEBHOOK_URL);

	// Start express server
	app.listen(config.PORT, () => {
		console.log(`Express server is listening on port ${config.PORT}`);
	});
} else {
	startBot();
}

if (process.env.NODE_ENV === "production") {
	const app = express();

	app.get("/health", (req, res) => {
		res.status(200).send("OK");
	});

	app.listen(config.PORT + 1, () => {
		console.log(`Health check endpoint listening on port ${config.PORT + 1}`);
	});
}

// Initialize the realtime services
// import { realtimePriceService } from "./services/realtime-price";
// import { transferWatcherService } from "./services/transfer-watcher";
// import { priceAlertService } from "./jobs/price-alerts";
// import { walletMonitorService } from "./jobs/wallet-monitor";

// Export bot instance for use in other files
export { bot };
