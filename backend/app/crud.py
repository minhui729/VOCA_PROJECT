# backend/app/crud.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from . import models, schemas, security
import secrets
import string

from sqlalchemy.orm import selectinload

# --- Wordbook 관련 CRUD ---

# [수정] user_id 파라미터를 받지 않도록 함수 정의를 수정합니다.
async def get_wordbooks(db: AsyncSession, skip: int = 0, limit: int = 100):
    # 선생님 중심 모델이므로, 모든 단어장을 조회합니다.
    result = await db.execute(
        select(models.Wordbook).options(selectinload(models.Wordbook.words)).offset(skip).limit(limit)
    )
    return result.scalars().all()

async def create_wordbook_with_words(db: AsyncSession, wb_data: schemas.WordbookUploadRequest, owner_id: int):
    # 1. 단어장 객체 생성
    db_wordbook = models.Wordbook(
        title=wb_data.title,
        description=wb_data.description,
        owner_id=owner_id
    )
    db.add(db_wordbook)
    await db.flush()
    await db.refresh(db_wordbook)

    # 2. [핵심 수정] commit 하기 전에, 필요한 id 값을 미리 변수에 저장합니다.
    new_wordbook_id = db_wordbook.id

    # 3. 저장된 id 값으로 단어 객체들 생성
    db_words = [
        models.Word(
            **word.model_dump(),
            wordbook_id=new_wordbook_id # 객체 대신 변수 사용
        ) for word in wb_data.words
    ]
    db.add_all(db_words)
    
    # 4. 모든 변경사항을 한 번에 최종 저장 (이 시점에 db_wordbook 객체는 만료됨)
    await db.commit()
    
    # 5. 이제 만료된 객체 대신, 저장해둔 id 변수를 사용하여 다시 조회합니다.
    return await get_wordbook(db, wordbook_id=new_wordbook_id)

# [수정] 즉시 로딩 옵션 추가
async def get_wordbook(db: AsyncSession, wordbook_id: int):
    result = await db.execute(
        select(models.Wordbook)
        .options(selectinload(models.Wordbook.words)) # words를 함께 로딩
        .filter(models.Wordbook.id == wordbook_id)
    )
    return result.scalars().first()

# --- User 관련 CRUD ---

async def create_random_unique_code(db: AsyncSession, length: int = 4):
    while True:
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))
        existing_user = await get_user_by_username(db, username=code)
        if not existing_user:
            return code

async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(models.User).filter(models.User.username == username))
    return result.scalars().first()
    
async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(models.User).filter(models.User.email == email))
    return result.scalars().first()

async def create_student(db: AsyncSession, user_create_data: dict, initial_password: str):
    unique_code = await create_random_unique_code(db)
    hashed_password = security.get_password_hash(initial_password)
    db_user = models.User(
        username=unique_code,
        email=user_create_data['email'],
        hashed_password=hashed_password,
        role=models.UserRole.student
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(models.User).offset(skip).limit(limit))
    return result.scalars().all()

async def authenticate_user(db: AsyncSession, username: str, password: str):
    user = await get_user_by_username(db, username=username)
    if not user:
        return False
    if not security.verify_password(password, user.hashed_password):
        return False
    return user

async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(models.User).filter(models.User.id == user_id))
    return result.scalars().first()

async def delete_user(db: AsyncSession, user_id: int):
    db_user = await get_user(db, user_id=user_id)
    if db_user:
        await db.delete(db_user)
        await db.commit()
        return db_user
    return None

async def update_user_password(db: AsyncSession, user_id: int, new_password: str):
    db_user = await get_user(db, user_id=user_id)
    if db_user:
        hashed_password = security.get_password_hash(new_password)
        db_user.hashed_password = hashed_password
        await db.commit()
        await db.refresh(db_user)
        return db_user
    return None

# --- Test 관련 CRUD ---
async def create_test(db: AsyncSession, test: schemas.TestCreate, creator_id: int):
    db_test = models.Test(
        title=test.title,
        wordbook_id=test.wordbook_id,
        creator_id=creator_id
    )
    db.add(db_test)
    await db.commit()
    await db.refresh(db_test)
    return db_test