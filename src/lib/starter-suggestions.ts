export type StarterSuggestion = {
  prompt: string;
  description?: string;
};

export const STARTER_SUGGESTIONS: StarterSuggestion[] = [
  {
    prompt:
      "A contractor asked why they should use the ControlFlo 360 ball valve instead of a standard PE ball valve. Help me write a response that highlights the key advantages.",
    description: "Drafts a competitive response from the AF1051 spec sheets",
  },
  {
    prompt:
      "I need to explain the difference between Philmac 2G and 3G compression fittings to a new rep. Can you give me a clear breakdown?",
    description: "Summarizes from the Info Blurt archive on 2G/3G",
  },
  {
    prompt:
      "Draft an email to an engineer explaining why PE fusion joints have excellent slow crack growth resistance, and attach the relevant data.",
    description: "Pulls from the Fusion Joint SCG Resistance PDF",
  },
  {
    prompt:
      "A utility engineer asked about DR and SDR ratings for PE pipe. What's the simple explanation I should give them?",
    description: "Answers from Info Blurt #83 on DR/SDR",
  },
  {
    prompt:
      "We're bidding against a competitor's PE ball valve that doesn't meet Buy America. Help me write an email that positions our Made in USA advantage without being too aggressive.",
    description: "Builds a Buy America positioning email",
  },
  {
    prompt:
      "An engineer wants to know if Philmac fittings can handle PVC pipe, not just PE. What's the compatibility answer and can you draft a quick reply?",
    description: "Pulls PVC collet info from the Blurt archive",
  },
  {
    prompt:
      "I'm presenting to a golf course superintendent about the AquaFuse fusible service saddle for their irrigation system. Help me build talking points.",
    description: "Creates talking points from the AquaFuse golf saddle spec",
  },
  {
    prompt:
      "A customer had an HDPE pipe failure and is blaming the fusion joint. What do I need to know about PE transmission line failures before I respond?",
    description: "Briefs from the Florida failure case emails",
  },
  {
    prompt:
      "Help me write a spec for a 160 PSI HDPE system. What standards and language should I include?",
    description: "References the Generic Specification Deck",
  },
  {
    prompt:
      "A prospect is comparing PVC vs HDPE for a new water main project. Give me the key arguments for PE and help me draft an email making the case.",
    description: "Pulls from the PVC vs HDPE pressure pipe PDF",
  },
  {
    prompt:
      "Someone asked about stiffener requirements for PE pipe with our compression fittings. When are they needed and when can we skip them?",
    description: "Answers from multiple Info Blurts on stiffener policy",
  },
  {
    prompt:
      "I need to explain electrofusion guidance for lateral connections using PE ball valves. What are the key steps I should communicate?",
    description: "Pulls from Info Blurt #46 on EF guidance",
  },
  {
    prompt:
      "A utility wants to know about thrust anchors and flex restraints in PE systems. What's our position and what should I tell them?",
    description: "Answers from Info Blurt #69 on thrust/restraints",
  },
  {
    prompt:
      "Draft a cold email to an engineer who specs stainless steel risers, pitching our DI nipple and PE ball valve alternative as more corrosion-resistant and cost-effective.",
    description: "Drafts a switching pitch with product details",
  },
  {
    prompt:
      "What's the deal with chlorine-induced oxidative degradation in PE pipe? A customer brought it up and I need to be prepared.",
    description: "Briefs from Info Blurt #57 on chlorine degradation",
  },
  {
    prompt:
      "I'm meeting with a sewer authority next week. What sewer products do we offer and what's our market strategy? Help me prep.",
    description: "Summarizes from the Sewer Product Map and Blurts 70-72",
  },
  {
    prompt:
      "A contractor asked about the Cambridge Coupling. What is it, when would they use it, and can you help me write a follow-up with the spec attached?",
    description: "Pulls from the Cambridge Coupling PDF",
  },
  {
    prompt:
      "An engineer is concerned about butt-fusing pipes with different DR ratios. What's the industry rule of thumb and what should I advise?",
    description: "Answers from Info Blurts on unlike-DR fusions",
  },
  {
    prompt:
      "Help me write a lunch-and-learn invite for an engineering firm focused on HDPE advantages over PVC in aggressive soil conditions.",
    description: "Drafts invite pulling from PE rocky-site data",
  },
  {
    prompt:
      "We got a question about NSF 61 listings for our FBE and bituminous coatings. What do we actually have listed, and how do I frame the answer?",
    description: "Pulls from Info Blurt #25 on NSF coatings",
  },
  {
    prompt:
      "What are the installation instructions for the updated 2-inch IPS-OD Philmac fitting? A distributor needs a quick summary they can share with crews.",
    description: "Summarizes from the Philmac installation PDFs",
  },
  {
    prompt:
      "Our LIV valve vs. the CMF PE ball valve. What are the real differences and how should I position ours in a head-to-head?",
    description: "Builds a comparison from the LIV vs CMF chart",
  },
  {
    prompt:
      "A customer asked if our Harco pipe-to-pipe restraints work on IPEX Canadian IPS pipe. What do I tell them?",
    description: "Answers from Info Blurt #34 on IPEX compatibility",
  },
  {
    prompt:
      "I need to send a contractor everything we have on C907 tapped tees in 4, 6, and 8 inch. What should I include and can you draft the cover email?",
    description: "Surfaces the C907 tee PDFs with a cover note",
  },
  {
    prompt:
      "An engineer heard about a PE pipe failure at a Fairpoint Utility project. What happened and how should I address concerns about PE reliability?",
    description: "Briefs from the Fairpoint failure documentation",
  },
  {
    prompt:
      "Help me write a follow-up email to a prospect I met at a trade show who was interested in the AquaFuse PolyBaSS system for their ball valve assemblies.",
    description: "Drafts a trade-show follow-up with catalog reference",
  },
  {
    prompt:
      "A rep is confused about Philmac product line terminology. What's the difference between the metric, IPS-OD, and CTS lines? Give me a cheat sheet.",
    description: "Summarizes from Info Blurt #81 on Philmac lines",
  },
  {
    prompt:
      "What's the current state of the PE pipe market and pipe production? I need background before a meeting with a utility director.",
    description: "Briefs from Info Blurt #78 on market state",
  },
  {
    prompt:
      "Draft an email explaining why galling happens with stainless steel fasteners and why anti-seize lubricant matters for our assemblies.",
    description: "Pulls from Info Blurt #84 on SS galling",
  },
];

export function pickRandomSuggestions(count: number): StarterSuggestion[] {
  const pool = [...STARTER_SUGGESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
