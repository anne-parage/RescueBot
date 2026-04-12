from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration du service LLM chargée depuis les variables d'environnement."""

    ollama_url: str = "http://192.168.1.28:11434"
    ollama_model: str = "VladimirGav/gemma4-26b-16GB-VRAM:latest"
    ollama_context_length: int = 8192
    request_timeout: float = 120.0

    class Config:
        env_file = ".env"


settings = Settings()
