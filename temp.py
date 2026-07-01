import asyncio
import backend
from sqlalchemy.future import select

async def f():
    db = backend.AsyncSessionLocal()
    res = await db.execute(select(backend.User))
    users = res.scalars().all()
    for u in users:
        print(f"{u.email} - {u.role} - {u.is_active}")
    await db.close()

if __name__ == '__main__':
    asyncio.run(f())
