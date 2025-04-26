# Realtime Features Architecture

## Overview

This document outlines the implementation of two key realtime features:

1. Realtime price updates for major Solana tokens
2. Realtime token transfer notifications for user-specified addresses

## 1. Realtime Price Updates

### Architecture Components

#### Files to Create/Modify:

- `src/services/realtime-price.ts` - WebSocket service for price data
- `src/commands/track.ts` - Command handler for tracking prices
- `src/types/realtime.ts` - Types for realtime data
- `src/services/cache.ts` - Caching service for price data
- `src/jobs/price-alerts.ts` - Background job for price alerts

#### Implementation Details:

**WebSocket Connection (realtime-price.ts)**

```typescript
import WebSocket from "ws";
import config from "../config";
import { EventEmitter } from "events";

export class RealtimePriceService extends EventEmitter {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private trackedTokens: Set<string> = new Set();
	private priceData: Map<string, number> = new Map();

	constructor() {
		super();
		this.connect();
	}

	private connect() {
		this.ws = new WebSocket(config.PRICE_WEBSOCKET_URL);

		this.ws.on("open", () => {
			this.reconnectAttempts = 0;
			this.subscribeToTokens();
		});

		this.ws.on("message", (data) => {
			this.handlePriceUpdate(JSON.parse(data.toString()));
		});

		this.ws.on("close", () => this.handleDisconnect());
		this.ws.on("error", (error) => this.handleError(error));
	}

	// Methods for tracking tokens, emitting price updates, etc.
}
```

**Session Data Extension (types/session.ts)**

```typescript
export interface SessionData {
	trackedPrices?: string[]; // Array of tracked token symbols
	priceAlerts?: {
		[symbol: string]: {
			above?: number;
			below?: number;
		};
	};
	trackedWallets?: string[]; // Array of wallet addresses to track
}
```

**Track Command (commands/track.ts)**

```typescript
import { CommandContext } from "grammy";
import { MyContext } from "../types/session";
import { realtimePriceService } from "../services/realtime-price";

export const handleTrackCommand = async (ctx: CommandContext<MyContext>) => {
	const args = ctx.match.split(" ");
	if (args.length < 2) {
		return ctx.reply("Usage: /track price SOL\nor: /track wallet ADDRESS");
	}

	const [type, value] = args;

	if (type === "price") {
		// Handle price tracking
	} else if (type === "wallet") {
		// Handle wallet tracking
	}
};
```

## 2. Realtime Token Transfer Notifications

### Architecture Components

#### Files to Create/Modify:

- `src/services/transfer-watcher.ts` - Service for monitoring transfers
- `src/commands/notifications.ts` - Command handler for notification settings
- `src/jobs/wallet-monitor.ts` - Background job for checking transfers

#### Implementation Details:

**Transfer Watcher Service (transfer-watcher.ts)**

```typescript
import { VybeApi } from "../api/vybe";
import { bot } from "../index";
import { TokenTransfer } from "../types/api";

export class TransferWatcherService {
	private walletSubscriptions: Map<string, Set<number>> = new Map();
	private lastCheckedTime: Map<string, number> = new Map();

	constructor() {
		this.startPolling();
	}

	subscribeWallet(walletAddress: string, chatId: number) {
		if (!this.walletSubscriptions.has(walletAddress)) {
			this.walletSubscriptions.set(walletAddress, new Set());
			this.lastCheckedTime.set(walletAddress, Date.now() / 1000);
		}

		this.walletSubscriptions.get(walletAddress)!.add(chatId);
	}

	private async startPolling() {
		setInterval(async () => {
			await this.checkForNewTransfers();
		}, 60000); // Poll every minute
	}

	private async checkForNewTransfers() {
		// Implementation details for polling and notifying users
	}
}
```

**Notification Settings Command (commands/notifications.ts)**

```typescript
import { CommandContext } from "grammy";
import { MyContext } from "../types/session";
import { transferWatcherService } from "../services/transfer-watcher";

export const handleNotificationsCommand = async (
	ctx: CommandContext<MyContext>,
) => {
	const args = ctx.match.split(" ");

	if (args.length < 1) {
		return ctx.reply("Usage: /notifications on|off");
	}

	const [action] = args;

	if (action === "on") {
		// Enable notifications for the user's tracked wallets
		const trackedWallets = ctx.session.trackedWallets || [];

		if (trackedWallets.length === 0) {
			return ctx.reply(
				"You have no tracked wallets. Use /track wallet ADDRESS to track a wallet first.",
			);
		}

		// Register for notifications
	} else if (action === "off") {
		// Disable notifications
	}
};
```

## Integration with Main Bot

In `src/index.ts`, add the following:

```typescript
// Import new command handlers
import { handleTrackCommand } from "./commands/track";
import { handleNotificationsCommand } from "./commands/notifications";

// Register new commands
bot.command("track", handleTrackCommand);
bot.command("notifications", handleNotificationsCommand);

// Add to command list
bot.api.setMyCommands([
	// Existing commands
	{ command: "track", description: "Track token prices or wallet activity" },
	{ command: "notifications", description: "Manage notification settings" },
]);

// Initialize realtime services
import { RealtimePriceService } from "./services/realtime-price";
import { TransferWatcherService } from "./services/transfer-watcher";

export const realtimePriceService = new RealtimePriceService();
export const transferWatcherService = new TransferWatcherService();
```

## Database Considerations

For a production implementation, consider adding:

- `src/db/index.ts` - Database connection management
- `src/db/models/user-preferences.ts` - Store user tracking preferences
- `src/db/models/price-alerts.ts` - Store price alert thresholds

## Deployment Considerations

- Ensure WebSocket connections are properly managed in a containerized environment
- Consider horizontal scaling for the transfer watcher service
- Implement rate limiting for API calls to prevent hitting limits

## Future Enhancements

1. Add threshold-based price alerts: "/alert SOL above 150"
2. Add percentage-based movement alerts: "/alert SOL move 5%"
3. Add wallet transaction volume alerts for whale activity
4. Implement a dashboard command to view all tracked items
