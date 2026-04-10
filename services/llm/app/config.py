from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration du service LLM chargée depuis les variables d'environnement."""

    ollama_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "llama3.2"

    class Config:
        env_file = ".env"


settings = Settings()
