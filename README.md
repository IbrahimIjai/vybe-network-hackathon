# VybeBot - Real-time On-chain Analytics for Telegram

VybeBot is a powerful Telegram bot that delivers real-time on-chain analytics for the Solana ecosystem, powered by Vybe APIs. The bot provides actionable crypto insights directly in Telegram, with easy links to [AlphaVybe](https://alphavybe.xyz) for deeper analytics.

## Features

### Token Analytics

- **Token Details**: Comprehensive token information including price, market cap, volume, and supply metrics
- **Price Charts**: Visual price history with customizable time periods
- **Token Holders**: Distribution analytics with top holders and concentration metrics
- **Whale Tracking**: Monitoring of large transfers with detailed transaction information

### Wallet Analytics

- **Portfolio Overview**: View token holdings with total value and distribution charts
- **Historical Analysis**: Track portfolio value changes over time
- **Multi-wallet Comparison**: Compare balances across multiple addresses

### Program Analytics

- **Program Metrics**: TVL, active users, transaction volume, and more
- **Program Activity**: Historical activity charts and user engagement metrics
- **Program Discovery**: Find and analyze Solana programs by ID or name

### Market Analytics

- **Trending Tokens**: Discover top tokens by volume and price performance
- **Token Comparisons**: Compare multiple tokens across key metrics with visual charts
- **Market Insights**: Track market movements and emerging trends

## Commands

- `/token <symbol/address>` - Get detailed token information
- `/price <symbol/address> [timeframe]` - Get token price chart
- `/wallet <address>` - Get wallet token holdings
- `/holders <symbol/address>` - Get top token holders
- `/whales <symbol/address>` - Track large token transfers
- `/program <program_id>` - Get program details
- `/trending` - Show trending tokens
- `/compare <token1,token2,...>` - Compare token metrics
- `/help` - Show help information

## Installation

### Prerequisites

- Node.js (v16+)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Vybe API Key (from [Vybe](https://t.me/ericvybes))

### Setup

1. Clone the repository

   ```
   git clone https://github.com/your-username/vybe-telegram-bot.git
   cd vybe-telegram-bot
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Create `.env` file with your configuration

   ```
   BOT_TOKEN=your_telegram_bot_token_here
   VYBE_API_KEY=your_vybe_api_key_here
   PORT=3000
   ALPHA_VYBE_URL=https://alphavybe.xyz
   ```

4. Build the project

   ```
   npm run build
   ```

5. Start the bot
   ```
   npm start
   ```

## Development

### Development Mode

Run the bot in development mode with hot-reloading:

```
npm run dev
```

### Project Structure

- `src/api`: API client for Vybe services
- `src/commands`: Command handlers for bot interactions
- `src/services`: Utility services for chart generation and data processing
- `src/types`: TypeScript interfaces for API responses and data models
- `src/utils`: Utility functions for formatting and message generation

## Deployment

### Production Setup

1. Set environment variables for production

   ```
   NODE_ENV=production
   BOT_TOKEN=your_telegram_bot_token
   VYBE_API_KEY=your_vybe_api_key
   PORT=3000
   WEBHOOK_URL=https://your-webhook-url.com/botYOUR_BOT_TOKEN
   ```

2. Build the project

   ```
   npm run build
   ```

3. Start in production mode
   ```
   npm start
   ```

## Samples

Here are some example interactions with the bot:

### Token Details

Command: `/token SOL`

- Returns comprehensive token information including price, market cap, volume, and holders count
- Includes top holders information and links to AlphaVybe for more analytics

### Price Chart

Command: `/price SOL 7d`

- Generates a 7-day price chart for SOL token
- Displays current price and performance metrics

### Wallet Analysis

Command: `/wallet ADDRESS`

- Shows token holdings with USD value
- Generates portfolio distribution charts and historical value trends

### Whale Movements

Command: `/whales SOL`

- Tracks large token transfers
- Shows sender/receiver addresses and transaction values

## Metrics Provided

VybeBot provides a wide range of metrics across different categories:

### Token Metrics

- Current price and 24h change
- Market capitalization
- Trading volume (24h)
- Holders count
- Transfer activity
- Supply distribution
- Whale movements

### Wallet Metrics

- Token balances with USD values
- Portfolio distribution
- Historical portfolio value
- NFT holdings (coming soon)

### Program Metrics

- Total Value Locked (TVL)
- Daily Active Users (DAU)
- Transaction count
- Instruction count
- Historical performance

### Market Metrics

- Volume leaders
- Price gainers
- Trading pairs activity
- Market trends

## Links

- [AlphaVybe Analytics](https://alphavybe.xyz)
- [Vybe API Documentation](https://docs.vybe.finance/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
