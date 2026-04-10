from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration du service telemetry chargée depuis les variables d'environnement."""

    mqtt_host: str = "mqtt"
    mqtt_port: int = 1883
    db_path: str = "/data/telemetry.db"

    class Config:
        env_file = ".env"


settings = Settings()
