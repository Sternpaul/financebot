from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class SharedConfig(BaseSettings):
    """Configuration shared between all components"""
    timezone: str = "CET"
    redis_url: str = Field(default="redis://redis:6379", alias="REDIS_URL")
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    log_level: str = "INFO"

    # API Keys
    massive_api_key: Optional[str] = Field(None, alias="MASSIVE_API_KEY")
    polygon_api_key: Optional[str] = Field(None, alias="POLYGON_API_KEY")
    hyperliquid_api_key: Optional[str] = Field(None, alias="HYPERLIQUID_API_KEY")
    finnhub_api_key: Optional[str] = Field(None, alias="FINNHUB_API_KEY")

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

class BotConfig(SharedConfig):
    """Configuration specific to the Discord Bot process"""
    discord_token: str = Field(..., alias="DISCORD_TOKEN")
    discord_channel_id: int = Field(..., alias="DISCORD_CHANNEL_ID")
    discord_guild_id: Optional[int] = Field(None, alias="DISCORD_GUILD_ID")

class WorkerConfig(SharedConfig):
    """Configuration specific to the Background Worker process"""
    # Scheduler
    morning_report_time: str = "07:30"
    market_hours_start: str = "09:00"
    market_hours_end: str = "17:30"


    # LLM & Embedding
    llm_provider: str = Field("openrouter", alias="LLM_PROVIDER")
    llm_api_key: Optional[str] = Field(None, alias="LLM_API_KEY")
    llm_model: str = Field("nvidia/nemotron-3-ultra:free", alias="LLM_MODEL")
    embedding_provider: str = Field("openai", alias="EMBEDDING_PROVIDER")
    openai_api_key: Optional[str] = Field(None, alias="OPENAI_API_KEY")

    # Integrations
    rsshub_url: str = Field("http://rsshub:1200", alias="RSSHUB_URL")
    fintwit_twitter_handles: str = ""
    fintwit_telegram_channels: str = ""
    fintwit_substack_urls: str = ""

    # Thresholds
    btfd_pct_drop_threshold: float = -5.0
    btfd_volume_ratio_threshold: float = 2.0
    btfd_min_market_cap: int = 1000000000

    # Portfolio
    base_currency: str = "USD"
    default_account: str = "main"

    @property
    def twitter_handles_list(self) -> List[str]:
        return [h.strip() for h in self.fintwit_twitter_handles.split(',') if h.strip()]

# Global lazy instances. Use get_bot_config() or get_worker_config()
_bot_config = None
_worker_config = None

def get_bot_config() -> BotConfig:
    global _bot_config
    if _bot_config is None:
        _bot_config = BotConfig()
    return _bot_config

def get_worker_config() -> WorkerConfig:
    global _worker_config
    if _worker_config is None:
        _worker_config = WorkerConfig()
    return _worker_config
