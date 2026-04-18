"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { judges } from "@/lib/judges";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWallet } from "@/lib/genlayer/wallet";
import { useSubmitCase } from "@/lib/hooks/useSupremeHighCryptoCourt";

const examples = [
  "Ethereum should move faster on single-slot finality, even if it increases validator hardware requirements.",
  "A DeFi lending protocol should use AI agents to set collateral factors, but only if every decision is disputeable on-chain.",
  "Solana-style high throughput is more important for mainstream crypto adoption than maximum decentralization at the base layer.",
];

export default function Home() {
  const [caseText, setCaseText] = useState("");
  const wallet = useWallet();
  const submitCase = useSubmitCase();
  const contractAddress = getContractAddress();

  const canSubmit = useMemo(() => {
    return caseText.trim().length >= 50 && caseText.trim().length <= 2000 && wallet.isConnected && !!contractAddress;
  }, [caseText, wallet.isConnected, contractAddress]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    submitCase.mutate(caseText.trim());
  };

  return (
    <main className="court-shell">
      <section className="court-hero" aria-labelledby="court-title">
        <div className="court-topbar">
          <span>Supreme High Crypto Court</span>
          <Link href="/archives">Public docket</Link>
        </div>

        <div className="courtroom">
          <div className="seal">SHCC</div>
          <div className="bench-label">The court is now in session</div>
          <div className="judge-bench">
            {judges.map((judge) => (
              <article className="judge-seat" key={judge.id}>
                <div className="portrait-frame">
                  <Image src={judge.image} alt={judge.name} fill sizes="(max-width: 768px) 40vw, 12vw" />
                </div>
                <h2>{judge.shortName}</h2>
                <p>{judge.bench}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="case-floor">
          <section className="filing-desk" aria-labelledby="court-title">
            <p className="eyebrow">GenLayer AI consensus docket</p>
            <h1 id="court-title">Present your crypto case before the highest court.</h1>
            <p className="intro">
              File a Web3 proposal, controversy, protocol thesis, tokenomics argument, or crypto governance case.
              Eight AI judge profiles will score it from 0 to 100 and issue a final average ruling.
            </p>

            <form onSubmit={onSubmit} className="case-form">
              <label htmlFor="caseText">Case brief</label>
              <textarea
                id="caseText"
                value={caseText}
                onChange={(event) => setCaseText(event.target.value)}
                minLength={50}
                maxLength={2000}
                placeholder="Your Honor, this case concerns..."
              />
              <div className="form-row">
                <span className={caseText.length > 2000 || (caseText.length > 0 && caseText.length < 50) ? "bad-count" : ""}>
                  {caseText.length} / 2000 characters
                </span>
                <button type="submit" disabled={!canSubmit || submitCase.isPending}>
                  {submitCase.isPending ? "Court deliberating..." : "File your case"}
                </button>
              </div>
              {!wallet.isConnected && <p className="notice">Connect a wallet before filing a case.</p>}
              {!contractAddress && <p className="notice">Contract address is not configured yet.</p>}
              {submitCase.error && <p className="error-text">{submitCase.error.message}</p>}
            </form>
          </section>

          <aside className="clerk-panel">
            <div>
              <p className="eyebrow">Petitioner</p>
              <button type="button" onClick={wallet.connectWallet} disabled={wallet.isLoading}>
                {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Connect wallet"}
              </button>
            </div>
            <div>
              <p className="eyebrow">Admissible examples</p>
              <ul>
                {examples.map((example) => (
                  <li key={example}>
                    <button type="button" onClick={() => setCaseText(example)}>
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="jurisdiction">
              Crypto jurisdiction only. Non-crypto filings are dismissed before judgment.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
