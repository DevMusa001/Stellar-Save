# Stellar Save Frontend

Frontend single-page application (SPA) for Stellar Save built with React, TypeScript, Vite, and Material-UI (MUI).

## Development & Setup

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Local Run
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start local development server with HMR
npm run dev
```

### Build & Testing
```bash
# Type-check and build production bundle
npm run build

# Run ESLint code quality checks
npm run lint

# Run unit and component tests (Vitest)
npm run test

# Run tests with code coverage report
npm run test:coverage
```

## Environment Configuration

Copy the example environment file `.env.example` in the root or create `.env` in `frontend/`:

```bash
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_GUESS_THE_NUMBER=<your-contract-id>
VITE_CONTRACT_FUNGIBLE_ALLOWLIST=<your-contract-id>
VITE_CONTRACT_NFT_ENUMERABLE=<your-contract-id>
```

> **Note**: Variables prefixed with `VITE_` are exposed to the browser. Do not include private keys or sensitive administrative credentials in frontend environment files.

## Component Architecture & Design System

The frontend uses Material-UI with a centralized theme and wrapper layer:
- **Design Tokens**: `src/ui/theme/tokens.ts`
- **Theme Configuration**: `src/ui/theme/theme.ts`
- **App Theme Provider**: `src/ui/providers/AppThemeProvider.tsx`
- **Component Wrappers**: `src/ui/components/index.ts`
- **App Layout**: `src/ui/layout/AppLayout.tsx`
- **Detailed UI Guide**: Refer to [docs/ui-component-library.md](../docs/ui-component-library.md)

## Wallet Integration

Stellar wallet connection adapters and providers are defined in:
- `src/wallet/WalletProvider.tsx`
- `src/wallet/freighterAdapter.ts`
- `src/wallet/types.ts`
