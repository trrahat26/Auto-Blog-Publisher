import html
import json
import logging
import os
import shutil
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

from auth import authenticate
from blogger_api import create_post
from config import (
    ARCHIVE_POSTED,
    CONTENT_DIR,
    DAILY_INTERVAL_HOURS,
    LOG_DIR,
    LOG_FILE,
    OWNER_KEY_ENV,
    OWNER_KEY_REQUIRED,
    PEXELS_API_KEY,
    PEXELS_ATTRIBUTION,
    PEXELS_LOCALE,
    PEXELS_ORIENTATION,
    POSTED_DIR,
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
        os.makedirs(POSTED_DIR, exist_ok=True)


def extract_title(text, fallback_title):
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.lower().startswith("title:"):
            return stripped.split(":", 1)[1].strip() or fallback_title
        if stripped.startswith("# "):
            return stripped[2:].strip() or fallback_title
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
    else:
        content = text_to_html(text)

    return title, content


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
            items.append((parsed[0], parsed[1], path))
    return items


def generate_placeholder_post():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    title = f"Automated Post - {timestamp}"

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


def fetch_pexels_image(title):
    if not PEXELS_API_KEY:
        return None

    query = title.strip()
    if not query:
        return None

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

    return image_url, photographer


def inject_pexels_image(title, content):
    if not PEXELS_API_KEY:
        return content

    lower = content.lower()
    if "<img" in lower:
        return content

    image_data = fetch_pexels_image(title)
    if not image_data:
        return content

    image_url, photographer = image_data
    alt_text = html.escape(title)
    figure = [f'<figure><img src="{image_url}" alt="{alt_text}"/>']
    if PEXELS_ATTRIBUTION and photographer:
        figure.append(
            f"<figcaption>Photo by {html.escape(photographer)} on "
            '<a href="https://www.pexels.com">Pexels</a></figcaption>'
        )
    figure.append("</figure>")
    image_html = "\n".join(figure)

    if "{{image}}" in content:
        return content.replace("{{image}}", image_html)

    return image_html + "\n" + content


def post_with_retry(title, content, source_label=None):
    attempts = MAX_RETRIES + 1
    for attempt in range(1, attempts + 1):
        try:
            result = create_post(title, content)
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
    target = Path(POSTED_DIR) / f"{source.stem}-{timestamp}{source.suffix}"
    shutil.move(str(source), str(target))


def run_once():
    ensure_dirs()
    enforce_owner_lock()

    logging.info("Starting Blogger auto-poster")
    authenticate()

    items = load_content_items()
    if items:
        for title, content, path in items:
            content = inject_pexels_image(title, content)
            post_with_retry(title, content, source_label=path)
            archive_posted_file(path)
        print(f"Posted {len(items)} article(s) from /content/")
        return

    title, content = generate_placeholder_post()
    content = inject_pexels_image(title, content)
    post_with_retry(title, content)
    print("Posted 1 generated article")


def run_auto():
    setup_logging()
    run_once()


def run_daily():
    setup_logging()
    logging.info("Daily mode enabled. Interval: %s hour(s)", DAILY_INTERVAL_HOURS)
    while True:
        try:
            run_once()
        except Exception:
            logging.exception("Daily run failed")
        time.sleep(DAILY_INTERVAL_HOURS * 3600)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Blogger Auto Poster")
    parser.add_argument(
        "--daily",
        action="store_true",
        help="Run continuously and post once every interval.",
    )
    args = parser.parse_args()

    if args.daily:
        run_daily()
    else:
        run_auto()
