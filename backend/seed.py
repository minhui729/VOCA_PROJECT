import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

# ==============================================================================
# 중요: 아래 import 경로는 사용자님의 실제 프로젝트 구조에 맞게 수정해야 합니다.
# ------------------------------------------------------------------------------
# 만약 이 스크립트를 실행할 때 'ModuleNotFoundError'가 발생하면,
# app 폴더가 있는 경로를 파이썬이 찾을 수 있도록 경로를 추가해야 할 수 있습니다.
# 예: import sys; sys.path.append('backend')
import sys
# 'backend' 폴더 안에 app 폴더가 있으므로 경로를 추가합니다.
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.models import User, UserRole
from app.security import get_password_hash
# ==============================================================================


# --- 초기 데이터 설정 ---
# 여기에 필요한 초기 사용자를 추가하거나 수정할 수 있습니다.
INITIAL_USERS = [
    {
        "username": "teacher",
        "password": "password123", # 실제 프로덕션에서는 더 강력한 비밀번호를 사용하세요.
        "role": UserRole.teacher,
        "name": "선생"
    },
]

async def seed_data():
    """
    데이터베이스에 초기 데이터를 생성하는 메인 함수
    """
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("오류: DATABASE_URL 환경 변수가 설정되지 않았습니다.")
        print("Render 서비스의 Environment 탭에서 DATABASE_URL이 올바르게 설정되었는지 확인하세요.")
        return

    # Render 환경의 데이터베이스 URL을 asyncpg와 호환되도록 수정
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
            
            # 새로운 사용자 객체 생성
            new_user = User(
                username=user_data["username"],
                email=user_data["email"],
                hashed_password=hashed_password,
                role=user_data["role"]
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
