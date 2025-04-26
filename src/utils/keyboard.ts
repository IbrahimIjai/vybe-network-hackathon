import { InlineKeyboard } from "grammy";
import { UserWallet } from "../services/redis";
import { FormatUtils } from "./format";

export const KeyboardUtils = {
	/**
	 * Create a wallet list keyboard with options
	 */
	createWalletListKeyboard(
		wallets: UserWallet[],
		includeAddButton = true,
	): InlineKeyboard {
		const keyboard = new InlineKeyboard();

		// Add a row for each wallet
		wallets.forEach((wallet, index) => {
			const walletLabel =
				wallet.label || FormatUtils.truncateAddress(wallet.address);
			keyboard.text(`🔍 ${walletLabel}`, `wallet_view:${wallet.address}`).row();
		});

		if (includeAddButton) {
			keyboard.text("➕ Add Wallet", "wallet_add");
		}

		keyboard.row().text("🖼️ See NFT Portfolio", "view_nfts");
		keyboard.row().text("ℹ️ Help", "show_help");

		return keyboard;
	},

	/**
	 * Create a main keyboard for general use
	 */
	createMainKeyboard(): InlineKeyboard {
		const keyboard = new InlineKeyboard();
		keyboard.text("➕ Add Wallet", "wallet_add");
		keyboard.text("👛 View Wallets", "view_wallets").row();
		keyboard.text("ℹ️ Help", "show_help");
		return keyboard;
	},

	/**
	 * Create a confirmation keyboard
	 */
	createConfirmationKeyboard(action: string, data: string): InlineKeyboard {
		return new InlineKeyboard()
			.text("✅ Yes", `confirm_${action}:${data}`)
			.text("❌ No", "cancel");
	},

	/**
	 * Create a back button keyboard
	 */
	createBackKeyboard(): InlineKeyboard {
		return new InlineKeyboard().text("« Back to Wallets", "back_to_wallets");
	},
};
