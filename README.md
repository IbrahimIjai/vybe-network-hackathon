# **VybeBot** — Real-time On-chain Analytics for Telegram

VybeBot is a powerful Telegram bot that delivers real-time on-chain analytics for the Solana ecosystem, powered by the **Vybe API**. Get actionable crypto insights directly in Telegram with quick links to [AlphaVybe](https://alphavybe.xyz) for deeper exploration.

- **Live Bot**: [VybeBot on Telegram](https://t.me/Vibe_bot_hackathon_bot)  
- **Demo Video**: [Watch on YouTube](https://youtu.be/Hfs3kHfSz-Y)

---

## 🚀 Features

### 🪙 Token Analytics
- **Token Details**: Price, market cap, volume, and supply metrics.
- **Price Charts**: Historical price charts with selectable timeframes.
- **Top Holders**: Token holder distribution and whale concentration.
- **Whale Tracking**: Alerts on large on-chain movements.

### 👛 Wallet Analytics
- **Portfolio Overview**: Token holdings with total USD value.
- **Historical Analysis**: Track portfolio performance over time.
- **Multi-wallet Comparison**: Compare multiple wallet stats easily.

### 🛠 Program Analytics
- **Program Stats**: TVL, active users, transaction volumes.
- **Activity Charts**: Historical activity and usage engagement.
- **Discovery**: Search and explore Solana programs by ID or name.

### 📈 Market Analytics
- **Trending Tokens**: Top performers by volume and price.
- **Token Comparison**: Side-by-side visual metrics.
- **Market Insights**: Discover trends and emerging assets.

---

## 📲 Bot Commands

```bash
/token <symbol or address>       → Token info
/price <symbol> [timeframe]      → Price chart
/wallet <address>                → Wallet token holdings
/nft <address>                   → NFT holdings (coming soon)
/program <program_id>            → Program analytics
/help                            → Command reference
```

---

## 🛠 Installation

### Prerequisites
- Node.js v18+
- [Telegram Bot Token](https://t.me/BotFather)
- Vybe API Key

### Setup Instructions

1. **Clone the Repo**
   ```bash
   git clone https://github.com/your-username/vybe-telegram-bot.git
   cd vybe-telegram-bot
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment**
   Create a `.env` file:
   ```env
   BOT_TOKEN=your_telegram_bot_token
   VYBE_API_KEY=your_vybe_api_key
   PORT=3000
   VYBE_API_BASE_URL="https://api.vybenetwork.xyz"
   REDIS_URL=your_upstash_url
   REDIS_TOKEN=your_upstash_token
   ```

4. **Build the Project**
   ```bash
   pnpm build
   ```

5. **Start the Bot**
   ```bash
   pnpm start
   ```

---

## 🧪 Development

### Run in Dev Mode
```bash
pnpm dev
```

### Project Structure

- `src/api` — API client for Vybe endpoints  
- `src/commands` — Telegram command handlers  
- `src/services` — Chart generation and utilities  
- `src/types` — TypeScript types and models  
- `src/utils` — Helpers for formatting and message rendering

---

## 🚀 Deployment

### Production Setup

1. Set environment variables:
   ```env
   NODE_ENV=production
   BOT_TOKEN=your_token
   VYBE_API_KEY=your_api_key
   PORT=3000
   ```

2. Build and run:
   ```bash
   pnpm build
   pnpm start
   ```

---

## 🔍 Sample Interactions

### Token Lookup
```bash
/token 9pfHkYXunNmCoNaxtBgUichH781ewnmBGb6iLPNyLSv
```
Returns:
- Price, market cap, volume, and holders
- Top holders with links to AlphaVybe

### Wallet Snapshot
```bash
/wallet YOUR_WALLET_ADDRESS
```
Returns:
- Token balances with USD value
- Portfolio charts and value trends

---

## 📊 Metrics Breakdown

### Token Metrics
- Price, 24h change, volume
- Market cap, supply, holder count
- Whale activity and transfers

### Wallet Metrics
- Token balances and total value
- Historical portfolio trends
- NFT holdings *(coming soon)*

### Program Metrics
- TVL, DAU, transactions, instructions
- Performance history

### Market Metrics
- Volume leaders
- Price gainers
- Market trends and comparisons

---

## 📎 Links

- [Vybe API Docs](https://docs.vybe.finance)

---

## 🪪 License

This project is licensed under the **MIT License** — see the `LICENSE` file for full details.