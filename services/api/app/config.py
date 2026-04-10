from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration du service API chargée depuis les variables d'environnement."""

    mqtt_host: str = "mqtt"
    mqtt_port: int = 1883
    telemetry_url: str = "http://telemetry:8003"
    llm_url: str = "http://llm:8001"

    class Config:
        env_file = ".env"


settings = Settings()
