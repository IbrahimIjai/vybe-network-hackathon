import { Bot, session, GrammyError, HttpError } from "grammy";
import express from "express";
import config from "./config";
import { MyContext, SessionData } from "./types/session";

// Import command handlers
import { handleTokenCommand } from "./commands/token";
import { handlePriceCommand } from "./commands/price";
import { handleWalletCommand } from "./commands/wallet";
import { handleWhalesCommand } from "./commands/whales";
import { handleProgramCommand } from "./commands/program";
import { handleTrendingCommand } from "./commands/trending";
import { handleHoldersCommand } from "./commands/holders";
import { handleCompareCommand } from "./commands/compare";
import { handleHelpCommand } from "./commands/help";
import { handleStartCommand } from "./commands/start";
// import { handleTrackCommand } from "./commands/track";
// import { handleNotificationsCommand } from "./commands/notifications";

// Create bot instance
const bot = new Bot<MyContext>(config.BOT_TOKEN);

bot.use(session({ initial: (): SessionData => ({}) }));

bot.api.setMyCommands([
	{ command: "token", description: "Get detailed token information" },
	{ command: "price", description: "Get token price chart" },
	{ command: "wallet", description: "Get wallet token holdings" },
	{ command: "holders", description: "Get top token holders" },
	{ command: "whales", description: "Track large token transfers" },
	{ command: "program", description: "Get program details" },
	{ command: "trending", description: "Show trending tokens" },
	{ command: "compare", description: "Compare token metrics" },
	// { command: "track", description: "Track token prices or wallet activity" },
	// { command: "notifications", description: "Manage notification settings" },
	{ command: "help", description: "Show help information" },
]);

// Register command handlers
bot.command("token", handleTokenCommand);
bot.command("price", handlePriceCommand);
bot.command("wallet", handleWalletCommand);
bot.command("whales", handleWhalesCommand);
bot.command("program", handleProgramCommand);
bot.command("trending", handleTrendingCommand);
bot.command("holders", handleHoldersCommand);
bot.command("compare", handleCompareCommand);
bot.command("help", handleHelpCommand);
bot.command("start", handleStartCommand);
// bot.command("track", handleTrackCommand);
// bot.command("notifications", handleNotificationsCommand);

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
