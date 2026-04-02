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

# Optional: move posted files to /content/posted to avoid duplicates
ARCHIVE_POSTED = True
POSTED_DIR = os.path.join(CONTENT_DIR, "posted")

# Daily loop interval (hours) when run in daily mode
DAILY_INTERVAL_HOURS = 24

# Optional: Pexels image enrichment
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "").strip()
PEXELS_ORIENTATION = os.getenv("PEXELS_ORIENTATION", "landscape").strip()
PEXELS_LOCALE = os.getenv("PEXELS_LOCALE", "").strip()
PEXELS_ATTRIBUTION = True

# Optional: owner lock (set both env vars to enable)
OWNER_KEY_REQUIRED = os.getenv("OWNER_KEY_REQUIRED", "").strip()
OWNER_KEY_ENV = os.getenv("OWNER_KEY_ENV", "OWNER_KEY").strip()
