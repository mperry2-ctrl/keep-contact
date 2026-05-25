from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    database_url: str = ""
    resend_api_key: str = ""
    from_email: str = "noreply@example.com"
    frontend_url: str = "http://localhost:5173"
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""  # E.164 format e.g. +15005550006

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
