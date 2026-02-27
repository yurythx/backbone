from django.conf import settings
import os

def mock_get_path(url):
    media_url = '/media/'
    image_path = None
    if url.startswith(media_url):
        image_path = url[len(media_url):].lstrip('/')
    elif '://' in url:
        idx = url.find('/media/')
        if idx != -1:
            # Current logic in ArticleService
            image_path = url[idx+1:]
        else:
            image_path = url
    else:
        image_path = url
    return image_path

def improved_get_path(url):
    media_url = '/media/'
    image_path = None
    if url.startswith(media_url):
        image_path = url[len(media_url):].lstrip('/')
    elif '://' in url:
        idx = url.find(media_url)
        if idx != -1:
            image_path = url[idx + len(media_url):]
        else:
            image_path = url
    else:
        # If it's already a relative path, strip leading slash just in case
        image_path = url.lstrip('/')
        
    return image_path.lstrip('/')

urls = [
    "/media/media_library/2026/02/test.jpg",
    "http://localhost:8005/media/media_library/2026/02/test.jpg",
    "https://ecossistema.com/media/media_library/2026/02/test.jpg",
    "media_library/2026/02/test.jpg"
]

print("Testing Current Logic:")
for u in urls:
    print(f"URL: {u} -> PATH: {mock_get_path(u)}")

print("\nTesting Improved Logic:")
for u in urls:
    print(f"URL: {u} -> PATH: {improved_get_path(u)}")
