from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration du service LLM chargée depuis les variables d'environnement."""

    ollama_url: str = "http://ollama:11434"
    ollama_model: str = "phi4-mini"
    ollama_context_length: int = 8192
    request_timeout: float = 120.0

    class Config:
        env_file = ".env"


settings = Settings()
