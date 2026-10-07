"""Exercise actual SQL in an ephemeral loopback PostgreSQL cluster, never Supabase.

Skipped only when local PostgreSQL tools are absent. No external DATABASE_URL is used.
"""
import asyncio
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/india"))
from normalize_lgd_districts import DEFAULT_SOURCE, SOURCE, load_state_mapping, normalize_source
from lgd_district_import import run_database_plan
from app.routes import india


def run_process(args):
    # Background postgres inherits standard handles on Windows. File handles avoid
    # waiting forever for a descendant to close subprocess capture pipes.
    with tempfile.TemporaryFile(mode="w+t", encoding="utf-8") as output:
        result = subprocess.run(args, stdout=output, stderr=subprocess.STDOUT, text=True, timeout=60,
                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        output.seek(0)
        detail = output.read()
    assert result.returncode == 0, detail
    return result


@pytest.fixture(scope="module")
def local_postgres(tmp_path_factory):
    binaries = {name: shutil.which(name) for name in ("initdb", "pg_ctl", "psql", "createdb")}
    if not all(binaries.values()):
        pytest.skip("Ephemeral SQL integration needs local PostgreSQL binaries")
    directory = tmp_path_factory.mktemp("lgd-postgres")
    data = directory / "pgdata"
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    run_process([binaries["initdb"], "-D", str(data), "-A", "trust", "-U", "lgd_test", "--no-locale", "-E", "UTF8"])
    run_process([binaries["pg_ctl"], "-D", str(data), "-l", str(directory / "postgres.log"),
                 "-o", f"-h 127.0.0.1 -p {port} -F", "-w", "start"])
    try:
        run_process([binaries["psql"], "-h", "127.0.0.1", "-p", str(port), "-U", "lgd_test", "-d", "postgres",
                     "-v", "ON_ERROR_STOP=1", "-c", "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;"])
        yield binaries, port, directory
    finally:
        run_process([binaries["pg_ctl"], "-D", str(data), "-m", "fast", "-w", "stop"])


@pytest.fixture
def directory_db(local_postgres):
    binaries, port, directory = local_postgres
    name = "lgd_test_" + uuid4().hex
    run_process([binaries["createdb"], "-h", "127.0.0.1", "-p", str(port), "-U", "lgd_test", name])
    foundation = (ROOT / "database/migrations/041_india_explorer.sql").read_text()
    backend = (ROOT / "database/migrations/042_india_explorer_backend.sql").read_text()
    # Use the existing district DDL verbatim, with minimal referenced directory tables.
    district_ddl = re.search(r"CREATE TABLE IF NOT EXISTS india_districts \(.*?\n\);", foundation, re.S).group()
    additions = "\n".join(line for line in backend.splitlines() if line.startswith("ALTER TABLE india_districts ")
                          or line.startswith("CREATE UNIQUE INDEX IF NOT EXISTS uq_india_districts_state_slug "))
    ddl = """
      CREATE TABLE india_sources(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT UNIQUE,active BOOLEAN DEFAULT TRUE);
      CREATE TABLE india_states(id TEXT PRIMARY KEY,name TEXT,verification_status TEXT);
    """ + district_ddl + additions + """
      CREATE TABLE india_cities(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),district_id UUID REFERENCES india_districts(id),verification_status TEXT);
      CREATE TABLE india_places(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),district_id UUID REFERENCES india_districts(id),verification_status TEXT);
    """
    setup = directory / (name + ".sql")
    setup.write_text(ddl, encoding="utf-8")
    run_process([binaries["psql"], "-h", "127.0.0.1", "-p", str(port), "-U", "lgd_test", "-d", name,
                 "-v", "ON_ERROR_STOP=1", "-f", str(setup), "-f", str(ROOT / "database/migrations/043_india_lgd_district_identity.sql")])
    # Credentials/host are fixed test-only values, independent of production settings.
    return f"postgresql+asyncpg://lgd_test@127.0.0.1:{port}/{name}"


async def seed_states(factory):
    async with factory() as session:
        await session.execute(text("INSERT INTO india_sources(name) VALUES (:name)"), {"name": SOURCE})
        await session.execute(text("INSERT INTO india_states(id,name,verification_status) VALUES (:id,:name,'verified')"),
                              [{"id": entry["state_id"], "name": entry["state_name"]} for entry in load_state_mapping().values()])
        await session.commit()


def test_actual_postgres_upsert_idempotence_provenance_and_readonly(directory_db):
    async def scenario():
        engine = create_async_engine(directory_db, poolclass=NullPool)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        rows, metadata, _ = normalize_source(DEFAULT_SOURCE)
        await seed_states(factory)
        try:
            async with factory() as session:
                before = await run_database_plan(session, rows, metadata)
                assert before["prospective_inserts"] == 784
                assert before["database_writes"] == 0
            async with factory() as session:
                assert (await session.execute(text("SELECT count(*) FROM india_districts"))).scalar_one() == 0
                assert (await session.execute(text("SELECT count(*) FROM india_lgd_district_snapshots"))).scalar_one() == 0
            async with factory() as session:
                inserted = await run_database_plan(session, rows, metadata, apply=True)
                assert inserted["prospective_inserts"] == 784
            async with factory() as session:
                ids = (await session.execute(text("SELECT lgd_district_code,id FROM india_districts ORDER BY lgd_district_code"))).all()
                # Existing related records must retain their district UUID after updates.
                await session.execute(text("INSERT INTO india_cities(district_id,verification_status) VALUES (:id,'verified')"), {"id": ids[0].id})
                await session.commit()
            async with factory() as session:
                repeated = await run_database_plan(session, rows, metadata, apply=True)
                assert repeated["prospective_unchanged"] == 784
                assert repeated["database_writes"] == 0
            async with factory() as session:
                actual = (await session.execute(text("SELECT lgd_district_code,id FROM india_districts ORDER BY lgd_district_code"))).all()
                assert actual == ids
                assert (await session.execute(text("SELECT count(*) FROM india_lgd_district_snapshots"))).scalar_one() == 1
                assert (await session.execute(text("SELECT metadata->>'sha256' FROM india_lgd_district_snapshots"))).scalar_one() == metadata["sha256"]
                await session.execute(text("UPDATE india_districts SET census_2001_code=NULL WHERE id=:id"), {"id": ids[0].id})
                await session.commit()
            async with factory() as session:
                updated = await run_database_plan(session, rows, metadata, apply=True)
                assert updated["prospective_updates"] == 1 and updated["prospective_unchanged"] == 783
            async with factory() as session:
                assert (await session.execute(text("SELECT district_id FROM india_cities"))).scalar_one() == ids[0].id
            # PostgreSQL enforces read-only, independent of application branching.
            async with factory() as session:
                await session.execute(text("SET TRANSACTION READ ONLY"))
                with pytest.raises(Exception, match="read-only"):
                    await session.execute(text("INSERT INTO india_sources(name) VALUES ('forbidden')"))
                await session.rollback()
        finally:
            await engine.dispose()
    asyncio.run(scenario())


def test_actual_postgres_api_verified_only_filtering_and_provenance(directory_db, monkeypatch):
    async def scenario():
        engine = create_async_engine(directory_db, poolclass=NullPool)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        monkeypatch.setattr(india, "SessionLocal", factory)
        rows, metadata, _ = normalize_source(DEFAULT_SOURCE)
        await seed_states(factory)
        try:
            async with factory() as session:
                await run_database_plan(session, rows, metadata, apply=True)
            ka_rows = [row for row in rows if row["state_id"] == "ka"]
            async with factory() as session:
                hidden = (await session.execute(text("UPDATE india_districts SET verification_status='pending' WHERE lgd_district_code=:code RETURNING id"),
                                                {"code": ka_rows[0]["district_lgd_code"]})).scalar_one()
                await session.commit()
            global_result = await india.india_district_directory(state_id=None, q=None, limit=1000)
            assert global_result["total"] == 783 and len(global_result["items"]) == 783
            assert all(item["verification_status"] == "verified" for item in global_result["items"])
            result = await india.india_district_directory(state_id=" KA ", q=None, limit=1000)
            assert result["total"] == len(ka_rows) - 1
            assert all(item["state_id"] == "ka" for item in result["items"])
            assert str(hidden) not in {item["id"] for item in result["items"]}
            district = result["items"][0]
            assert district["source_name"] == SOURCE
            assert district["provenance"]["source_sha256"] == metadata["sha256"]
            assert district["lgd_district_code"] == district["source_record_id"]
            assert (await india.state_districts("ka", limit=1000))["items"]
            detail = await india.district_detail("ka", district["id"])
            assert detail["lgd_district_code"] == district["lgd_district_code"]
            with pytest.raises(india.HTTPException) as exc:
                await india.district_detail("ka", str(hidden))
            assert exc.value.status_code == 404
        finally:
            await engine.dispose()
    asyncio.run(scenario())
