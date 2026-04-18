export type JudgeId =
  | "vitalik_buterin"
  | "gavin_wood"
  | "sergey_nazarov"
  | "anatoly_yakovenko"
  | "eli_ben_sasson"
  | "illia_polosukhin"
  | "balaji_srinivasan"
  | "changpeng_zhao";

export type Judge = {
  id: JudgeId;
  name: string;
  shortName: string;
  archetype: string;
  image: string;
  profile: string;
  bench: string;
};

export const judges: Judge[] = [
  {
    id: "vitalik_buterin",
    name: "Vitalik Buterin",
    shortName: "Vitalik",
    archetype: "Guardian of decentralized legitimacy",
    image: "/judges/vitalik-buterin.jpg",
    profile: "Credible neutrality, mechanism design, public goods, and long-horizon decentralization.",
    bench: "Protocol Ethics",
  },
  {
    id: "gavin_wood",
    name: "Gavin Wood",
    shortName: "Gavin",
    archetype: "Infrastructure architect",
    image: "/judges/gavin-wood.jpg",
    profile: "Formal protocol correctness, sovereignty through code, interoperability, and real permissionlessness.",
    bench: "Systems Law",
  },
  {
    id: "sergey_nazarov",
    name: "Sergey Nazarov",
    shortName: "Sergey",
    archetype: "Trust-minimized coordination strategist",
    image: "/judges/sergey-nazarov.jpg",
    profile: "Verifiable data, oracle integrity, hybrid smart contracts, and institutional-grade infrastructure.",
    bench: "Truth & Oracles",
  },
  {
    id: "anatoly_yakovenko",
    name: "Anatoly Yakovenko",
    shortName: "Anatoly",
    archetype: "Performance-first systems engineer",
    image: "/judges/anatoly-yakovenko.jpg",
    profile: "Throughput, low latency, hardware-aware scaling, pragmatic engineering, and execution speed.",
    bench: "Performance Court",
  },
  {
    id: "eli_ben_sasson",
    name: "Eli Ben-Sasson",
    shortName: "Eli",
    archetype: "Mathematician of proof-based trust",
    image: "/judges/eli-ben-sasson.jpeg",
    profile: "ZK proofs, computational integrity, privacy, mathematical elegance, and provable correctness.",
    bench: "Proof Division",
  },
  {
    id: "illia_polosukhin",
    name: "Illia Polosukhin",
    shortName: "Illia",
    archetype: "AI-blockchain synthesizer",
    image: "/judges/illia-polosukhin.jpg",
    profile: "Open AI, user-owned data, accessible UX, agents, and cross-domain crypto systems.",
    bench: "Open AI Chamber",
  },
  {
    id: "balaji_srinivasan",
    name: "Balaji Srinivasan",
    shortName: "Balaji",
    archetype: "Network-state strategist",
    image: "/judges/balaji-srinivasan.png",
    profile: "Exit rights, parallel institutions, censorship resistance, network-native sovereignty, and contrarian bets.",
    bench: "Sovereignty Bench",
  },
  {
    id: "changpeng_zhao",
    name: "Changpeng Zhao",
    shortName: "CZ",
    archetype: "Fast global operator",
    image: "/judges/changpeng-zhao.jpg",
    profile: "Financial freedom, mass adoption, accessibility, operational scale, and fast shipping.",
    bench: "Adoption Court",
  },
];

export const judgesById = Object.fromEntries(judges.map((judge) => [judge.id, judge])) as Record<JudgeId, Judge>;
