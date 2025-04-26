import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

interface Config {
	BOT_TOKEN: string;
	VYBE_API_KEY: string;
	PORT: number;
	ALPHA_VYBE_URL: string;
	VYBE_API_BASE_URL: string;
	PRICE_WEBSOCKET_URL: string;
}

// Configure environment variables
const config: Config = {
	BOT_TOKEN: process.env.BOT_TOKEN || "",
	VYBE_API_KEY: process.env.VYBE_API_KEY || "",
	PORT: parseInt(process.env.PORT || "3000", 10),
	ALPHA_VYBE_URL: process.env.ALPHA_VYBE_URL || "https://alphavybe.xyz",
	VYBE_API_BASE_URL: "https://api.vybe.finance/v0",
	PRICE_WEBSOCKET_URL:
		process.env.PRICE_WEBSOCKET_URL || "wss://api.vybe.finance/ws/prices",
};

// Validate essential configuration
if (!config.BOT_TOKEN) {
	throw new Error("BOT_TOKEN is not defined in the environment variables");
}

// if (!config.VYBE_API_KEY) {
// 	throw new Error("VYBE_API_KEY is not defined in the environment variables");
// }

export default config;
