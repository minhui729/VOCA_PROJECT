# app/config.py
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 코드에서 사용할 환경 변수를 정의합니다.
    DATABASE_URL: str
    SECRET_KEY: str  # 추가
    ALGORITHM: str   # 추가
    ACCESS_TOKEN_EXPIRE_MINUTES: int # 추가


    class Config:
        # .env 파일을 읽어오도록 설정합니다.
        # 이 파일은 로컬 개발 환경에서만 사용됩니다.
        env_file = ".env"
        env_file_encoding = 'utf-8'

# 설정 객체 생성
settings = Settings()