# VybeBot Architecture

## System Overview

VybeBot is built with a modular architecture that separates concerns between API interactions, command handling, and data presentation.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        Telegram Platform                        │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         Telegram Bot API                        │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                          VybeBot Server                         │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │                 │    │                 │    │              │ │
│  │  Command Router │◄──►│ Command Handlers│◄──►│ Data Services│ │
│  │                 │    │                 │    │              │ │
│  └────────┬────────┘    └────────┬────────┘    └──────┬───────┘ │
│           │                      │                    │         │
│           │                      │                    │         │
│           ▼                      ▼                    ▼         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │                 │    │                 │    │              │ │
│  │  Message Utils  │    │  Chart Service  │    │  Format Utils│ │
│  │                 │    │                 │    │              │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                           Vybe API                              │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │                 │    │                 │    │              │ │
│  │ Token Endpoints │    │ Account Endpoints│   │Price Endpoints│ │
│  │                 │    │                 │    │              │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │                 │    │                 │                     │
│  │Program Endpoints│    │ WebSocket APIs  │                     │
│  │                 │    │                 │                     │
│  └─────────────────┘    └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Descriptions

### 1. Command Router (index.ts)

The central module that initializes the bot, registers commands, and handles incoming messages from Telegram users. It routes each command to the appropriate handler.

### 2. Command Handlers (src/commands/\*)

Each command has a dedicated handler that processes user input, interacts with the API, and formats responses. Command handlers include:

- Token details (token.ts)
- Price charts (price.ts)
- Wallet analytics (wallet.ts)
- Whale tracking (whales.ts)
- Program analytics (program.ts)
- Trending tokens (trending.ts)
- Token holders (holders.ts)
- Token comparison (compare.ts)
- Help information (help.ts)

### 3. Data Services

Services responsible for data transformation and business logic:

- **Vybe API Client** (api/vybe.ts): Manages all interactions with Vybe API endpoints
- **Chart Service** (services/chart.ts): Generates visual charts for data representation

### 4. Utility Modules

Helper modules for consistent data presentation:

- **Format Utils** (utils/format.ts): Standardized formatting of numbers, addresses, and dates
- **Message Utils** (utils/message.ts): Templates for message responses with consistent styling

## Data Flow

1. **User Input**: User sends a command to the bot via Telegram
2. **Command Routing**: index.ts routes the command to the appropriate handler
3. **API Interaction**: Command handler requests data from Vybe API
4. **Data Processing**: Command handler processes and transforms the data
5. **Chart Generation** (if needed): Chart service generates visual representations
6. **Response Formatting**: Format and message utils prepare the response
7. **User Response**: Formatted message sent back to the user via Telegram

## Technologies Used

- **Bot Framework**: Grammy.js (TypeScript-based Telegram bot framework)
- **Server**: Node.js with Express for webhooks in production
- **Charting**: Chart.js with chartjs-node-canvas for server-side rendering
- **HTTP Client**: Axios for API requests
- **Date Formatting**: Moment.js for consistent date representations
- **Development**: TypeScript for type safety and better development experience
