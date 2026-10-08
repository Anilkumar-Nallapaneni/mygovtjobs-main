"""Controlled sandbox: real signatures and HTTP routes, mocked provider/database only."""
import asyncio
import hashlib
import hmac
import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.config import Settings
from app.middleware.supabase_auth import get_current_user_id
from app.routes import billing
from app.services.razorpay_service import RazorpayService

def service():
    return RazorpayService(Settings(_env_file=None,razorpay_key_id='sandbox-key',razorpay_key_secret='sandbox-secret',razorpay_webhook_secret='sandbox-webhook'))

def session(row):
    db=MagicMock()
    result=MagicMock();result.mappings.return_value.first.return_value=row
    db.execute=AsyncMock(return_value=result);db.commit=AsyncMock()
    return db

@pytest.mark.parametrize('owner,amount,currency', [('other',9900,'INR'),('owner',1,'INR'),('owner',9900,'USD')])
def test_order_owner_amount_currency_must_match(owner,amount,currency):
    db=session({'user_id':'owner','status':'created','amount_paise':9900,'currency':'INR','razorpay_payment_id':None})
    assert not asyncio.run(service().mark_order_paid(db,order_id='order_test',payment_id='pay_test',user_id=owner,amount_paise=amount,currency=currency))
    db.commit.assert_not_called()
    assert db.execute.await_count==1

def test_valid_capture_commits_once_and_paid_replay_does_not_commit():
    db=session({'user_id':'owner','status':'created','amount_paise':9900,'currency':'INR','razorpay_payment_id':None})
    args=dict(order_id='order_test',payment_id='pay_test',user_id='owner',amount_paise=9900,currency='INR')
    assert asyncio.run(service().mark_order_paid(db,**args))
    db.commit.assert_awaited_once()
    assert 'FOR UPDATE' in str(db.execute.call_args_list[0].args[0])
    db=session({'user_id':'owner','status':'paid','amount_paise':9900,'currency':'INR','razorpay_payment_id':'pay_test'})
    assert asyncio.run(service().mark_order_paid(db,**args))
    db.commit.assert_not_called()
    assert not asyncio.run(service().mark_order_paid(db,**{**args,'payment_id':'pay_other'}))

@pytest.fixture
def client(monkeypatch):
    svc=service();monkeypatch.setattr(billing,'service',svc)
    monkeypatch.setattr(billing,'get_settings',lambda:svc.settings)
    app=FastAPI();app.include_router(billing.router,prefix='/api/billing')
    return TestClient(app),app,svc

def test_billing_rejects_anonymous_and_invalid_signatures(client):
    http,app,svc=client
    body={'razorpay_order_id':'order_test','razorpay_payment_id':'pay_test','razorpay_signature':'bad-signature'}
    assert http.post('/api/billing/create-order').status_code==401
    assert http.post('/api/billing/verify',json=body).status_code==401
    app.dependency_overrides[get_current_user_id]=lambda:'owner'
    assert http.post('/api/billing/verify',json=body).status_code==400
    assert http.post('/api/billing/webhook',content=b'{}').status_code==400

def test_authorized_but_uncaptured_payment_cannot_upgrade(client,monkeypatch):
    http,app,svc=client;app.dependency_overrides[get_current_user_id]=lambda:'owner'
    signature=hmac.new(b'sandbox-secret',b'order_test|pay_test',hashlib.sha256).hexdigest()
    monkeypatch.setattr(svc,'fetch_captured_payment',AsyncMock(side_effect=ValueError('Not captured')))
    write=AsyncMock();monkeypatch.setattr(svc,'mark_order_paid',write)
    assert http.post('/api/billing/verify',json={'razorpay_order_id':'order_test','razorpay_payment_id':'pay_test','razorpay_signature':signature}).status_code==400
    write.assert_not_called()

def test_signed_malformed_webhook_returns_400(client):
    http,app,svc=client
    body=b'invalid JSON'
    signature=hmac.new(b'sandbox-webhook',body,hashlib.sha256).hexdigest()
    assert http.post('/api/billing/webhook',content=body,headers={'X-Razorpay-Signature':signature}).status_code==400

def test_verified_webhook_must_match_stored_order(client,monkeypatch):
    http,app,svc=client
    factory=MagicMock();factory.return_value.__aenter__=AsyncMock(return_value=MagicMock());factory.return_value.__aexit__=AsyncMock(return_value=False)
    monkeypatch.setattr(billing,'SessionLocal',factory)
    monkeypatch.setattr(svc,'mark_order_paid',AsyncMock(return_value=False))
    body=json.dumps({'event':'payment.captured','payload':{'payment':{'entity':{'id':'pay_test','order_id':'order_test','status':'captured','amount':1,'currency':'INR'}}}}).encode()
    signature=hmac.new(b'sandbox-webhook',body,hashlib.sha256).hexdigest()
    assert http.post('/api/billing/webhook',content=body,headers={'X-Razorpay-Signature':signature}).status_code==400
