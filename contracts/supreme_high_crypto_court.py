# { "Depends": "py-genlayer:latest" }

import json
from dataclasses import dataclass
from genlayer import *


ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"
ERROR_EXTERNAL = "[EXTERNAL]"

MIN_CASE_LENGTH = 50
MAX_CASE_LENGTH = 2000

STANDARD_MODE = "standard"
CRITICAL_MODE = "critical"
COMPREHENSIVE_MODE = "comprehensive"
MARKET_MODE = "market"

MARKET_API_URL = "https://api.cryptorank.io/v2/currencies?limit=100"
MARKET_API_KEY = "21033f75cce5e65079671f07d10bab279278e47ae9aaf6e4973d7599dcb8"

JUDGE_IDS = (
    "vitalik_buterin",
    "gavin_wood",
    "sergey_nazarov",
    "anatoly_yakovenko",
    "eli_ben_sasson",
    "illia_polosukhin",
    "balaji_srinivasan",
    "changpeng_zhao",
)

QUANT_AXES = (
    "innovation",
    "execution",
    "decentralization",
    "adoption",
    "strategic_fit",
)

MARKET_SYMBOLS = ("BTC", "ETH", "SOL", "LINK", "BNB")
MODE_VALUES = (STANDARD_MODE, CRITICAL_MODE, COMPREHENSIVE_MODE, MARKET_MODE)


@allow_storage
@dataclass
class CourtCase:
    case_id: u256
    submitter: Address
    case_text: str
    analysis_mode: str
    evaluations_json: str
    quant_summary_json: str
    narrative_summary_json: str
    market_snapshot_json: str
    final_score: u256
    verdict: str
    created_at: str


def _verdict_for_score(score: int) -> str:
    if score >= 85:
        return "LANDMARK RULING"
    if score >= 70:
        return "APPROVED"
    if score >= 55:
        return "PROVISIONAL"
    if score >= 40:
        return "DISPUTED"
    if score >= 25:
        return "REJECTED"
    return "CONTEMPT OF CRYPTO COURT"


def _clamp_score(raw) -> int:
    try:
        value = int(round(float(str(raw).strip())))
    except (ValueError, TypeError):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-numeric score: {raw}")
    if value < 0:
        return 0
    if value > 100:
        return 100
    return value


def _require_text(value, field_name: str, max_len: int = 320) -> str:
    if value is None:
        raise gl.vm.UserError(f"{ERROR_LLM} Missing text field: {field_name}")
    return str(value).strip()[:max_len]


def _require_short_list(value, field_name: str, limit: int = 4, item_len: int = 160) -> list:
    if not isinstance(value, list):
        raise gl.vm.UserError(f"{ERROR_LLM} Missing list field: {field_name}")
    items = []
    index = 0
    while index < len(value) and len(items) < limit:
        item = str(value[index]).strip()
        if item:
            items.append(item[:item_len])
        index += 1
    if not items:
        raise gl.vm.UserError(f"{ERROR_LLM} Empty list field: {field_name}")
    return items


def _normalize_axes(raw_axes) -> dict:
    if not isinstance(raw_axes, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Missing quantitative_axes object")

    normalized = {}
    for axis in QUANT_AXES:
        normalized[axis] = _clamp_score(raw_axes.get(axis))
    return normalized


def _compute_quant_summary(evaluations: dict) -> dict:
    summary = {}
    for axis in QUANT_AXES:
        total = 0
        for judge_id in JUDGE_IDS:
            total += evaluations[judge_id]["quantitative_axes"][axis]
        summary[axis] = int(round(total / len(JUDGE_IDS)))
    return summary


def _parse_float(raw, field_name: str) -> float:
    try:
        return float(str(raw))
    except (ValueError, TypeError):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-numeric float field: {field_name}")


def _normalize_market_snapshot(raw_snapshot) -> dict:
    if not isinstance(raw_snapshot, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Missing market_snapshot object")

    mood = _require_text(raw_snapshot.get("market_mood", ""), "market_mood", 60)
    top_assets = raw_snapshot.get("top_assets")
    if not isinstance(top_assets, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Missing market_snapshot.top_assets")

    normalized_assets = {}
    for symbol in MARKET_SYMBOLS:
        asset = top_assets.get(symbol)
        if not isinstance(asset, dict):
            raise gl.vm.UserError(f"{ERROR_LLM} Missing market asset: {symbol}")
        normalized_assets[symbol] = {
            "price": f"{round(_parse_float(asset.get('price'), f'{symbol}.price'), 4):.4f}",
            "range_position": _clamp_score(asset.get("range_position")),
        }

    return {
        "market_mood": mood,
        "top_assets": normalized_assets,
        "market_cap_signal": _clamp_score(raw_snapshot.get("market_cap_signal")),
        "volume_signal": _clamp_score(raw_snapshot.get("volume_signal")),
    }


def _normalize_narrative_summary(raw_summary, analysis_mode: str) -> dict | None:
    if analysis_mode == COMPREHENSIVE_MODE:
        if not isinstance(raw_summary, dict):
            raise gl.vm.UserError(f"{ERROR_LLM} Missing narrative_summary object")
        return {
            "decision_basis": _require_text(raw_summary.get("decision_basis", ""), "decision_basis", 220),
            "why_rejected": _require_short_list(raw_summary.get("why_rejected", []), "why_rejected"),
            "improvements": _require_short_list(raw_summary.get("improvements", []), "improvements"),
            "suggestions": _require_short_list(raw_summary.get("suggestions", []), "suggestions"),
        }

    if analysis_mode == MARKET_MODE:
        if not isinstance(raw_summary, dict):
            raise gl.vm.UserError(f"{ERROR_LLM} Missing narrative_summary object")
        return {
            "sentiment_take": _require_text(raw_summary.get("sentiment_take", ""), "sentiment_take", 220),
            "market_risks": _require_short_list(raw_summary.get("market_risks", []), "market_risks"),
            "market_opportunities": _require_short_list(
                raw_summary.get("market_opportunities", []), "market_opportunities"
            ),
            "timing_note": _require_text(raw_summary.get("timing_note", ""), "timing_note", 180),
        }

    return None


def _normalize_panel(raw: dict, analysis_mode: str) -> dict:
    if not isinstance(raw, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} LLM returned non-object")

    if analysis_mode not in MODE_VALUES:
        raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown analysis mode")

    is_crypto_case = raw.get("is_crypto_case")
    if not isinstance(is_crypto_case, bool):
        raise gl.vm.UserError(f"{ERROR_LLM} Missing boolean is_crypto_case")

    reason = _require_text(raw.get("crypto_relevance_reason", ""), "crypto_relevance_reason", 220)
    evaluations = raw.get("evaluations")
    if not isinstance(evaluations, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Missing evaluations object")

    normalized_evaluations = {}
    for judge_id in JUDGE_IDS:
        judge_raw = evaluations.get(judge_id)
        if not isinstance(judge_raw, dict):
            raise gl.vm.UserError(f"{ERROR_LLM} Missing evaluation for {judge_id}")

        evaluation = {
            "score": _clamp_score(judge_raw.get("score")),
            "reasoning": _require_text(judge_raw.get("reasoning", ""), "reasoning", 320),
            "key_point": _require_text(judge_raw.get("key_point", ""), "key_point", 120),
            "verdict_word": _require_text(judge_raw.get("verdict_word", ""), "verdict_word", 40),
        }

        if analysis_mode in (CRITICAL_MODE, COMPREHENSIVE_MODE, MARKET_MODE):
            evaluation["quantitative_axes"] = _normalize_axes(judge_raw.get("quantitative_axes"))

        normalized_evaluations[judge_id] = evaluation

    total = 0
    for judge_id in JUDGE_IDS:
        total += normalized_evaluations[judge_id]["score"]
    final_score = int(round(total / len(JUDGE_IDS)))

    quant_summary = None
    if analysis_mode in (CRITICAL_MODE, COMPREHENSIVE_MODE, MARKET_MODE):
        quant_summary = _compute_quant_summary(normalized_evaluations)

    narrative_summary = _normalize_narrative_summary(raw.get("narrative_summary"), analysis_mode)
    market_snapshot = None
    if analysis_mode == MARKET_MODE:
        market_snapshot = _normalize_market_snapshot(raw.get("market_snapshot"))

    return {
        "analysis_mode": analysis_mode,
        "is_crypto_case": is_crypto_case,
        "crypto_relevance_reason": reason,
        "evaluations": normalized_evaluations,
        "quant_summary": quant_summary,
        "narrative_summary": narrative_summary,
        "market_snapshot": market_snapshot,
        "final_score": final_score,
        "verdict": _verdict_for_score(final_score),
    }


def _validate_leader_analysis(candidate, analysis_mode: str) -> dict:
    normalized = _normalize_panel(candidate, analysis_mode)
    if normalized["verdict"] != _verdict_for_score(normalized["final_score"]):
        raise gl.vm.UserError(f"{ERROR_LLM} Verdict does not match final score")
    return normalized


def _judge_heuristics_block() -> str:
    return """
Judge heuristics:
- vitalik_buterin: decentralization, credible neutrality, mechanism design, public goods, long-run legitimacy
- gavin_wood: sovereignty through code, protocol design, architectural rigor, interoperability
- sergey_nazarov: trust-minimized coordination, oracle integrity, market structure, infrastructure completeness
- anatoly_yakovenko: throughput, low latency, hardware-aware engineering, fast execution
- eli_ben_sasson: proofs, privacy, mathematical rigor, computational integrity
- illia_polosukhin: open AI, user-owned systems, UX, ecosystem synthesis
- balaji_srinivasan: network states, exit rights, parallel institutions, asymmetric bets
- changpeng_zhao: mass adoption, simplicity, operational speed, distribution, utility
"""


def _standard_panel_prompt(case_text: str) -> str:
    return f"""
You are the neutral analysis engine for Supreme High Crypto Court.
You are NOT the named people, and you must not claim they endorsed this result.
Evaluate the submitted case through public, observable thinking profiles of 8 Web3 figures.

Case:
\"\"\"{case_text}\"\"\"

First decide whether the case is meaningfully about crypto, blockchain, Web3, DeFi, NFTs, DAOs,
cryptographic protocols, tokenomics, decentralized AI, wallets, exchanges, or adjacent on-chain systems.
Reject unrelated topics.

{_judge_heuristics_block()}

Return ONLY valid JSON with this exact shape:
{{
  "is_crypto_case": true,
  "crypto_relevance_reason": "short reason",
  "evaluations": {{
    "vitalik_buterin": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word"}},
    "gavin_wood": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word"}},
    "sergey_nazarov": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word"}},
    "anatoly_yakovenko": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word"}},
    "eli_ben_sasson": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word"}},
    "illia_polosukhin": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word"}},
    "balaji_srinivasan": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word"}},
    "changpeng_zhao": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word"}}
  }}
}}

Scores must be chosen only from 20, 40, 60, 80, 100.
Keep every string short and plain.
If the case is not crypto-related, set is_crypto_case to false and score each profile 0.
"""


def _quantitative_shape_block() -> str:
    return """
      "quantitative_axes": {
        "innovation": 0,
        "execution": 0,
        "decentralization": 0,
        "adoption": 0,
        "strategic_fit": 0
      }
"""


def _critical_panel_prompt(case_text: str) -> str:
    return f"""
You are the critical analysis engine for Supreme High Crypto Court.
You are NOT the named people, and you must not claim they endorsed this result.
Use public thinking-style patterns from the court's thinker sheet.

Case:
\"\"\"{case_text}\"\"\"

First decide whether the case is meaningfully about crypto, blockchain, Web3, DeFi, NFTs, DAOs,
cryptographic protocols, tokenomics, decentralized AI, wallets, exchanges, or adjacent on-chain systems.
Reject unrelated topics.

{_judge_heuristics_block()}

Return ONLY valid JSON with this exact shape:
{{
  "is_crypto_case": true,
  "crypto_relevance_reason": "short reason",
  "evaluations": {{
    "vitalik_buterin": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "gavin_wood": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "sergey_nazarov": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "anatoly_yakovenko": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "eli_ben_sasson": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "illia_polosukhin": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "balaji_srinivasan": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "changpeng_zhao": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}}
  }}
}}

For both the overall score and every quantitative axis, choose only from 20, 40, 60, 80, 100.
Keep every string short and plain.
If the case is not crypto-related, set is_crypto_case to false and all scores and axes to 0.
"""


def _comprehensive_panel_prompt(case_text: str) -> str:
    return f"""
You are the comprehensive analysis engine for Supreme High Crypto Court.
You are NOT the named people, and you must not claim they endorsed this result.
Use the thinker-sheet patterns to explain the weaknesses, upgrades, and strategic improvements of the case.

Case:
\"\"\"{case_text}\"\"\"

First decide whether the case is meaningfully about crypto, blockchain, Web3, DeFi, NFTs, DAOs,
cryptographic protocols, tokenomics, decentralized AI, wallets, exchanges, or adjacent on-chain systems.
Reject unrelated topics.

{_judge_heuristics_block()}

Return ONLY valid JSON with this exact shape:
{{
  "is_crypto_case": true,
  "crypto_relevance_reason": "short reason",
  "evaluations": {{
    "vitalik_buterin": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "gavin_wood": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "sergey_nazarov": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "anatoly_yakovenko": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "eli_ben_sasson": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "illia_polosukhin": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "balaji_srinivasan": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "changpeng_zhao": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}}
  }},
  "narrative_summary": {{
    "decision_basis": "1 short sentence",
    "why_rejected": ["short item", "short item"],
    "improvements": ["short item", "short item"],
    "suggestions": ["short item", "short item"]
  }}
}}

Even if the case is approved, fill why_rejected with the strongest objections or blockers.
For both the overall score and every quantitative axis, choose only from 20, 40, 60, 80, 100.
Keep every string short and plain.
If the case is not crypto-related, set is_crypto_case to false and all scores and axes to 0, and explain the jurisdiction failure in narrative_summary.
"""


def _build_market_context() -> dict:
    response = gl.nondet.web.get(
        MARKET_API_URL,
        headers={"X-Api-Key": MARKET_API_KEY, "accept": "application/json"},
    )
    if response.status != 200:
        raise gl.vm.UserError(f"{ERROR_EXTERNAL} CryptoRank returned status {response.status}")

    try:
        payload = json.loads(response.body.decode("utf-8"))
    except Exception:
        raise gl.vm.UserError(f"{ERROR_EXTERNAL} CryptoRank returned invalid JSON")

    rows = payload.get("data")
    if not isinstance(rows, list):
        raise gl.vm.UserError(f"{ERROR_EXTERNAL} CryptoRank missing data array")

    selected = {}
    top_10_cap = 0.0
    top_10_volume = 0.0
    count = 0

    for row in rows:
        if not isinstance(row, dict):
            continue
        symbol = str(row.get("symbol", "")).upper()
        market_cap = _parse_float(row.get("marketCap", 0), "marketCap")
        volume = _parse_float(row.get("volume24h", 0), "volume24h")
        if count < 10:
            top_10_cap += market_cap
            top_10_volume += volume
            count += 1

        if symbol in MARKET_SYMBOLS and symbol not in selected:
            price = _parse_float(row.get("price", 0), f"{symbol}.price")
            high24h = _parse_float(row.get("high24h", price), f"{symbol}.high24h")
            low24h = _parse_float(row.get("low24h", price), f"{symbol}.low24h")
            range_position = 50
            if high24h > low24h:
                range_position = int(round(((price - low24h) / (high24h - low24h)) * 100))
            if range_position < 0:
                range_position = 0
            if range_position > 100:
                range_position = 100
            selected[symbol] = {
                "price": f"{round(price, 4):.4f}",
                "range_position": range_position,
            }

    for symbol in MARKET_SYMBOLS:
        if symbol not in selected:
            raise gl.vm.UserError(f"{ERROR_EXTERNAL} CryptoRank missing asset {symbol}")

    market_cap_signal = 60
    if top_10_cap > 2_000_000_000_000:
        market_cap_signal = 80
    if top_10_cap < 800_000_000_000:
        market_cap_signal = 40

    volume_signal = 60
    if top_10_volume > 80_000_000_000:
        volume_signal = 80
    if top_10_volume < 15_000_000_000:
        volume_signal = 40

    mood = "mixed"
    avg_range = int(
        round(
            (
                selected["BTC"]["range_position"]
                + selected["ETH"]["range_position"]
                + selected["SOL"]["range_position"]
                + selected["LINK"]["range_position"]
                + selected["BNB"]["range_position"]
            )
            / 5
        )
    )
    if avg_range >= 65:
        mood = "risk-on"
    elif avg_range <= 35:
        mood = "risk-off"

    return {
        "market_mood": mood,
        "top_assets": selected,
        "market_cap_signal": market_cap_signal,
        "volume_signal": volume_signal,
    }


def _market_panel_prompt(case_text: str, market_context: dict) -> str:
    return f"""
You are the market sentiment analysis engine for Supreme High Crypto Court.
You are NOT the named people, and you must not claim they endorsed this result.
Use both the thinker-sheet patterns and the provided market snapshot.

Case:
\"\"\"{case_text}\"\"\"

Market snapshot:
{json.dumps(market_context, sort_keys=True)}

First decide whether the case is meaningfully about crypto, blockchain, Web3, DeFi, NFTs, DAOs,
cryptographic protocols, tokenomics, decentralized AI, wallets, exchanges, or adjacent on-chain systems.
Reject unrelated topics.

{_judge_heuristics_block()}

Return ONLY valid JSON with this exact shape:
{{
  "is_crypto_case": true,
  "crypto_relevance_reason": "short reason",
  "market_snapshot": {{
    "market_mood": "risk-on or mixed or risk-off",
    "top_assets": {{
      "BTC": {{"price": 0.0, "range_position": 0}},
      "ETH": {{"price": 0.0, "range_position": 0}},
      "SOL": {{"price": 0.0, "range_position": 0}},
      "LINK": {{"price": 0.0, "range_position": 0}},
      "BNB": {{"price": 0.0, "range_position": 0}}
    }},
    "market_cap_signal": 0,
    "volume_signal": 0
  }},
  "evaluations": {{
    "vitalik_buterin": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "gavin_wood": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "sergey_nazarov": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "anatoly_yakovenko": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "eli_ben_sasson": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "illia_polosukhin": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "balaji_srinivasan": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}},
    "changpeng_zhao": {{"score": 0, "reasoning": "1 short sentence", "key_point": "short phrase", "verdict_word": "single word", {_quantitative_shape_block()}}}
  }},
  "narrative_summary": {{
    "sentiment_take": "1 short sentence",
    "market_risks": ["short item", "short item"],
    "market_opportunities": ["short item", "short item"],
    "timing_note": "1 short sentence"
  }}
}}

The market_snapshot in your response must match the provided market snapshot exactly.
For both the overall score and every quantitative axis, choose only from 20, 40, 60, 80, 100.
Keep every string short and plain.
If the case is not crypto-related, set is_crypto_case to false and all scores and axes to 0.
"""


def _panel_prompt(case_text: str, analysis_mode: str, market_context=None) -> str:
    if analysis_mode == CRITICAL_MODE:
        return _critical_panel_prompt(case_text)
    if analysis_mode == COMPREHENSIVE_MODE:
        return _comprehensive_panel_prompt(case_text)
    if analysis_mode == MARKET_MODE:
        return _market_panel_prompt(case_text, market_context)
    return _standard_panel_prompt(case_text)


class SupremeHighCryptoCourt(gl.Contract):
    owner: Address
    case_count: u256
    cases: TreeMap[u256, CourtCase]
    case_ids: DynArray[u256]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.case_count = 0

    def _analyze_case(self, case_text: str, analysis_mode: str) -> dict:
        def leader_fn():
            market_context = None
            if analysis_mode == MARKET_MODE:
                market_context = _build_market_context()

            prompt = _panel_prompt(case_text, analysis_mode, market_context)
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            normalized = _validate_leader_analysis(raw, analysis_mode)
            if analysis_mode == MARKET_MODE:
                normalized["market_snapshot"] = market_context
            return normalized

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            try:
                _validate_leader_analysis(leaders_res.calldata, analysis_mode)
                return True
            except Exception:
                return False

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    def _submit_case_with_mode(self, case_text: str, analysis_mode: str) -> u256:
        cleaned = case_text.strip()
        if len(cleaned) < MIN_CASE_LENGTH:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Case must be at least 50 characters")
        if len(cleaned) > MAX_CASE_LENGTH:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Case must be 2000 characters or less")

        analysis = self._analyze_case(cleaned, analysis_mode)
        if not analysis["is_crypto_case"]:
            reason = str(analysis["crypto_relevance_reason"])
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Court lacks crypto jurisdiction: {reason}")

        case_id = self.case_count
        evaluations_json = json.dumps(analysis["evaluations"], sort_keys=True)
        quant_summary_json = ""
        narrative_summary_json = ""
        market_snapshot_json = ""

        if analysis["quant_summary"] is not None:
            quant_summary_json = json.dumps(analysis["quant_summary"], sort_keys=True)
        if analysis["narrative_summary"] is not None:
            narrative_summary_json = json.dumps(analysis["narrative_summary"], sort_keys=True)
        if analysis["market_snapshot"] is not None:
            market_snapshot_json = json.dumps(analysis["market_snapshot"], sort_keys=True)

        final_score = int(analysis["final_score"])
        verdict = str(analysis["verdict"])

        self.cases[case_id] = CourtCase(
            case_id=case_id,
            submitter=gl.message.sender_address,
            case_text=cleaned,
            analysis_mode=analysis_mode,
            evaluations_json=evaluations_json,
            quant_summary_json=quant_summary_json,
            narrative_summary_json=narrative_summary_json,
            market_snapshot_json=market_snapshot_json,
            final_score=final_score,
            verdict=verdict,
            created_at="0",
        )
        self.case_ids.append(case_id)
        self.case_count = case_id + 1
        return case_id

    @gl.public.write
    def submit_case(self, case_text: str) -> u256:
        return self._submit_case_with_mode(case_text, STANDARD_MODE)

    @gl.public.write
    def submit_critical_case(self, case_text: str) -> u256:
        return self._submit_case_with_mode(case_text, CRITICAL_MODE)

    @gl.public.write
    def submit_comprehensive_case(self, case_text: str) -> u256:
        return self._submit_case_with_mode(case_text, COMPREHENSIVE_MODE)

    @gl.public.write
    def submit_market_case(self, case_text: str) -> u256:
        return self._submit_case_with_mode(case_text, MARKET_MODE)

    @gl.public.view
    def get_case(self, case_id: u256) -> dict:
        if case_id not in self.cases:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Case not found")

        court_case = self.cases[case_id]
        quant_summary = None
        narrative_summary = None
        market_snapshot = None
        if court_case.quant_summary_json:
            quant_summary = json.loads(court_case.quant_summary_json)
        if court_case.narrative_summary_json:
            narrative_summary = json.loads(court_case.narrative_summary_json)
        if court_case.market_snapshot_json:
            market_snapshot = json.loads(court_case.market_snapshot_json)

        return {
            "case_id": court_case.case_id,
            "submitter": court_case.submitter.as_hex,
            "case_text": court_case.case_text,
            "analysis_mode": court_case.analysis_mode,
            "evaluations": json.loads(court_case.evaluations_json),
            "quant_summary": quant_summary,
            "narrative_summary": narrative_summary,
            "market_snapshot": market_snapshot,
            "final_score": court_case.final_score,
            "verdict": court_case.verdict,
            "created_at": court_case.created_at,
        }

    @gl.public.view
    def get_case_summary(self, case_id: u256) -> dict:
        if case_id not in self.cases:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Case not found")

        court_case = self.cases[case_id]
        preview = court_case.case_text
        if len(preview) > 140:
            preview = preview[:140] + "..."

        return {
            "case_id": court_case.case_id,
            "submitter": court_case.submitter.as_hex,
            "analysis_mode": court_case.analysis_mode,
            "case_preview": preview,
            "final_score": court_case.final_score,
            "verdict": court_case.verdict,
            "created_at": court_case.created_at,
        }

    @gl.public.view
    def get_case_count(self) -> u256:
        return self.case_count

    @gl.public.view
    def get_recent_cases(self, limit: u256) -> list:
        count = int(self.case_count)
        requested = int(limit)
        if requested > 25:
            requested = 25

        results = []
        index = count - 1
        while index >= 0 and len(results) < requested:
            results.append(self.get_case_summary(index))
            index -= 1
        return results
