"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { judges, judgesById, type JudgeId } from "@/lib/judges";
import { useCourtTransaction } from "@/lib/hooks/useSupremeHighCryptoCourt";
import type {
  AnalysisMode,
  ComprehensiveNarrative,
  MarketNarrative,
  MarketSnapshot,
  QuantitativeAxes,
  RecoveredCourtCase,
  TransactionReceipt,
} from "@/lib/contracts/types";

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function toQuantitativeAxes(value: unknown): QuantitativeAxes | null {
  if (!isObject(value)) {
    return null;
  }

  const innovation = Number(value.innovation);
  const execution = Number(value.execution);
  const decentralization = Number(value.decentralization);
  const adoption = Number(value.adoption);
  const strategic_fit = Number(value.strategic_fit);

  if (
    !Number.isFinite(innovation) ||
    !Number.isFinite(execution) ||
    !Number.isFinite(decentralization) ||
    !Number.isFinite(adoption) ||
    !Number.isFinite(strategic_fit)
  ) {
    return null;
  }

  return { innovation, execution, decentralization, adoption, strategic_fit };
}

function toAnalysisMode(value: unknown): AnalysisMode {
  return value === "critical" || value === "comprehensive" || value === "market" ? value : "standard";
}

function toNarrativeSummary(value: unknown): ComprehensiveNarrative | MarketNarrative | null {
  if (!isObject(value)) {
    return null;
  }
  return value as ComprehensiveNarrative | MarketNarrative;
}

function toMarketSnapshot(value: unknown): MarketSnapshot | null {
  if (!isObject(value) || !isObject(value.top_assets)) {
    return null;
  }

  const topAssets: Record<string, { price: number; range_position: number }> = {};
  for (const [symbol, asset] of Object.entries(value.top_assets)) {
    if (!isObject(asset)) {
      return null;
    }
    const price = Number(asset.price);
    const rangePosition = Number(asset.range_position);
    if (!Number.isFinite(price) || !Number.isFinite(rangePosition)) {
      return null;
    }
    topAssets[String(symbol)] = { price, range_position: rangePosition };
  }

  return {
    market_mood: String(value.market_mood ?? ""),
    market_cap_signal: Number(value.market_cap_signal ?? 0),
    volume_signal: Number(value.volume_signal ?? 0),
    top_assets: topAssets,
  };
}

function modeLabel(mode: AnalysisMode) {
  if (mode === "critical") return "Critical analysis";
  if (mode === "comprehensive") return "Comprehensive analysis";
  if (mode === "market") return "Market sentiment";
  return "Standard verdict";
}

const axisLabels: Record<keyof QuantitativeAxes, string> = {
  innovation: "Innovation",
  execution: "Execution",
  decentralization: "Decentralization",
  adoption: "Adoption",
  strategic_fit: "Strategic fit",
};

function QuantSummaryPanel({
  title,
  summary,
}: {
  title: string;
  summary: QuantitativeAxes | null | undefined;
}) {
  if (!summary) return null;

  return (
    <section className="metrics-panel">
      <p className="eyebrow">{title}</p>
      <div className="metrics-grid">
        {Object.entries(summary).map(([axis, score]) => (
          <article className="metric-card" key={axis}>
            <span>{axisLabels[axis as keyof QuantitativeAxes]}</span>
            <strong>{score}/100</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function NarrativePanel({
  mode,
  narrative,
}: {
  mode: AnalysisMode;
  narrative: ComprehensiveNarrative | MarketNarrative | null | undefined;
}) {
  if (!narrative) return null;

  if (mode === "comprehensive") {
    const report = narrative as ComprehensiveNarrative;
    return (
      <section className="metrics-panel">
        <p className="eyebrow">Comprehensive report</p>
        <div className="narrative-grid">
          <article className="metric-card wide">
            <span>Decision basis</span>
            <p>{report.decision_basis}</p>
          </article>
          <article className="metric-card wide">
            <span>Why rejected</span>
            <ul className="narrative-list">
              {report.why_rejected.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="metric-card wide">
            <span>Improvements</span>
            <ul className="narrative-list">
              {report.improvements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="metric-card wide">
            <span>Suggestions</span>
            <ul className="narrative-list">
              {report.suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    );
  }

  if (mode === "market") {
    const report = narrative as MarketNarrative;
    return (
      <section className="metrics-panel">
        <p className="eyebrow">Market sentiment report</p>
        <div className="narrative-grid">
          <article className="metric-card wide">
            <span>Sentiment take</span>
            <p>{report.sentiment_take}</p>
          </article>
          <article className="metric-card wide">
            <span>Market risks</span>
            <ul className="narrative-list">
              {report.market_risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="metric-card wide">
            <span>Market opportunities</span>
            <ul className="narrative-list">
              {report.market_opportunities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="metric-card wide">
            <span>Timing note</span>
            <p>{report.timing_note}</p>
          </article>
        </div>
      </section>
    );
  }

  return null;
}

function MarketPanel({ snapshot }: { snapshot: MarketSnapshot | null | undefined }) {
  if (!snapshot) return null;

  return (
    <section className="metrics-panel">
      <p className="eyebrow">Market snapshot</p>
      <div className="metrics-grid">
        <article className="metric-card">
          <span>Market mood</span>
          <strong>{snapshot.market_mood}</strong>
        </article>
        <article className="metric-card">
          <span>Market cap signal</span>
          <strong>{snapshot.market_cap_signal}/100</strong>
        </article>
        <article className="metric-card">
          <span>Volume signal</span>
          <strong>{snapshot.volume_signal}/100</strong>
        </article>
      </div>
      <div className="market-assets">
        {Object.entries(snapshot.top_assets).map(([symbol, asset]) => (
          <article className="metric-card" key={symbol}>
            <span>{symbol}</span>
            <strong>${asset.price.toLocaleString()}</strong>
            <p>24h range position: {asset.range_position}/100</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function recoverCaseFromReceipt(receipt?: TransactionReceipt): RecoveredCourtCase | null {
  const leaderReceipts = Array.isArray(receipt?.consensus_data?.leader_receipt)
    ? receipt?.consensus_data?.leader_receipt
    : [];

  for (const leaderReceipt of leaderReceipts) {
    if (!isObject(leaderReceipt?.eq_outputs)) {
      continue;
    }

    for (const value of Object.values(leaderReceipt.eq_outputs)) {
      const payload = isObject(value) && "payload" in value ? value.payload : value;

      if (isObject(payload) && typeof payload.readable === "string") {
        const jsonText = extractJsonObject(payload.readable) ?? payload.readable;
        try {
          const parsed = JSON.parse(jsonText);
          if (isObject(parsed) && isObject(parsed.evaluations)) {
            return {
              case_id: null,
              case_text: "",
              analysis_mode: toAnalysisMode(parsed.analysis_mode),
              evaluations: parsed.evaluations as Record<JudgeId, any>,
              quant_summary: toQuantitativeAxes(parsed.quant_summary),
              narrative_summary: toNarrativeSummary(parsed.narrative_summary),
              market_snapshot: toMarketSnapshot(parsed.market_snapshot),
              final_score: Number(parsed.final_score ?? 0),
              verdict: String(parsed.verdict ?? "UNAVAILABLE"),
              created_at: "0",
              crypto_relevance_reason:
                parsed.crypto_relevance_reason === undefined
                  ? undefined
                  : String(parsed.crypto_relevance_reason),
              is_crypto_case:
                typeof parsed.is_crypto_case === "boolean" ? parsed.is_crypto_case : undefined,
            };
          }
        } catch {
          continue;
        }
      }
    }
  }

  return null;
}

function getRuntimeError(receipt?: TransactionReceipt): string | null {
  const leaderReceipts = Array.isArray(receipt?.consensus_data?.leader_receipt)
    ? receipt?.consensus_data?.leader_receipt
    : [];

  for (const leaderReceipt of leaderReceipts) {
    const stderr = leaderReceipt?.genvm_result?.stderr;
    if (typeof stderr === "string" && stderr.trim()) {
      return stderr.trim();
    }
  }

  return null;
}

function extractCaseText(receipt?: TransactionReceipt): string {
  const decoded = isObject(receipt?.txDataDecoded) ? receipt?.txDataDecoded : null;
  const callData = decoded && isObject(decoded.callData) ? decoded.callData : null;
  const callArgs = callData?.args;
  if (Array.isArray(callArgs) && typeof callArgs[0] === "string") {
    return callArgs[0];
  }
  return "";
}

export default function TransactionResultPage() {
  const params = useParams<{ txHash: string }>();
  const txHash = params.txHash;
  const transaction = useCourtTransaction(txHash);
  const recovered = recoverCaseFromReceipt(transaction.data);
  const runtimeError = getRuntimeError(transaction.data);
  const caseText = extractCaseText(transaction.data);
  const statusName = transaction.data?.statusName ?? "PENDING";
  const isThinking = ["PENDING", "PROPOSING", "COMMITTING", "REVEALING"].includes(statusName);
  const showsAxes = recovered?.analysis_mode !== "standard";

  if (transaction.isLoading && !transaction.data) {
    return (
      <main className="court-shell verdict-shell">
        <div className="loading-chamber">
          <div className="seal">SHCC</div>
          <h1>The jury is assembling.</h1>
          <p>The court is polling GenLayer for this transaction.</p>
        </div>
      </main>
    );
  }

  if (transaction.error && !transaction.data) {
    return (
      <main className="court-shell verdict-shell">
        <div className="loading-chamber">
          <h1>Transaction unavailable.</h1>
          <p>{transaction.error.message}</p>
          <Link href="/">Return to court</Link>
        </div>
      </main>
    );
  }

  if (!recovered) {
    return (
      <main className="court-shell verdict-shell">
        <div className="court-topbar">
          <Link href="/">File another case</Link>
          <Link href="/archives">Public docket</Link>
        </div>

        <div className="loading-chamber">
          <div className="seal">SHCC</div>
          <h1>{isThinking ? "The jury is deliberating." : "The record is incomplete."}</h1>
          <p>Transaction status: {statusName}</p>
          {runtimeError && <p className="error-text">{runtimeError.split("\n")[0]}</p>}
          <p className="muted-hash">{txHash}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="court-shell verdict-shell">
      <div className="court-topbar">
        <Link href="/">File another case</Link>
        <Link href="/archives">Public docket</Link>
      </div>

      <section className="verdict-header">
        <p className="eyebrow">Recovered from transaction</p>
        <h1>{recovered.verdict}</h1>
        <span className="mode-badge">{modeLabel(recovered.analysis_mode)}</span>
        <div className="score-medallion">
          <strong>{recovered.final_score}</strong>
          <span>/100</span>
        </div>
        <p>Transaction status: {statusName}</p>
      </section>

      <section className="case-transcript">
        <p className="eyebrow">Filed brief</p>
        <blockquote>{caseText || "The brief was recovered from the transaction receipt."}</blockquote>
      </section>

      {runtimeError && (
        <section className="case-transcript">
          <p className="eyebrow">Contract runtime error</p>
          <blockquote>{runtimeError.split("\n")[0]}</blockquote>
        </section>
      )}

      <QuantSummaryPanel
        title={recovered.analysis_mode === "market" ? "Quantitative market summary" : "Quantitative summary"}
        summary={recovered.quant_summary}
      />
      <NarrativePanel mode={recovered.analysis_mode} narrative={recovered.narrative_summary} />
      <MarketPanel snapshot={recovered.market_snapshot} />

      <section className="verdict-grid" aria-label="Judge scores">
        {judges.map((judge) => {
          const evaluation = recovered.evaluations[judge.id as JudgeId];
          const score = evaluation?.score ?? 0;
          return (
            <article className="verdict-card" key={judge.id}>
              <div className="verdict-card-top">
                <div className="portrait-frame small">
                  <Image src={judge.image} alt={judge.name} fill sizes="96px" />
                </div>
                <div>
                  <p className="eyebrow">{judgesById[judge.id].bench}</p>
                  <h2>{judge.name}</h2>
                  <span>{evaluation?.verdict_word ?? "Filed"}</span>
                </div>
                <strong className="score-pill">{score}/100</strong>
              </div>
              <div className="score-bar" aria-hidden="true">
                <span style={{ width: `${score}%` }} />
              </div>
              <p className="key-point">{evaluation?.key_point ?? judge.profile}</p>
              {showsAxes && evaluation?.quantitative_axes && (
                <div className="judge-axes">
                  {Object.entries(evaluation.quantitative_axes).map(([axis, axisScore]) => (
                    <div className="axis-chip" key={axis}>
                      <span>{axisLabels[axis as keyof QuantitativeAxes]}</span>
                      <strong>{axisScore}</strong>
                    </div>
                  ))}
                </div>
              )}
              <p>{evaluation?.reasoning ?? "No reasoning returned for this judge."}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
