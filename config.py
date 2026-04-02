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
DAILY_TIME_HHMM = os.getenv("DAILY_TIME_HHMM", "18:30").strip()
DAILY_TIMEZONE = os.getenv("DAILY_TIMEZONE", "Asia/Kolkata").strip()
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

# Images
MAX_IMAGES_PER_POST = int(os.getenv("MAX_IMAGES_PER_POST", "3"))

# Cache
CACHE_DIR = os.path.join(LOG_DIR, "cache")

# Optional: owner lock (set both env vars to enable)
OWNER_KEY_REQUIRED = os.getenv("OWNER_KEY_REQUIRED", "").strip()
OWNER_KEY_ENV = os.getenv("OWNER_KEY_ENV", "OWNER_KEY").strip()
