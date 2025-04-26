import { CommandContext } from "grammy";
import { MyContext } from "../types/session";
import { redisService } from "../services/redis";
import { FormatUtils } from "../utils/format";
import { KeyboardUtils } from "../utils/keyboard";

export const handleWalletsCommand = async (
  ctx: CommandContext<MyContext>,
): Promise<void> => {
  try {
    if (!ctx.from) {
      await ctx.reply("Could not identify user. Please try again.");
      return;
    }
    
    const userId = ctx.from.id;
    const userData = await redisService.getUserData(userId);
    const wallets = userData?.wallets || [];
    
    if (wallets.length === 0) {
      await ctx.reply(
        "You don't have any wallets added yet. Click the button below to add one.",
        {
          reply_markup: KeyboardUtils.createWalletListKeyboard([], true),
        }
      );
      return;
    }
    
    // Format wallet list message
    let message = "*Your Wallets:*\n\n";
    wallets.forEach((wallet, index) => {
      const label = wallet.label || FormatUtils.truncateAddress(wallet.address);
      message += `${index + 1}. \`${label}\` - \`${wallet.address}\`\n`;
    });
    
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: KeyboardUtils.createWalletListKeyboard(wallets),
    });
  } catch (error) {
    console.error("Error handling wallets command:", error);
    await ctx.reply("An error occurred while fetching your wallets. Please try again.");
  }
}; 