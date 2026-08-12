from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chat

app = FastAPI()

raw_origins = settings.CORS_ORIGINS or "http://localhost:3000"
CORS_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
if not CORS_ORIGINS:
    CORS_ORIGINS = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)