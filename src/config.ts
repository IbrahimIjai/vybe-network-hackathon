import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

interface Config {
	BOT_TOKEN: string;
	VYBE_API_KEY: string;
	PORT: number;
	VYBE_API_BASE_URL: string;
	PRICE_WEBSOCKET_URL: string;
	REDIS_URL: string;
	REDIS_TOKEN: string;
}

// Configure environment variables
const config: Config = {
	BOT_TOKEN: process.env.BOT_TOKEN || "",
	VYBE_API_KEY: process.env.VYBE_API_KEY || "",
	PORT: parseInt(process.env.PORT!, 10),
	VYBE_API_BASE_URL: process.env.VYBE_API_BASE_URL!,
	PRICE_WEBSOCKET_URL: process.env.PRICE_WEBSOCKET_URL!,
	REDIS_URL: process.env.REDIS_URL!,
	REDIS_TOKEN: process.env.REDIS_TOKEN!,
};

// Validate essential configuration
if (!config.BOT_TOKEN) {
	throw new Error("BOT_TOKEN is not defined in the environment variables");
}

// if (!config.VYBE_API_KEY) {
// 	throw new Error("VYBE_API_KEY is not defined in the environment variables");
// }

export default config;
