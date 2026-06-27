from pydantic import BaseModel, Field, ValidationInfo, field_validator


class AlertSubscribeRequest(BaseModel):
    channel: str = Field(pattern="^(email|whatsapp|telegram|push)$")
    channel_address: str = Field(min_length=3, max_length=320)
    state_codes: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    qualification_tags: list[str] = Field(default_factory=list)
    user_id: str | None = Field(default=None, max_length=36)
    website: str = Field(default="", max_length=200)

    @field_validator("channel_address")
    @classmethod
    def validate_channel_address(cls, value: str, info: ValidationInfo) -> str:
        address = value.strip()
        channel = info.data.get("channel")
        if channel == "email" and "@" not in address:
            raise ValueError("Invalid email address")
        if channel == "whatsapp":
            digits = "".join(c for c in address if c.isdigit())
            if len(digits) < 10:
                raise ValueError("Invalid WhatsApp number")
        if channel == "telegram" and len(address) < 3:
            raise ValueError("Invalid Telegram chat ID")
        if channel == "telegram" and address.startswith("@"):
            raise ValueError("Use numeric Telegram chat ID (message @userinfobot after /start)")
        if channel == "push" and len(address) < 8:
            raise ValueError("Invalid push token")
        return address


class AlertUnsubscribeRequest(BaseModel):
    id: str | None = Field(default=None, max_length=36)
    channel: str | None = Field(default=None, pattern="^(email|whatsapp|telegram|push)$")
    channel_address: str | None = Field(default=None, max_length=320)
