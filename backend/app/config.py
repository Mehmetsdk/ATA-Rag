import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Settings(BaseSettings):
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://user:password@localhost:5432/atarag",
    )
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    CORS_ORIGINS: str = os.environ.get("CORS_ORIGINS", "http://localhost:3000")


settings = Settings()
