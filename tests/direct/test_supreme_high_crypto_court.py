import json


VALID_CASE_TEXT = (
    "A DeFi protocol should publish verifiable collateral policy updates and allow "
    "tokenholders to dispute model-driven risk changes on-chain."
)

AXES = {
    "innovation": 80,
    "execution": 60,
    "decentralization": 80,
    "adoption": 60,
    "strategic_fit": 80,
}

MARKET_SNAPSHOT = {
    "market_mood": "risk-on",
    "top_assets": {
        "BTC": {"price": "94500.1200", "range_position": 73},
        "ETH": {"price": "4820.4400", "range_position": 68},
        "SOL": {"price": "215.5100", "range_position": 77},
        "LINK": {"price": "31.8800", "range_position": 61},
        "BNB": {"price": "872.4200", "range_position": 64},
    },
    "market_cap_signal": 80,
    "volume_signal": 80,
}


def _judge_ids():
    return (
        "vitalik_buterin",
        "gavin_wood",
        "sergey_nazarov",
        "anatoly_yakovenko",
        "eli_ben_sasson",
        "illia_polosukhin",
        "balaji_srinivasan",
        "changpeng_zhao",
    )


def _mock_panel(
    *,
    score=70,
    is_crypto_case=True,
    quant=False,
    narrative=None,
    market_snapshot=None,
):
    evaluations = {}
    for judge_id in _judge_ids():
        evaluations[judge_id] = {
            "score": score,
            "reasoning": f"{judge_id} reasoning about the case.",
            "key_point": f"{judge_id} key point",
            "verdict_word": "supportive",
        }
        if quant:
            evaluations[judge_id]["quantitative_axes"] = dict(AXES)

    payload = {
        "is_crypto_case": is_crypto_case,
        "crypto_relevance_reason": "The filing is clearly about DeFi risk controls and on-chain governance.",
        "evaluations": evaluations,
    }
    if narrative is not None:
        payload["narrative_summary"] = narrative
    if market_snapshot is not None:
        payload["market_snapshot"] = market_snapshot
    return payload


def _mock_market_rows():
    rows = [
        {"symbol": "BTC", "price": 94500.12, "high24h": 96000, "low24h": 90500, "marketCap": 2_100_000_000_000, "volume24h": 22_000_000_000},
        {"symbol": "ETH", "price": 4820.44, "high24h": 4950, "low24h": 4500, "marketCap": 650_000_000_000, "volume24h": 18_000_000_000},
        {"symbol": "SOL", "price": 215.51, "high24h": 225, "low24h": 175, "marketCap": 105_000_000_000, "volume24h": 12_000_000_000},
        {"symbol": "LINK", "price": 31.88, "high24h": 34, "low24h": 28.5, "marketCap": 22_000_000_000, "volume24h": 4_500_000_000},
        {"symbol": "BNB", "price": 872.42, "high24h": 900, "low24h": 820, "marketCap": 120_000_000_000, "volume24h": 8_500_000_000},
        {"symbol": "XRP", "price": 2.1, "high24h": 2.2, "low24h": 1.9, "marketCap": 110_000_000_000, "volume24h": 6_000_000_000},
        {"symbol": "DOGE", "price": 0.42, "high24h": 0.43, "low24h": 0.39, "marketCap": 55_000_000_000, "volume24h": 5_000_000_000},
        {"symbol": "ADA", "price": 1.3, "high24h": 1.35, "low24h": 1.2, "marketCap": 44_000_000_000, "volume24h": 3_800_000_000},
        {"symbol": "AVAX", "price": 62, "high24h": 64, "low24h": 56, "marketCap": 25_000_000_000, "volume24h": 2_100_000_000},
        {"symbol": "ARB", "price": 2.3, "high24h": 2.5, "low24h": 2.0, "marketCap": 8_000_000_000, "volume24h": 1_300_000_000},
    ]
    return {"data": rows}


def test_submit_case_persists_standard_case(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(r"(?s).*neutral analysis engine.*", json.dumps(_mock_panel(score=80)))

    case_id = contract.submit_case(VALID_CASE_TEXT)

    stored = contract.get_case(case_id)
    assert case_id == 0
    assert stored["case_id"] == 0
    assert stored["submitter"].lower() == ("0x" + direct_alice.hex()).lower()
    assert stored["case_text"] == VALID_CASE_TEXT
    assert stored["analysis_mode"] == "standard"
    assert stored["final_score"] == 80
    assert stored["verdict"] == "APPROVED"
    assert stored["quant_summary"] is None
    assert stored["narrative_summary"] is None
    assert stored["market_snapshot"] is None
    assert stored["created_at"] == "0"


def test_submit_case_rejects_short_input(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Case must be at least 50 characters"):
        contract.submit_case("too short for the court")


def test_submit_case_rejects_non_crypto_case(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(
        r"(?s).*neutral analysis engine.*",
        json.dumps(_mock_panel(score=0, is_crypto_case=False)),
    )

    with direct_vm.expect_revert("Court lacks crypto jurisdiction"):
        contract.submit_case(VALID_CASE_TEXT)


def test_submit_critical_case_persists_quantitative_axes(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(
        r"(?s).*critical analysis engine.*",
        json.dumps(_mock_panel(score=60, quant=True)),
    )

    case_id = contract.submit_critical_case(VALID_CASE_TEXT)
    stored = contract.get_case(case_id)

    assert stored["analysis_mode"] == "critical"
    assert stored["final_score"] == 60
    assert stored["quant_summary"] == AXES
    assert stored["narrative_summary"] is None
    assert stored["evaluations"]["vitalik_buterin"]["quantitative_axes"] == AXES


def test_submit_comprehensive_case_persists_report(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(
        r"(?s).*comprehensive analysis engine.*",
        json.dumps(
            _mock_panel(
                score=60,
                quant=True,
                narrative={
                    "decision_basis": "The proposal is promising but underspecified on execution risk.",
                    "why_rejected": [
                        "Risk parameters are not bounded on-chain.",
                        "Agent governance is not clearly challengeable.",
                    ],
                    "improvements": [
                        "Publish deterministic challenge windows.",
                        "Pin model versions and risk inputs on-chain.",
                    ],
                    "suggestions": [
                        "Add circuit breakers for volatility spikes.",
                        "Route governance disputes through tokenholder voting.",
                    ],
                },
            )
        ),
    )

    case_id = contract.submit_comprehensive_case(VALID_CASE_TEXT)
    stored = contract.get_case(case_id)

    assert stored["analysis_mode"] == "comprehensive"
    assert stored["quant_summary"] == AXES
    assert stored["narrative_summary"]["decision_basis"].startswith("The proposal is promising")
    assert stored["narrative_summary"]["why_rejected"][0] == "Risk parameters are not bounded on-chain."
    assert stored["narrative_summary"]["improvements"][0] == "Publish deterministic challenge windows."
    assert stored["narrative_summary"]["suggestions"][0] == "Add circuit breakers for volatility spikes."


def test_submit_market_case_persists_market_snapshot(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(
        r".*api\.cryptorank\.io/v2/currencies\?limit=100.*",
        {"status": 200, "body": json.dumps(_mock_market_rows())},
    )
    direct_vm.mock_llm(
        r"(?s).*market sentiment analysis engine.*",
        json.dumps(
            _mock_panel(
                score=80,
                quant=True,
                market_snapshot=MARKET_SNAPSHOT,
                narrative={
                    "sentiment_take": "Momentum supports shipping this with guardrails.",
                    "market_risks": [
                        "Volatility can overpower static collateral assumptions.",
                        "Crowded narratives can compress downside faster than models adapt.",
                    ],
                    "market_opportunities": [
                        "Risk-on conditions reward automated efficiency.",
                        "Transparent challenge flows can attract serious DeFi capital.",
                    ],
                    "timing_note": "Launch cautiously while momentum is positive.",
                },
            )
        ),
    )

    case_id = contract.submit_market_case(VALID_CASE_TEXT)
    stored = contract.get_case(case_id)

    assert stored["analysis_mode"] == "market"
    assert stored["quant_summary"] == AXES
    assert stored["market_snapshot"]["market_mood"] == "risk-on"
    assert stored["market_snapshot"]["top_assets"]["BTC"]["range_position"] == 73
    assert stored["narrative_summary"]["sentiment_take"] == "Momentum supports shipping this with guardrails."
    assert stored["narrative_summary"]["market_risks"][0].startswith("Volatility can overpower")


def test_get_case_summary_exposes_analysis_mode(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(
        r"(?s).*comprehensive analysis engine.*",
        json.dumps(
            _mock_panel(
                score=60,
                quant=True,
                narrative={
                    "decision_basis": "The proposal is workable with stronger controls.",
                    "why_rejected": ["Weak challenge mechanics."],
                    "improvements": ["Add deterministic replay inputs."],
                    "suggestions": ["Use bounded governance changes."],
                },
            )
        ),
    )

    case_id = contract.submit_comprehensive_case(VALID_CASE_TEXT)
    summary = contract.get_case_summary(case_id)

    assert summary["analysis_mode"] == "comprehensive"
    assert summary["final_score"] == 60
