# backend/app/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ✨ config.py에서 DATABASE_URL을 가져옵니다.
from .config import settings

# ✨ 비동기(asyncio)가 아닌, 일반 동기 엔진을 생성합니다.
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# ✨ 동기 세션을 위한 SessionLocal을 생성합니다.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# ✨ 동기 세션을 제공하는 get_db 의존성 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
