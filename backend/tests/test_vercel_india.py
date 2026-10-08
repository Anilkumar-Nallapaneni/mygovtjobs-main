"""Exercise the actual serverless entrypoint without a database or deployment."""
import importlib.util
from pathlib import Path
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

spec = importlib.util.spec_from_file_location('vercel_india_test', Path(__file__).resolve().parents[2] / 'api/india.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

@module.app.get('/api/india/_wiring_probe')
async def probe(request: Request):
    return {'path':request.url.path,'state_id':request.query_params.get('state_id')}

@module.app.get('/api/india/_database_failure')
async def failure():
    raise SQLAlchemyError('sensitive connection information must not be exposed')

@module.app.get('/api/india/_connection_failure')
async def connection_failure():
    raise ConnectionRefusedError('sensitive server connection information')

client = TestClient(module.app)

def test_vercel_rewrite_preserves_route_and_query():
    response = client.get('/api/india?_india_path=_wiring_probe&state_id=ap')
    assert response.status_code == 200
    assert response.json() == {'path':'/api/india/_wiring_probe','state_id':'ap'}
    assert client.get('/api/india/_wiring_probe?state_id=ka').json()['state_id'] == 'ka'

def test_serverless_function_exposes_no_admin_or_write_routes():
    assert client.post('/api/india/states/ap').status_code == 405
    assert client.get('/api/admin/jobs').status_code == 404
    assert client.post('/api/ingest').status_code == 404
    assert client.get('/docs').status_code == 404

def test_serverless_errors_are_explicit_and_do_not_leak_database_details():
    response=client.get('/api/india?_india_path=_database_failure')
    assert response.status_code==503
    assert 'database service unavailable' in response.json()['detail']
    assert 'sensitive' not in response.text
    assert client.get('/api/india?_india_path=../admin').status_code==400

def test_unconfigured_vercel_database_fails_explicitly_before_the_route(monkeypatch):
    monkeypatch.setenv('VERCEL','1')
    monkeypatch.delenv('DATABASE_URL',raising=False)
    response=client.get('/api/india?_india_path=_wiring_probe')
    assert response.status_code==503
    assert response.json()=={'detail':'India API server database is not configured'}

def test_connection_failure_is_an_explicit_sanitized_service_error():
    response=client.get('/api/india/_connection_failure')
    assert response.status_code==503
    assert 'database service unavailable' in response.json()['detail']
    assert 'sensitive' not in response.text
