"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { judges, judgesById, type JudgeId } from "@/lib/judges";
import type {
  AnalysisMode,
  ComprehensiveNarrative,
  MarketNarrative,
  MarketSnapshot,
  QuantitativeAxes,
} from "@/lib/contracts/types";
import { useCourtCase } from "@/lib/hooks/useSupremeHighCryptoCourt";

function formatDate(value: string) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Recorded on-chain";
  }
  return new Date(timestamp * 1000).toLocaleString();
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

export default function CasePage() {
  const params = useParams<{ caseId: string }>();
  const caseId = Number(params.caseId);
  const courtCase = useCourtCase(Number.isFinite(caseId) ? caseId : null);

  if (courtCase.isLoading) {
    return (
      <main className="court-shell verdict-shell">
        <div className="loading-chamber">
          <div className="seal">SHCC</div>
          <h1>The court record is being retrieved.</h1>
          <p>GenLayer is opening the docket.</p>
        </div>
      </main>
    );
  }

  if (courtCase.error || !courtCase.data) {
    return (
      <main className="court-shell verdict-shell">
        <div className="loading-chamber">
          <h1>Case not found.</h1>
          <p>{courtCase.error?.message ?? "The docket does not contain this case."}</p>
          <Link href="/">Return to court</Link>
        </div>
      </main>
    );
  }

  const data = courtCase.data;
  const showsAxes = data.analysis_mode !== "standard";

  return (
    <main className="court-shell verdict-shell">
      <div className="court-topbar">
        <Link href="/">File another case</Link>
        <Link href="/archives">Public docket</Link>
      </div>

      <section className="verdict-header">
        <p className="eyebrow">Case #{data.case_id}</p>
        <h1>{data.verdict}</h1>
        <span className="mode-badge">{modeLabel(data.analysis_mode)}</span>
        <div className="score-medallion">
          <strong>{data.final_score}</strong>
          <span>/100</span>
        </div>
        <p>{formatDate(data.created_at)}</p>
      </section>

      <section className="case-transcript">
        <p className="eyebrow">Filed brief</p>
        <blockquote>{data.case_text}</blockquote>
      </section>

      <QuantSummaryPanel
        title={data.analysis_mode === "market" ? "Quantitative market summary" : "Quantitative summary"}
        summary={data.quant_summary}
      />
      <NarrativePanel mode={data.analysis_mode} narrative={data.narrative_summary} />
      <MarketPanel snapshot={data.market_snapshot} />

      <section className="verdict-grid" aria-label="Judge scores">
        {judges.map((judge) => {
          const evaluation = data.evaluations[judge.id as JudgeId];
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
