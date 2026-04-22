"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { judges } from "@/lib/judges";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWallet } from "@/lib/genlayer/wallet";
import { useSubmitCase } from "@/lib/hooks/useSupremeHighCryptoCourt";

const examples = [
  "Layer 2 sequencer decentralization should be treated as a constitutional requirement before any rollup can call itself trustless infrastructure.",
  "A DeFi lending protocol should use AI agents to set collateral factors, but every model decision must be disputeable and reproducible on-chain.",
  "Solana-style high throughput is more important for mainstream crypto adoption than maximum decentralization at the base layer.",
];

function GavelMark() {
  return (
    <svg className="gavel-mark" viewBox="0 0 160 160" role="img" aria-label="Court gavel">
      <path d="M45 111h78c8 0 14 6 14 14v3H31v-3c0-8 6-14 14-14Z" />
      <path d="m67 67 19-19 49 49-19 19z" />
      <path d="m43 44 22-22 27 27-22 22z" />
      <path d="m90 94 12-12 40 40-12 12z" />
      <path d="M20 132h120v12H20z" />
    </svg>
  );
}

function DeliberationCurtain({ active, mode }: { active: boolean; mode: "standard" | "critical" }) {
  if (!active) {
    return null;
  }

  return (
    <div className="curtain-overlay" role="status" aria-live="polite">
      <div className="curtain-panel left" />
      <div className="curtain-panel right" />
      <div className="deliberation-box">
        <GavelMark />
        <p className="eyebrow">Curtains closed</p>
        <h2>The jury is deliberating.</h2>
        <p>Eight judge profiles are weighing the case through GenLayer consensus.</p>
        <p className="deliberation-mode">
          {mode === "critical" ? "Critical analysis chamber" : "Standard verdict chamber"}
        </p>
        <div className="thinking-row">
          {judges.map((judge, index) => (
            <span key={judge.id} style={{ animationDelay: `${index * 120}ms` }}>
              {judge.shortName}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [caseText, setCaseText] = useState("");
  const [pendingMode, setPendingMode] = useState<"standard" | "critical">("standard");
  const wallet = useWallet();
  const submitCase = useSubmitCase();
  const contractAddress = getContractAddress();

  const trimmedLength = caseText.trim().length;
  const canSubmit = useMemo(() => {
    return trimmedLength >= 50 && trimmedLength <= 2000 && wallet.isConnected && !!contractAddress;
  }, [trimmedLength, wallet.isConnected, contractAddress]);

  const submit = (mode: "standard" | "critical") => {
    if (!canSubmit) {
      return;
    }
    setPendingMode(mode);
    submitCase.mutate({ caseText: caseText.trim(), mode });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit("standard");
  };

  return (
    <main className="court-shell">
      <DeliberationCurtain active={submitCase.isPending} mode={pendingMode} />

      <nav className="court-nav" aria-label="Court navigation">
        <Link href="/" className="brand-lockup">
          <span className="brand-icon">
            <GavelMark />
          </span>
          <span>Supreme High Crypto Court</span>
        </Link>
        <div className="nav-actions">
          <Link href="/archives">Verdict archive</Link>
          <button type="button" onClick={wallet.connectWallet} disabled={wallet.isLoading}>
            {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Connect wallet"}
          </button>
        </div>
      </nav>

      <section className="hero-stage" aria-labelledby="court-title">
        <div className="hero-copy">
          <p className="eyebrow">Live GenLayer deliberation court</p>
          <h1 id="court-title">Put your crypto thesis on trial.</h1>
          <p className="intro">
            File a Web3 case and watch eight public thinker profiles weigh it from protocol ethics,
            proof systems, performance, adoption, sovereignty, AI, and oracle infrastructure.
          </p>
          <div className="hero-stats" aria-label="Court panel summary">
            <span><strong>8</strong> judges</span>
            <span><strong>100</strong> point scale</span>
            <span><strong>1</strong> final verdict</span>
          </div>
        </div>

        <div className="gavel-stage" aria-hidden="true">
          <div className="light-ring" />
          <GavelMark />
          <span>Order</span>
        </div>
      </section>

      <section className="bench-stage" aria-label="Jury bench">
        <div className="bench-header">
          <div>
            <p className="eyebrow">Jury bench</p>
            <h2>Every case is judged by all eight profiles.</h2>
          </div>
          <span className="bench-status">Standing by</span>
        </div>
        <div className="judge-bench">
          {judges.map((judge) => (
            <article className="judge-seat" key={judge.id}>
              <div className="portrait-frame">
                <Image src={judge.image} alt={judge.name} fill sizes="(max-width: 768px) 42vw, 12vw" priority={judge.id === "vitalik_buterin"} />
              </div>
              <div>
                <h3>{judge.shortName}</h3>
                <p>{judge.bench}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="case-floor">
        <section className="filing-desk" aria-label="Case filing">
          <div className="section-head">
            <p className="eyebrow">Case filing</p>
            <h2>State the argument. The court handles the judgment.</h2>
          </div>

          <form onSubmit={onSubmit} className="case-form">
            <label htmlFor="caseText">Crypto case brief</label>
            <textarea
              id="caseText"
              value={caseText}
              onChange={(event) => setCaseText(event.target.value)}
              minLength={50}
              maxLength={2000}
              placeholder="Example: L2 sequencers should be decentralized before rollups can claim credible neutrality..."
            />
            <div className="form-row">
              <span className={trimmedLength > 2000 || (trimmedLength > 0 && trimmedLength < 50) ? "bad-count" : ""}>
                {trimmedLength} / 2000 characters
              </span>
              <div className="action-row">
                <button type="submit" className="primary-action" disabled={!canSubmit || submitCase.isPending}>
                  {submitCase.isPending && pendingMode === "standard" ? "Curtains closing..." : "Strike the gavel"}
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={!canSubmit || submitCase.isPending}
                  onClick={() => submit("critical")}
                >
                  {submitCase.isPending && pendingMode === "critical" ? "Running analysis..." : "Critical analysis"}
                </button>
              </div>
            </div>
            {!wallet.isConnected && <p className="notice">Connect a wallet before filing a case.</p>}
            {!contractAddress && <p className="notice">Contract address is not configured yet.</p>}
            {submitCase.error && <p className="error-text">{submitCase.error.message}</p>}
          </form>
        </section>

        <aside className="clerk-panel">
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
            Crypto jurisdiction only. Non-crypto filings are dismissed before the curtain closes.
          </div>
        </aside>
      </section>
    </main>
  );
}
