# Supreme High Crypto Court Notes

Use `contracts/supreme_high_crypto_court.py` for the GenLayer intelligent contract.

Contract quality gate:

```shell
genvm-lint check contracts/supreme_high_crypto_court.py
```

Deploy target:

```shell
genlayer account use launchguard-deployer
genlayer network set studionet
genlayer deploy --contract contracts/supreme_high_crypto_court.py
```

Frontend lives in `frontend/` and expects `NEXT_PUBLIC_CONTRACT_ADDRESS` plus the Studio RPC variables.
