# Supreme High Crypto Court

A GenLayer dApp where users file crypto cases before an AI court. The intelligent contract evaluates each case through eight public Web3 thinker profiles and stores the ruling on-chain.

## Live Deployment

- App: https://supreme-high-crypto-court.vercel.app
- GitHub: https://github.com/TS-mfon/supreme-high-crypto-court
- GenLayer contract: `0x65DCBB97B0E4aEABF0CbFF18E43b2FF7C2FE7052`

## Stack

- GenLayer intelligent contract
- Next.js frontend
- TanStack Query
- GenLayer JS SDK

## Contract

The contract lives at `contracts/supreme_high_crypto_court.py`.

```shell
genvm-lint check contracts/supreme_high_crypto_court.py
genlayer deploy --contract contracts/supreme_high_crypto_court.py
```

The intended deploy network is GenLayer Studio:

```shell
genlayer network set studionet
genlayer account use launchguard-deployer
```

## Frontend

```shell
cd frontend
npm install
npm run dev
```

Set these variables in `frontend/.env.local`:

```shell
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studio
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

## Notes

The judge outputs are AI evaluations based on public thinking profiles. They are not statements, endorsements, or participation by the named individuals.
