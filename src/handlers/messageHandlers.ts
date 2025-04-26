import { MyContext } from "../types/session";
import { redisService, UserWallet } from "../services/redis";
import { KeyboardUtils } from "../utils/keyboard";
import { showHelp } from "../commands/help";

/**
 * Handle text messages that could be wallet addresses
 */
export const handleTextMessage = async (ctx: MyContext): Promise<void> => {
	if (!ctx.message?.text || !ctx.from) return;

	const text = ctx.message.text.trim();

	// Check if the message looks like a Solana wallet address or multiple addresses
	if (isSolanaAddressFormat(text)) {
		await handleWalletAddressInput(ctx, text);
		return;
	}

	// Otherwise, check if we should handle it as a command
	// This is just a simple case for now
	if (text.toLowerCase() === "help") {
		await showHelp(ctx);
	}
};

/**
 * Check if text looks like a Solana address format (simple validation)
 * This is a basic check - a full validator would use Base58 validation
 */
function isSolanaAddressFormat(text: string): boolean {
	const addresses = text.split(",").map((addr) => addr.trim());

	// Check each address format
	return addresses.every((address) => {
		// Solana addresses are base58 encoded and typically 32-44 characters
		return (
			address.length >= 32 &&
			address.length <= 44 &&
			// Solana addresses are typically alphanumeric
			/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)
		);
	});
}

/**
 * Handle wallet address input from user
 */
async function handleWalletAddressInput(
	ctx: MyContext,
	text: string,
): Promise<void> {
	if (!ctx.from) return;

	const userId = ctx.from.id;
	const addresses = text.split(",").map((addr) => addr.trim());

	// Validate addresses (basic format validation)
	const invalidAddresses = addresses.filter(
		(addr) => !isSolanaAddressFormat(addr),
	);

	if (invalidAddresses.length > 0) {
		await ctx.reply(
			`Some addresses appear to be invalid. Please check and try again:\n${invalidAddresses.join(
				"\n",
			)}`,
			{ reply_markup: KeyboardUtils.createBackKeyboard() },
		);
		return;
	}

	// Loading message
	const loadingMsg = await ctx.reply("Adding wallet(s)...");

	try {
		// Add each wallet to user's profile
		const addedAddresses: string[] = [];

		for (const address of addresses) {
			// Create wallet object
			const wallet: UserWallet = {
				address: address,
				addedAt: Date.now(),
			};

			// Save wallet to database
			await redisService.addUserWallet(userId, wallet);
			addedAddresses.push(address);
		}

		// Get updated wallet list
		const userData = await redisService.getUserData(userId);
		const wallets = userData?.wallets || [];

		// Success message
		const successMsg = `
✅ *Successfully added ${addedAddresses.length} wallet(s)!*

You can now view your wallet balances and track your assets.
What else would you like to do?
`;

		// Delete loading message
		await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

		// Send success message with keyboard
		await ctx.reply(successMsg, {
			parse_mode: "Markdown",
			reply_markup: KeyboardUtils.createMainKeyboard(),
		});
	} catch (error) {
		console.error("Error adding wallet(s):", error);

		// Delete loading message
		await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

		// Send error message
		await ctx.reply(
			"An error occurred while adding your wallet(s). Please try again later.",
			{ reply_markup: KeyboardUtils.createBackKeyboard() },
		);
	}
}
