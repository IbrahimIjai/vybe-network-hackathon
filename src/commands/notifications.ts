import { CommandContext } from "grammy";
import { MyContext } from "../types/session";
import { transferWatcherService } from "../services/transfer-watcher";
import { FormatUtils } from "../utils/format";

/**
 * Handle /notifications command for managing notification settings
 */
export const handleNotificationsCommand = async (
	ctx: CommandContext<MyContext>,
): Promise<void> => {
	try {
		const input = ctx.match.trim().toLowerCase();

		if (!input || (input !== "on" && input !== "off" && input !== "status")) {
			await showNotificationsHelp(ctx);
			return;
		}

		if (input === "status") {
			await showNotificationsStatus(ctx);
			return;
		}

		const enableNotifications = input === "on";

		// Check if there are tracked wallets
		const trackedWallets = ctx.session.trackedWallets || [];

		if (enableNotifications && trackedWallets.length === 0) {
			await ctx.reply(
				"You have no tracked wallets. Use `/track wallet ADDRESS` to track a wallet first.",
				{ parse_mode: "Markdown" },
			);
			return;
		}

		// Update notification setting
		ctx.session.notificationsEnabled = enableNotifications;

		if (enableNotifications) {
			// Subscribe to all tracked wallets
			for (const wallet of trackedWallets) {
				transferWatcherService.subscribeWallet(wallet, ctx.chat.id);
			}

			await ctx.reply(
				`✅ Notifications are now enabled. You will receive updates for your tracked wallets.`,
				{ parse_mode: "Markdown" },
			);
		} else {
			await ctx.reply(
				`❌ Notifications are now disabled. You will not receive automatic updates.`,
				{ parse_mode: "Markdown" },
			);
		}
	} catch (error) {
		console.error("Error handling notifications command:", error);
		await ctx.reply(
			"An error occurred while updating your notification settings. Please try again.",
		);
	}
};

/**
 * Show help for the notifications command
 */
async function showNotificationsHelp(
	ctx: CommandContext<MyContext>,
): Promise<void> {
	const helpText = `
*Notifications Command Help*

Enable or disable notifications for tracked wallets and prices.

*Commands:*
• \`/notifications on\` - Enable all notifications
• \`/notifications off\` - Disable all notifications
• \`/notifications status\` - Show current notifications status

When notifications are enabled, you'll receive real-time updates for:
• Token transfers in tracked wallets
• Significant price changes for tracked tokens
`;

	await ctx.reply(helpText, { parse_mode: "Markdown" });
}

/**
 * Show current notification status
 */
async function showNotificationsStatus(
	ctx: CommandContext<MyContext>,
): Promise<void> {
	try {
		const notificationsEnabled = ctx.session.notificationsEnabled === true;
		const trackedWallets = ctx.session.trackedWallets || [];
		const trackedPrices = ctx.session.trackedPrices || [];

		let message = "*Notifications Status*\n\n";
		message += `Notifications are currently ${
			notificationsEnabled ? "enabled ✅" : "disabled ❌"
		}\n\n`;

		// Show tracked items summary
		message += `*Tracking Summary:*\n`;
		message += `• ${trackedPrices.length} tracked token${
			trackedPrices.length !== 1 ? "s" : ""
		}\n`;
		message += `• ${trackedWallets.length} tracked wallet${
			trackedWallets.length !== 1 ? "s" : ""
		}\n\n`;

		if (trackedWallets.length > 0) {
			message += "*Tracked Wallets:*\n";
			trackedWallets.forEach((wallet) => {
				message += `• ${FormatUtils.truncateAddress(wallet)}\n`;
			});
		}

		// Add action hint
		if (notificationsEnabled) {
			message += "\nUse `/notifications off` to disable notifications.";
		} else {
			message += "\nUse `/notifications on` to enable notifications.";
		}

		await ctx.reply(message, { parse_mode: "Markdown" });
	} catch (error) {
		console.error("Error showing notifications status:", error);
		await ctx.reply(
			"An error occurred while fetching your notification status. Please try again.",
		);
	}
}
