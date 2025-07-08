import os
from logging.config import fileConfig

from sqlalchemy import pool

from alembic import context

from app.models import Base

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# ------------------------------------------------------------------ #
#      ⬇️⬇️⬇️ 이 부분이 수정/추가된 핵심입니다 ⬇️⬇️⬇️               #
# ------------------------------------------------------------------ #

# Render와 같은 배포 환경을 위해 환경 변수에서 데이터베이스 URL을 가져옵니다.
# DATABASE_URL 환경 변수가 없으면 alembic.ini의 기본 설정을 사용합니다.
database_url = os.getenv("DATABASE_URL")
if database_url:
    # 비동기 작업을 위해 드라이버를 asyncpg로 지정해야 합니다.
    # Render의 URL은 'postgres://' 또는 'postgresql://'로 시작할 수 있습니다.
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    
    config.set_main_option("sqlalchemy.url", database_url)

# ------------------------------------------------------------------ #


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # 이제 이 부분은 Render 환경에서는 DATABASE_URL을,
    # 로컬에서는 alembic.ini의 URL을 동적으로 사용하게 됩니다.
    connectable = create_async_engine(
        config.get_main_option("sqlalchemy.url")
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    # 엔진 자원 해제
    await connectable.dispose()



if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
