import html
import json
import logging
import os
import re
import shutil
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from auth import authenticate
from blogger_api import create_post, get_recent_posts
from config import (
    ARCHIVE_POSTED,
    CACHE_DIR,
    CONTENT_DIR,
    DAILY_TIMEZONE,
    DAILY_TIME_HHMM,
    FREE_AI_ENABLED,
    FREE_AI_PROVIDER,
    LOG_DIR,
    LOG_FILE,
    MAX_IMAGES_PER_POST,
    MAX_POSTS_PER_DAY,
    OLLAMA_MODEL,
    OLLAMA_URL,
    OWNER_KEY_ENV,
    OWNER_KEY_REQUIRED,
    PIXABAY_API_KEY,
    PIXABAY_ENABLE,
    PIXABAY_LANG,
    PIXABAY_ORIENTATION,
    PEXELS_API_KEY,
    PEXELS_ATTRIBUTION,
    PEXELS_LOCALE,
    PEXELS_ORIENTATION,
    FEATURED_IMAGE_ENABLED,
    USED_DIR,
)

MAX_RETRIES = 2


def setup_logging():
    os.makedirs(LOG_DIR, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        handlers=[
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )


def ensure_dirs():
    os.makedirs(CONTENT_DIR, exist_ok=True)
    if ARCHIVE_POSTED:
        os.makedirs(USED_DIR, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)


def normalize_title(title, fallback_title):
    title = (title or "").strip()
    if not title:
        return fallback_title
    if title.lower().startswith("blogger:"):
        title = title.split(":", 1)[1].strip()
    if title.lower().startswith("automated post"):
        return fallback_title
    if title.lower().startswith("daily update"):
        return fallback_title
    if title.lower().startswith("quick update"):
        return fallback_title
    return title


def extract_title(text, fallback_title):
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.lower().startswith("title:"):
            return normalize_title(stripped.split(":", 1)[1].strip(), fallback_title)
        if stripped.startswith("# "):
            return normalize_title(stripped[2:].strip(), fallback_title)
        return fallback_title
    return fallback_title


def text_to_html(text):
    html_lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("### "):
            html_lines.append(f"<h3>{html.escape(stripped[4:])}</h3>")
        elif stripped.startswith("## "):
            html_lines.append(f"<h2>{html.escape(stripped[3:])}</h2>")
        elif stripped.startswith("# "):
            html_lines.append(f"<h1>{html.escape(stripped[2:])}</h1>")
        else:
            html_lines.append(f"<p>{html.escape(stripped)}</p>")
    return "\n".join(html_lines)


def parse_content_file(path):
    text = Path(path).read_text(encoding="utf-8").strip()
    if not text:
        return None

    fallback_title = Path(path).stem.replace("_", " ").replace("-", " ").title()
    title = extract_title(text, fallback_title)

    ext = Path(path).suffix.lower()
    if ext in {".html", ".htm"}:
        content = text
        is_html = True
    else:
        content = text_to_html(text)
        is_html = False

    return title, content, text, is_html


def load_content_items():
    if not os.path.isdir(CONTENT_DIR):
        return []

    files = [
        str(Path(CONTENT_DIR) / f)
        for f in os.listdir(CONTENT_DIR)
        if Path(CONTENT_DIR, f).is_file() and not f.startswith(".")
    ]

    items = []
    for path in sorted(files):
        parsed = parse_content_file(path)
        if parsed:
            title, content, raw_text, is_html = parsed
            items.append((title, content, raw_text, is_html, path))
    return items


def generate_placeholder_post():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    title = f"Daily Update - {timestamp}"

    hashtags = "#automation #blogger #autopost"
    content = "\n".join(
        [
            "<h2>Quick Update</h2>",
            "<p>This is an automated post created by your Blogger autoposter.</p>",
            "<h3>Why This Matters</h3>",
            "<p>Automations keep your blog active and consistent without manual effort.</p>",
            f"<p>{hashtags}</p>",
        ]
    )

    return title, content


def enforce_owner_lock():
    if not OWNER_KEY_REQUIRED:
        return

    provided = os.getenv(OWNER_KEY_ENV, "")
    if provided != OWNER_KEY_REQUIRED:
        raise PermissionError("Owner key check failed.")


def strip_html(text):
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_keywords(text, max_keywords=10):
    stopwords = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "your",
        "you",
        "are",
        "was",
        "were",
        "has",
        "have",
        "had",
        "into",
        "about",
        "over",
        "under",
        "what",
        "when",
        "where",
        "which",
        "who",
        "why",
        "how",
        "its",
        "their",
        "them",
        "they",
        "our",
        "out",
        "can",
        "will",
        "just",
        "more",
        "most",
        "make",
        "makes",
        "made",
        "also",
        "use",
        "using",
        "used",
        "like",
        "than",
        "then",
        "but",
        "not",
        "each",
        "any",
        "all",
        "get",
        "got",
        "new",
        "now",
    }

    words = re.findall(r"[a-zA-Z][a-zA-Z0-9-]{2,}", text.lower())
    counts = {}
    for w in words:
        if w in stopwords:
            continue
        counts[w] = counts.get(w, 0) + 1
    ranked = sorted(counts.items(), key=lambda x: (-x[1], x[0]))
    return [w for w, _ in ranked[:max_keywords]]


def is_generic_title(title):
    t = (title or "").strip().lower()
    if not t:
        return True
    generic_starts = ("automated post", "daily update", "quick update")
    return any(t.startswith(prefix) for prefix in generic_starts)


def build_human_title(keyword):
    if keyword:
        templates = [
            "How to Improve {k} Without Overthinking",
            "The Quiet Power of {k}",
            "A Clear, Simple Guide to {k}",
            "Small Changes That Lift Your {k}",
            "What Actually Works for {k}",
            "The No‑Stress Way to Build Better {k}",
            "The 5‑Minute Habit That Improves Your {k}",
            "The {k} Reset You Can Start Today",
            "{k} That Actually Sticks",
        ]
        tmpl = templates[abs(hash(keyword)) % len(templates)]
        return tmpl.format(k=keyword.title())
    return "A Quick Read for Today"


def generate_seo_title(base_title, keyword):
    base_title = base_title.strip()
    base_title = normalize_title(base_title, base_title)
    if is_generic_title(base_title):
        base_title = build_human_title(keyword)

    if len(base_title) <= 60:
        return base_title
    return base_title[:60].rstrip()


def generate_meta_description(text, keyword):
    clean = strip_html(text)
    if not clean:
        clean = f"{keyword.title()} tips and quick insights." if keyword else "Quick insights and tips."
    if keyword and keyword.lower() not in clean.lower():
        clean = f"{keyword.title()} - {clean}"
    if len(clean) > 160:
        clean = clean[:157].rstrip() + "..."
    if len(clean) < 120:
        clean = clean + " Learn more in this quick guide."
        if len(clean) > 160:
            clean = clean[:157].rstrip() + "..."
    return clean


def title_case(text):
    words = text.split()
    if not words:
        return text
    minor = {"and", "or", "the", "a", "an", "of", "to", "in", "on", "for"}
    out = []
    for i, w in enumerate(words):
        lower = w.lower()
        if i == 0 or lower not in minor:
            out.append(lower.capitalize())
        else:
            out.append(lower)
    return " ".join(out)


def pick_template(seed):
    templates = [
        ("Why {k} Matters", "What You’ll Learn", "Quick Actions"),
        ("The Core Idea", "Practical Steps", "Common Mistakes"),
        ("Big Picture", "Key Details", "Next Moves"),
        ("The Problem", "The Fix", "The Payoff"),
    ]
    idx = abs(hash(seed)) % len(templates)
    return templates[idx]


def make_hook(keyword, meta_description):
    if keyword:
        return f"{keyword.title()} is changing how people work and decide. {meta_description}"
    return meta_description


def make_conclusion(keyword):
    if keyword:
        return f"Bottom line: small moves in {keyword} create big results over time."
    return "Bottom line: small, consistent steps beat big, random effort."


def make_bullets(keywords):
    items = []
    for kw in keywords[:5]:
        items.append(f"{kw.title()}: focus on one practical improvement.")
    return items


def make_cta(keyword):
    if keyword:
        return f"Want more on {keyword}? Bookmark this page and check back tomorrow."
    return "Bookmark this page for daily tips and updates."


def make_faq(keyword):
    if not keyword:
        return []
    return [
        (f"What is {keyword}?", f"{keyword.title()} is a focus area that helps you improve outcomes with small, deliberate steps."),
        (f"How do I get started with {keyword}?", f"Start by choosing one small action and repeat it daily. Progress compounds fast."),
        (f"Why does {keyword} matter?", f"It saves time, reduces mistakes, and creates consistent results over time."),
    ]


def make_table_of_contents(headings):
    items = []
    for h in headings:
        anchor = re.sub(r"[^a-z0-9]+", "-", h.lower()).strip("-")
        items.append((h, anchor))
    return items


def generate_free_ai_text(seed_text, keyword):
    if not FREE_AI_ENABLED:
        return None

    if FREE_AI_PROVIDER != "ollama":
        return None

    if not OLLAMA_MODEL:
        return None

    prompt = (
        "Write a short, engaging blog post draft in clear, simple English. "
        "Use a curiosity-driven hook, short sentences, and 2-3 sections with headings. "
        "End with a concise conclusion line. "
        f"Main topic/seed: {seed_text.strip()}\n"
        f"Primary keyword: {keyword}\n"
    )

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }

    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data.get("response", "").strip() or None
    except Exception:
        logging.exception("Free AI generation failed")
        return None


def fetch_pexels_image(query, cache):
    if not PEXELS_API_KEY:
        return None

    query = query.strip()
    if not query:
        return None

    cache_key = f"pexels:{query.lower()}"
    if cache_key in cache:
        return cache[cache_key]

    params = {
        "query": query,
        "per_page": 1,
    }
    if PEXELS_ORIENTATION:
        params["orientation"] = PEXELS_ORIENTATION
    if PEXELS_LOCALE:
        params["locale"] = PEXELS_LOCALE

    url = "https://api.pexels.com/v1/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": PEXELS_API_KEY})

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        logging.exception("Pexels API request failed")
        return None

    photos = payload.get("photos") or []
    if not photos:
        return None

    photo = photos[0]
    src = photo.get("src") or {}
    image_url = src.get("large") or src.get("original")
    photographer = photo.get("photographer", "").strip()
    if not image_url:
        return None

    cache[cache_key] = (image_url, "Pexels", photographer)
    return cache[cache_key]


def fetch_pixabay_image(query, cache):
    if not (PIXABAY_ENABLE and PIXABAY_API_KEY):
        return None

    query = query.strip()
    if not query:
        return None

    cache_key = f"pixabay:{query.lower()}"
    if cache_key in cache:
        return cache[cache_key]

    params = {
        "key": PIXABAY_API_KEY,
        "q": query,
        "image_type": "photo",
        "orientation": PIXABAY_ORIENTATION,
        "lang": PIXABAY_LANG,
        "per_page": 3,
        "safesearch": "true",
    }
    url = "https://pixabay.com/api/?" + urllib.parse.urlencode(params)

    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        logging.exception("Pixabay API request failed")
        return None

    hits = payload.get("hits") or []
    if not hits:
        return None

    hit = hits[0]
    image_url = hit.get("webformatURL") or hit.get("largeImageURL")
    if not image_url:
        return None

    cache[cache_key] = (image_url, "Pixabay", None)
    return cache[cache_key]


def build_image_blocks(keywords, cache, max_images=3):
    images = []
    for kw in keywords:
        if len(images) >= max_images:
            break
        image = fetch_pexels_image(kw, cache)
        if not image:
            image = fetch_pixabay_image(kw, cache)
        if image:
            images.append((kw, image[0], image[1], image[2]))
    return images


def inject_images(content, images):
    if not images:
        return content

    if "{{image}}" in content:
        image_html = []
        for kw, url, provider, credit in images:
            alt_text = html.escape(kw)
            figure = [f'<figure><img src="{url}" alt="{alt_text}"/>']
            if PEXELS_ATTRIBUTION and provider == "Pexels" and credit:
                figure.append(
                    f"<figcaption>Photo by {html.escape(credit)} on "
                    '<a href="https://www.pexels.com">Pexels</a></figcaption>'
                )
            figure.append("</figure>")
            image_html.append("\n".join(figure))
        return content.replace("{{image}}", "\n".join(image_html))

    chunks = content.split("</p>")
    output = []
    img_index = 0
    for idx, chunk in enumerate(chunks):
        if not chunk.strip():
            continue
        output.append(chunk + "</p>")
        if img_index < len(images) and (idx == 0 or idx % 2 == 1):
            kw, url, provider, credit = images[img_index]
            alt_text = html.escape(kw)
            figure = [f'<figure><img src="{url}" alt="{alt_text}"/>']
            if PEXELS_ATTRIBUTION and provider == "Pexels" and credit:
                figure.append(
                    f"<figcaption>Photo by {html.escape(credit)} on "
                    '<a href="https://www.pexels.com">Pexels</a></figcaption>'
                )
            figure.append("</figure>")
            output.append("\n".join(figure))
            img_index += 1
    return "\n".join(output)


def build_featured_image_html(image):
    kw, url, provider, credit = image
    alt_text = html.escape(kw) if kw else "Post image"
    if PEXELS_ATTRIBUTION and provider == "Pexels" and credit:
        return "\n".join(
            [
                '<figure class="featured-image">',
                f'<img src="{url}" alt="{alt_text}" loading="lazy"/>',
                f"<figcaption>Photo by {html.escape(credit)} on <a href=\"https://www.pexels.com\">Pexels</a></figcaption>",
                "</figure>",
            ]
        )
    return f'<figure class="featured-image"><img src="{url}" alt="{alt_text}" loading="lazy"/></figure>'


def apply_featured_image(content, images):
    if not FEATURED_IMAGE_ENABLED:
        return content, images
    if "<img" in content.lower():
        return content, images

    if not images:
        return content, images
    featured_html = build_featured_image_html(images[0])

    if "{{featured_image}}" in content:
        content = content.replace("{{featured_image}}", featured_html)
    else:
        content = featured_html + "\n" + content
    return content, images[1:] if images else images


def build_post_html(title, raw_text, keywords, internal_links, external_links):
    keyword = keywords[0] if keywords else ""
    seo_title = generate_seo_title(title_case(title), keyword)
    meta_description = generate_meta_description(raw_text, keyword)

    ai_text = generate_free_ai_text(raw_text, keyword)
    base_text = ai_text if ai_text else raw_text

    sentences = re.split(r"(?<=[.!?])\s+", strip_html(base_text))
    body_sentences = [s for s in sentences if s]
    if not body_sentences:
        body_sentences = [meta_description]

    paragraphs = []
    current = []
    for s in body_sentences:
        if len(" ".join(current + [s])) > 240:
            paragraphs.append(" ".join(current))
            current = []
        current.append(s)
    if current:
        paragraphs.append(" ".join(current))

    h2_titles = pick_template(seo_title)
    toc_items = make_table_of_contents(list(h2_titles) + ["Quick Summary", "Related Posts", "Learn More", "FAQ"])

    content_parts = [f"<h1>{html.escape(seo_title)}</h1>"]
    # Strong lead for better snippets
    lead = meta_description
    if keyword and keyword.lower() not in lead.lower():
        lead = f"{keyword.title()} — {lead}"
    content_parts.append(f"<p><em>{html.escape(lead)}</em></p>")
    if toc_items:
        toc_html = "".join(
            f'<li><a href="#{anchor}">{html.escape(text)}</a></li>'
            for text, anchor in toc_items
        )
        content_parts.append(f"<div><strong>Table of Contents</strong><ul>{toc_html}</ul></div>")

    hook = make_hook(keyword, meta_description)
    content_parts.append(f"<p>{html.escape(hook)}</p>")

    # TL;DR box
    if paragraphs:
        tldr_points = paragraphs[:2]
        tldr_html = "".join(f"<li>{html.escape(p)}</li>" for p in tldr_points)
        content_parts.append("<div><strong>TL;DR</strong><ul>" + tldr_html + "</ul></div>")

    for idx, para in enumerate(paragraphs[:3]):
        heading = h2_titles[idx]
        anchor = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
        content_parts.append(f"<h2 id=\"{anchor}\">{html.escape(heading)}</h2>")
        content_parts.append(f"<p>{html.escape(para)}</p>")

    bullet_items = make_bullets(keywords)
    if bullet_items:
        content_parts.append("<h2 id=\"quick-summary\">Quick Summary</h2>")
        bullets_html = "".join(f"<li>{html.escape(item)}</li>" for item in bullet_items)
        content_parts.append(f"<ul>{bullets_html}</ul>")

    if internal_links:
        content_parts.append("<h2 id=\"related-posts\">Related Posts</h2>")
        links_html = "".join(
            f'<li><a href="{link}">{html.escape(text)}</a></li>'
            for text, link in internal_links
        )
        content_parts.append(f"<ul>{links_html}</ul>")

    if external_links:
        content_parts.append("<h2 id=\"learn-more\">Learn More</h2>")
        links_html = "".join(
            f'<li><a href="{link}" rel="nofollow noopener">{html.escape(text)}</a></li>'
            for text, link in external_links
        )
        content_parts.append(f"<ul>{links_html}</ul>")

    faq_items = make_faq(keyword)
    if faq_items:
        content_parts.append("<h2 id=\"faq\">FAQ</h2>")
        faq_html = []
        for q, a in faq_items:
            faq_html.append(f"<p><strong>{html.escape(q)}</strong><br/>{html.escape(a)}</p>")
        content_parts.append("\n".join(faq_html))

    content_parts.append(f"<p><strong>Conclusion:</strong> {html.escape(make_conclusion(keyword))}</p>")
    content_parts.append(f"<p><strong>CTA:</strong> {html.escape(make_cta(keyword))}</p>")

    hashtags = " ".join(f"#{kw}" for kw in keywords[:5])
    if hashtags:
        content_parts.append(f"<p><em>{html.escape(hashtags)}</em></p>")

    return seo_title, "\n".join(content_parts), meta_description


def post_with_retry(title, content, labels=None, source_label=None):
    attempts = MAX_RETRIES + 1
    for attempt in range(1, attempts + 1):
        try:
            result = create_post(title, content, labels=labels)
            post_id = result.get("id", "unknown")
            logging.info("Posted successfully: %s (id=%s)", title, post_id)
            return result
        except Exception as exc:
            logging.exception(
                "Post failed (attempt %s/%s) title=%s source=%s error=%s",
                attempt,
                attempts,
                title,
                source_label or "generated",
                exc,
            )
            if attempt < attempts:
                time.sleep(2 * attempt)
            else:
                raise


def archive_posted_file(path):
    if not ARCHIVE_POSTED:
        return

    source = Path(path)
    if not source.exists():
        return

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = Path(USED_DIR) / f"{source.stem}-{timestamp}{source.suffix}"
    shutil.move(str(source), str(target))


def run_once():
    ensure_dirs()
    enforce_owner_lock()

    logging.info("Starting Blogger auto-poster")
    authenticate()

    items = load_content_items()
    if items:
        recent_posts = get_recent_posts(max_results=5)
        internal_links = [
            (p.get("title", "Previous post"), p.get("url"))
            for p in recent_posts
            if p.get("url")
        ][:2]

        posted_count = 0
        cache = {}
        for title, content, raw_text, is_html, path in items:
            if posted_count >= MAX_POSTS_PER_DAY:
                break
            try:
                keywords = extract_keywords(strip_html(raw_text), max_keywords=10)
                external_links = []
                if keywords:
                    external_links.append(
                        (
                            "Wikipedia",
                            f"https://en.wikipedia.org/wiki/Special:Search?search={urllib.parse.quote(keywords[0])}",
                        )
                    )

                seo_title, seo_html, _ = build_post_html(
                    title, raw_text, keywords, internal_links, external_links
                )
                images = build_image_blocks(keywords, cache, max_images=MAX_IMAGES_PER_POST)
                seo_html, images = apply_featured_image(seo_html, images)
                seo_html = inject_images(seo_html, images)
                labels = keywords[:10]
                logging.info("SEO keywords used: %s", ", ".join(labels))
                post_with_retry(seo_title, seo_html, labels=labels, source_label=path)
                archive_posted_file(path)
                posted_count += 1
            except Exception:
                logging.exception("Failed to process file: %s", path)
                continue
        print(f"Posted {posted_count} article(s) from /content/")
        return

    title, content = generate_placeholder_post()
    keywords = extract_keywords(strip_html(content), max_keywords=10)
    seo_title, seo_html, _ = build_post_html(title, content, keywords, [], [])
    cache = {}
    images = build_image_blocks(keywords, cache, max_images=MAX_IMAGES_PER_POST)
    seo_html, images = apply_featured_image(seo_html, images)
    seo_html = inject_images(seo_html, images)
    post_with_retry(seo_title, seo_html, labels=keywords[:10])
    print("Posted 1 generated article")


def run_auto():
    setup_logging()
    run_once()


def run_daily():
    setup_logging()
    logging.info("Daily mode enabled. Time: %s %s", DAILY_TIME_HHMM, DAILY_TIMEZONE)
    tz = ZoneInfo(DAILY_TIMEZONE)
    hour, minute = [int(x) for x in DAILY_TIME_HHMM.split(":")]
    while True:
        now = datetime.now(tz)
        target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if target <= now:
            target = target + timedelta(days=1)
        sleep_seconds = (target - now).total_seconds()
        time.sleep(max(sleep_seconds, 1))
        try:
            run_once()
        except Exception:
            logging.exception("Daily run failed")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Blogger Auto Poster")
    parser.add_argument(
        "--daily",
        action="store_true",
        help="Run continuously and post once every day at the fixed time.",
    )
    args = parser.parse_args()

    if args.daily:
        run_daily()
    else:
        run_auto()
