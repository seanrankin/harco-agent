export type StarterSuggestion = {
  prompt: string;
  description?: string;
};

export const STARTER_SUGGESTIONS: StarterSuggestion[] = [
  {
    prompt: "What products does Harco Fittings offer? Give me a summary from the product catalog.",
    description: "Summarizes the catalog + attaches the DOCX",
  },
  {
    prompt: "Is PE pipe actually good for rocky sites?",
    description: "Answers from the Info Blurt email archive",
  },
  {
    prompt:
      "Draft an email explaining that AVK Series 66 gate valves with PE ends meet Buy America Act requirements and are made in Minden, NV.",
    description: "Builds an Outlook-ready draft",
  },
  {
    prompt:
      "A contractor is bidding a project and asked for everything we have on 10-inch PE ball valves — what should I send?",
    description: "Surfaces the comparison PDF as an attachment",
  },
  {
    prompt:
      "A utility just told me their current ARV risers are corroding within 3 years. How should I position the Harco ARV Riser Assembly in my follow-up email?",
    description: "Drafts a corrosion-angle follow-up",
  },
  {
    prompt:
      "I dropped off a sample of the ARV riser assembly two weeks ago and haven't heard back. Can you help me write a follow-up email that doesn't sound pushy?",
    description: "Writes a low-pressure check-in",
  },
  {
    prompt:
      "An engineer said they \"don't see an improvement over what they spec now.\" What's my next move, and what should I say to reopen the conversation?",
    description: "Suggests a reframe + reply draft",
  },
  {
    prompt:
      "A customer asked if the Philmac 3G compression fittings can handle their 200 psi system. What's the pressure rating I should reference in my response?",
    description: "Pulls the spec from the product catalog",
  },
  {
    prompt:
      "I'm trying to get a lunch-and-learn scheduled with an engineering firm. Can you draft an email requesting 20-30 minutes to present the ARV riser concept?",
    description: "Drafts a lunch-and-learn invite",
  },
  {
    prompt:
      "A prospect asked about NSF 61 approval for our ductile iron nipples. We don't have a direct listing. How do I handle this in an email without losing credibility?",
    description: "Frames the NSF 61 response honestly",
  },
  {
    prompt:
      "The engineer wants to know what tools are needed to install the ARV riser assembly. What should I tell them?",
    description: "Lists install tools from the spec sheet",
  },
  {
    prompt:
      "A customer is comparing our Polyvalve PE ball valve against the Central Plastics valve. What are the key differentiators I should lead with?",
    description: "Builds a head-to-head battle card",
  },
  {
    prompt:
      "I just had a great meeting where the engineer liked the concept. Help me write the thank-you email with the submittal info and spec language attached.",
    description: "Drafts a recap email + attaches submittal",
  },
  {
    prompt:
      "A sewer authority says they need a \"quick disconnect\" feature for ARV maintenance. Do we offer that configuration, and how should I describe it?",
    description: "Confirms the config + suggests phrasing",
  },
  {
    prompt:
      "Someone asked me if PE pipe is better in rocky soil conditions. What's the real answer I should give?",
    description: "Answers from the Info Blurt email archive",
  },
  {
    prompt:
      "I'm reaching out to an engineer about a specific project that shows force mains but no ARV detail in their drawings. Help me craft a cold outreach email.",
    description: "Drafts a project-specific cold email",
  },
  {
    prompt:
      "A prospect asked where Harco fittings are manufactured. What's the full answer covering our locations and distribution?",
    description: "Summarizes manufacturing + distribution",
  },
  {
    prompt:
      "We're competing against a Korean-made PE ball valve. The spec says \"Made in USA.\" How do I use this to our advantage?",
    description: "Builds a Made-in-USA positioning angle",
  },
  {
    prompt:
      "An engineer asked about the warranty on the ARV riser assembly. What do I say, and how do I position it positively?",
    description: "Frames the warranty as a selling point",
  },
  {
    prompt:
      "A customer is worried about height restrictions in their manhole. How does our ARV assembly address limited vertical cover?",
    description: "Answers from the ARV spec sheet",
  },
  {
    prompt:
      "I'm trying to introduce the Philmac ball/check valve for low-pressure sewer. Can you help me write the initial outreach email to a contractor who has projects in construction?",
    description: "Drafts a contractor intro email",
  },
  {
    prompt:
      "What's the difference between the C900 tapped tee approach and using a saddle? When should I recommend one over the other?",
    description: "Compares both with a recommendation guide",
  },
  {
    prompt:
      "A customer currently specs stainless steel nipples and ball valves for their ARV risers. What's my argument for switching to our solution?",
    description: "Builds a switching-cost argument",
  },
  {
    prompt:
      "I met with a utility but they said they need to \"discuss internally.\" It's been three weeks. Help me write a check-in email.",
    description: "Drafts a three-week check-in",
  },
  {
    prompt:
      "An engineer asked about PE fusion joint reliability for a long-life application. What should I know about slow crack growth before responding?",
    description: "Briefs you on SCG before you reply",
  },
  {
    prompt:
      "A utility wants references of other water/sewer authorities using the ARV riser. How should I ask existing customers for references in a follow-up?",
    description: "Writes a reference-request email",
  },
  {
    prompt:
      "I need to write a spec for the ARV riser assembly components. What are the correct standards and pressure ratings I should include?",
    description: "Generates spec language with citations",
  },
  {
    prompt:
      "A customer asked if our compression fittings work on both PE and PVC pipe. What's the compatibility story for the Philmac 3G line?",
    description: "Pulls compatibility from the 3G catalog",
  },
  {
    prompt:
      "I've been emailing a prospect for months with no meeting scheduled. They haven't said no, but they're not engaging. What's my strategy to break through, and can you write one more attempt?",
    description: "Suggests a break-through strategy + draft",
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
