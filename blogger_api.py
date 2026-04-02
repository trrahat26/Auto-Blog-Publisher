from googleapiclient.discovery import build

from auth import authenticate
from config import APP_NAME, BLOGGER_BLOG_ID


def get_service():
    creds = authenticate()
    return build("blogger", "v3", credentials=creds, cache_discovery=False)


def create_post(title, content):
    if not BLOGGER_BLOG_ID:
        raise ValueError(
            "BLOGGER_BLOG_ID is not set. Set it in config.py or as an env var."
        )

    service = get_service()
    body = {
        "kind": "blogger#post",
        "title": title,
        "content": content,
    }

    return (
        service.posts()
        .insert(blogId=BLOGGER_BLOG_ID, body=body, isDraft=False)
        .execute()
    )
