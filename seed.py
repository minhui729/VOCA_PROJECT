import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from dotenv import load_dotenv

# ==============================================================================
# .env 파일의 절대 경로를 직접 지정하여 로드합니다.
# 이 방법은 자동 탐색 기능의 오류를 우회하여 가장 확실하게 환경 변수를 불러옵니다.
# ------------------------------------------------------------------------------
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
else:
    print(f"오류: '{dotenv_path}' 경로에서 .env 파일을 찾을 수 없습니다.")
# ==============================================================================


# ==============================================================================
# 중요: 아래 import 경로는 사용자님의 실제 프로젝트 구조에 맞게 수정해야 합니다.
# ------------------------------------------------------------------------------
import sys
# 'backend' 폴더 안에 app 폴더가 있으므로 경로를 추가합니다.
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.models import User, UserRole
from app.security import get_password_hash
# ==============================================================================


# --- 초기 데이터 설정 ---
# 데이터베이스 스키마에 맞게 email을 제거하고 name을 추가했습니다.
INITIAL_USERS = [
    {
        "username": "admin",
        "name": "관리자",
        "password": "1234", # 실제 프로덕션에서는 더 강력한 비밀번호를 사용하세요.
        "role": UserRole.teacher,
    },

]

async def seed_data():
    """
    데이터베이스에 초기 데이터를 생성하는 메인 함수
    """
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("오류: DATABASE_URL 환경 변수를 로드하지 못했습니다.")
        print("'.env' 파일의 내용과 경로를 다시 한번 확인해주세요.")
        return

    # 데이터베이스 URL을 asyncpg와 호환되도록 수정
    db_url = DATABASE_URL
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(db_url, echo=False)
    AsyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

    print("초기 데이터 생성을 시작합니다...")
    
    async with AsyncSessionLocal() as db:
        for user_data in INITIAL_USERS:
            # 이미 사용자가 존재하는지 확인
            result = await db.execute(select(User).where(User.username == user_data["username"]))
            existing_user = result.scalars().first()
            
            if existing_user:
                print(f"- 사용자 '{user_data['username']}'는(은) 이미 존재합니다. 건너뜁니다.")
                continue

            # 비밀번호 해싱
            hashed_password = get_password_hash(user_data["password"])
            
            # 새로운 사용자 객체 생성 (email 제거, name 추가)
            new_user = User(
                username=user_data['username'],
                name=user_data['name'],
                hashed_password=hashed_password,
                role=user_data['role']
            )
            db.add(new_user)
            print(f"+ 사용자 '{user_data['username']}'를 추가했습니다.")
        
        try:
            await db.commit()
            print("\n데이터베이스에 성공적으로 커밋했습니다.")
        except Exception as e:
            await db.rollback()
            print(f"\n오류가 발생하여 롤백했습니다: {e}")

    # 엔진 자원 해제
    await engine.dispose()
    print("초기 데이터 생성이 완료되었습니다.")


if __name__ == "__main__":
    # 비동기 함수 실행
    asyncio.run(seed_data())
