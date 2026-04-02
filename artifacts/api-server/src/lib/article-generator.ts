import { openai } from "@workspace/integrations-openai-ai-server";
import axios from "axios";

const NICHES = ["motivation", "ai", "money", "facts", "tech"] as const;
type Niche = typeof NICHES[number];

const TRENDING_TOPICS: Record<Niche, string[]> = {
  motivation: [
    "morning habits that successful people swear by",
    "why most people give up before they succeed",
    "how to stay motivated when life gets hard",
    "the mindset shift that changes everything",
    "stop waiting for the right moment to start",
    "lessons from the world's most successful people",
  ],
  ai: [
    "how AI is changing the job market in 2025",
    "ChatGPT prompts that will make you 10x more productive",
    "AI tools that are free and incredibly powerful",
    "the future of AI and what it means for you",
    "how to use AI to make money online",
    "AI predictions that are already coming true",
  ],
  money: [
    "passive income ideas that actually work in 2025",
    "how to make $500 a day without a 9-to-5 job",
    "money mistakes to avoid in your 20s and 30s",
    "how the rich think about money differently",
    "side hustles that can replace your full-time income",
    "investing for beginners that experts won't tell you",
  ],
  facts: [
    "mind-blowing facts about the human brain",
    "facts about money that will shock you",
    "amazing facts about the universe most people don't know",
    "psychology facts that explain why people do weird things",
    "historical facts that prove the world is stranger than fiction",
    "science facts that seem impossible but are totally true",
  ],
  tech: [
    "tech tools that will make you 10x more productive",
    "how blockchain is changing everything in 2025",
    "apps that are secretly making people rich",
    "cybersecurity threats you need to know about right now",
    "the next big tech trend and how to profit from it",
    "gadgets worth buying in 2025 that change your life",
  ],
};

export function pickRandomNiche(niches: string[]): Niche {
  const available = niches.filter((n) => NICHES.includes(n as Niche)) as Niche[];
  const pool = available.length > 0 ? available : [...NICHES];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickRandomTopic(niche: Niche): string {
  const topics = TRENDING_TOPICS[niche];
  return topics[Math.floor(Math.random() * topics.length)];
}

export function buildSeoKeywords(niche: string, topic: string): string[] {
  const baseKeywords = [niche, topic.split(" ").slice(0, 3).join(" ")];
  const nicheKeywords: Record<string, string[]> = {
    motivation: ["success tips", "mindset", "self improvement", "personal growth"],
    ai: ["artificial intelligence", "AI tools", "machine learning", "ChatGPT"],
    money: ["make money online", "passive income", "financial freedom", "invest"],
    facts: ["amazing facts", "did you know", "surprising facts", "mind blowing"],
    tech: ["technology 2025", "tech tips", "productivity", "digital tools"],
  };
  return [...baseKeywords, ...(nicheKeywords[niche] || [])].slice(0, 6);
}

export async function generateArticle(
  topic: string,
  niche: string,
  keywords: string[]
): Promise<{
  title: string;
  content: string;
  metaDescription: string;
  labels: string[];
  wordCount: number;
}> {
  const keywordList = keywords.join(", ");

  const prompt = `You are an expert SEO blog writer. Write a complete, engaging blog post about: "${topic}"

Niche: ${niche}
Target Keywords: ${keywordList}

Requirements:
- Write 900-1100 words total
- Use simple, conversational, human-like language
- Structure the article in HTML format
- Create a compelling clickbait-style title
- Start with a strong hook introduction paragraph
- Include 3-5 sections with <h2> subheadings
- End with a motivating conclusion
- Naturally include keywords throughout
- Make it SEO-optimized and unique

Respond with a JSON object in this exact format:
{
  "title": "Your clickbait title here",
  "metaDescription": "A 150-160 character SEO meta description",
  "labels": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "content": "<h2>...</h2><p>...</p>..."
}

The content field should be the full HTML article body (no outer html/body tags). Use <h2> for main sections, <h3> for subsections, <p> for paragraphs, <ul>/<li> for lists when appropriate. Make it scannable and engaging.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);

  const wordCount = (parsed.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

  return {
    title: parsed.title || topic,
    content: parsed.content || "",
    metaDescription: parsed.metaDescription || "",
    labels: Array.isArray(parsed.labels) ? parsed.labels : [niche],
    wordCount,
  };
}

export async function fetchPexelsImages(
  query: string,
  count: number = 2
): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: apiKey },
      params: { query, per_page: count, page: 1 },
    });

    return (res.data.photos || []).map((photo: { src: { large: string } }) => photo.src.large);
  } catch {
    return [];
  }
}

export function injectImages(content: string, imageUrls: string[], topic: string): string {
  if (imageUrls.length === 0) return content;

  const sections = content.split(/<h2/i);
  if (sections.length < 2) {
    const imgHtml = imageUrls.map(
      (url, i) => `<div style="text-align:center;margin:20px 0"><img src="${url}" alt="${topic} - image ${i + 1}" style="max-width:100%;border-radius:8px;" /></div>`
    ).join("");
    return imgHtml + content;
  }

  let result = sections[0];
  imageUrls.forEach((url, i) => {
    if (sections[i + 1]) {
      const imgHtml = `<div style="text-align:center;margin:20px 0"><img src="${url}" alt="${topic} - image ${i + 1}" style="max-width:100%;border-radius:8px;" /></div>`;
      result += imgHtml + "<h2" + sections[i + 1];
    }
  });

  for (let i = imageUrls.length + 1; i < sections.length; i++) {
    result += "<h2" + sections[i];
  }

  return result;
}
