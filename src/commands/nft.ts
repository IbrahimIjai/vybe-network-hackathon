import { MyContext } from "../types/session";
import { redisService } from "../services/redis";
import { VybeApi } from "../api/vybe";
import { FormatUtils } from "../utils/format";
import { KeyboardUtils } from "../utils/keyboard";

/**
 * Display NFT portfolio for a user
 */
export const displayNFTPortfolio = async (ctx: MyContext): Promise<void> => {
	try {
		// Get user data
		if (!ctx.from) {
			await ctx.reply("Could not identify user. Please try again.");
			return;
		}

		const userId = ctx.from.id;
		const userData = await redisService.getUserData(userId);
		const wallets = userData?.wallets || [];

		if (wallets.length === 0) {
			await ctx.reply(
				"You don't have any wallets added yet. Add a wallet first to view your NFTs.",
				{
					reply_markup: KeyboardUtils.createWalletListKeyboard([], true),
				},
			);
			return;
		}

		// Create loading message
		const loadingMsg = await ctx.reply("Loading NFT portfolio...");

		// Get wallet addresses
		const walletAddresses = wallets.map((w) => w.address);

		// Fetch NFT data
		const nftData = await VybeApi.getNFTBalances(walletAddresses);

		if (!nftData || !nftData.nfts || nftData.nfts.length === 0) {
			await ctx.api.editMessageText(
				loadingMsg.chat.id,
				loadingMsg.message_id,
				"No NFTs found in your wallets.",
				{
					reply_markup: KeyboardUtils.createBackKeyboard(),
				},
			);
			return;
		}

		// Create NFT portfolio message
		let message = "*Your NFT Portfolio*\n\n";

		// Add portfolio summary
		const totalValueUsd = parseFloat(nftData.totalValueUsd || "0");
		message += `*Total Value:* ${FormatUtils.formatCurrency(totalValueUsd)}\n`;
		message += `*Total NFTs:* ${nftData.nfts.length}\n\n`;

		// Show collections
		message += "*Top Collections:*\n";

		// Group NFTs by collection
		const collections: Record<string, { count: number; value: number }> = {};

		nftData.nfts.forEach((nft: any) => {
			const collection = nft.collectionName || "Unknown Collection";
			if (!collections[collection]) {
				collections[collection] = { count: 0, value: 0 };
			}
			collections[collection].count++;
			collections[collection].value += parseFloat(nft.price || "0");
		});

		// Sort collections by value
		const sortedCollections = Object.entries(collections)
			.sort(([, a], [, b]) => b.value - a.value)
			.slice(0, 5); // Show top 5 collections

		sortedCollections.forEach(([name, data]) => {
			message += `• *${name}*: ${data.count} NFTs (${FormatUtils.formatCurrency(
				data.value,
			)})\n`;
		});

		// Show individual NFTs
		message += "\n*Top NFTs by Value:*\n";

		// Sort NFTs by value
		const sortedNFTs = [...nftData.nfts]
			.sort((a, b) => parseFloat(b.price || "0") - parseFloat(a.price || "0"))
			.slice(0, 10); // Show top 10 NFTs

		sortedNFTs.forEach((nft: any, index: number) => {
			const name = nft.name || `NFT #${index + 1}`;
			const price = parseFloat(nft.price || "0");
			message += `• *${name}*: ${FormatUtils.formatCurrency(price)}\n`;
		});

		// Add more collections info if available
		if (Object.keys(collections).length > 5) {
			message += `\n_+${
				Object.keys(collections).length - 5
			} more collections..._\n`;
		}

		// Add more NFTs info if available
		if (nftData.nfts.length > 10) {
			message += `\n_+${nftData.nfts.length - 10} more NFTs..._\n`;
		}

		// Update message
		await ctx.api.editMessageText(
			loadingMsg.chat.id,
			loadingMsg.message_id,
			message,
			{
				parse_mode: "Markdown",
				reply_markup: KeyboardUtils.createBackKeyboard(),
			},
		);
	} catch (error) {
		console.error("Error displaying NFT portfolio:", error);
		await ctx.reply(
			"An error occurred while fetching your NFT portfolio. Please try again later.",
			{
				reply_markup: KeyboardUtils.createBackKeyboard(),
			},
		);
	}
};
