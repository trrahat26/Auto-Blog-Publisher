import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Required: Set your Blogger blog ID (either here or via BLOGGER_BLOG_ID env var)
BLOGGER_BLOG_ID = os.getenv("BLOGGER_BLOG_ID", "2337671613504683").strip()

# OAuth settings
CLIENT_SECRET_FILE = os.getenv(
    "BLOGGER_CLIENT_SECRET_FILE",
    os.path.join(BASE_DIR, "client_secret.json"),
)
TOKEN_FILE = os.getenv(
    "BLOGGER_TOKEN_FILE",
    os.path.join(BASE_DIR, "token.json"),
)
SCOPES = ["https://www.googleapis.com/auth/blogger"]

# App
APP_NAME = "Auto Blogger Poster"

# Paths
LOG_DIR = os.path.join(BASE_DIR, "logs")
CONTENT_DIR = os.path.join(BASE_DIR, "content")
LOG_FILE = os.path.join(LOG_DIR, "auto_blogger.log")

# Optional: move posted files to /content/used to avoid duplicates
ARCHIVE_POSTED = True
USED_DIR = os.path.join(CONTENT_DIR, "used")

# Daily scheduler (fixed time)
# Default set for Tier-1 audience (US Eastern at 8:00 PM)
DAILY_TIME_HHMM = os.getenv("DAILY_TIME_HHMM", "20:00").strip()
DAILY_TIMEZONE = os.getenv("DAILY_TIMEZONE", "America/New_York").strip()
MAX_POSTS_PER_DAY = int(os.getenv("MAX_POSTS_PER_DAY", "3"))

# Optional: Pexels image enrichment
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "").strip()
PEXELS_ORIENTATION = os.getenv("PEXELS_ORIENTATION", "landscape").strip()
PEXELS_LOCALE = os.getenv("PEXELS_LOCALE", "").strip()
PEXELS_ATTRIBUTION = True

# Optional: Pixabay (note: Pixabay API disallows permanent hotlinking)
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY", "").strip()
PIXABAY_ENABLE = os.getenv("PIXABAY_ENABLE", "false").strip().lower() == "true"
PIXABAY_ORIENTATION = os.getenv("PIXABAY_ORIENTATION", "horizontal").strip()
PIXABAY_LANG = os.getenv("PIXABAY_LANG", "en").strip()

# Optional: Wikimedia Commons fallback (no API key needed)
WIKIMEDIA_IMAGE_ENABLE = os.getenv("WIKIMEDIA_IMAGE_ENABLE", "true").strip().lower() == "true"

# Images
MAX_IMAGES_PER_POST = int(os.getenv("MAX_IMAGES_PER_POST", "3"))
FEATURED_IMAGE_ENABLED = os.getenv("FEATURED_IMAGE_ENABLED", "true").strip().lower() == "true"

# Cache
CACHE_DIR = os.path.join(LOG_DIR, "cache")
TITLE_HISTORY_FILE = os.path.join(CACHE_DIR, "title_history.json")
TITLE_HISTORY_LIMIT = int(os.getenv("TITLE_HISTORY_LIMIT", "500"))

# Free AI options
# FREE_AI_ENABLED turns on AI writing for fresh posts (default true so the tool is useful).
# FREE_AI_PROVIDER can be "auto" (tries Gemini, then Groq, then Ollama),
# or a single provider: "gemini", "groq", "ollama".
FREE_AI_ENABLED = os.getenv("FREE_AI_ENABLED", "true").strip().lower() == "true"
FREE_AI_PROVIDER = os.getenv("FREE_AI_PROVIDER", "auto").strip().lower()
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").strip()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1").strip()

# Free cloud AI providers (no local install; keep free API keys as GitHub Secrets)
# Gemini: get a free API key at https://aistudio.google.com/apikey
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
# Groq: get a free API key at https://console.groq.com/keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
GROQ_URL = os.getenv("GROQ_URL", "https://api.groq.com/openai/v1/chat/completions").strip()

# When there are no articles in /content, the tool writes a fresh SEO article on
# one of these topics (rotating daily). Edit this list to match your blog's niche.
AI_ARTICLE_ENABLED = os.getenv("AI_ARTICLE_ENABLED", "true").strip().lower() == "true"
CONTENT_TOPICS = os.getenv(
    "CONTENT_TOPICS",
    "small daily habits that improve productivity|"
    "simple budgeting tips to save money|"
    "free tools that make remote work easier|"
    "learn a new skill in 30 days|"
    "ways to build a consistent morning routine|"
    "how to write better emails at work|"
    "declutter your digital life in a weekend|"
    "beginner guide to growing a side project|"
    "healthy habits that boost energy naturally|"
    "how to stay focused without expensive apps",
).split("|")

# Optional: owner lock (set both env vars to enable)
OWNER_KEY_REQUIRED = os.getenv("OWNER_KEY_REQUIRED", "").strip()
OWNER_KEY_ENV = os.getenv("OWNER_KEY_ENV", "OWNER_KEY").strip()
