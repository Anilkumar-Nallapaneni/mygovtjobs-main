"""Alert subscription service."""

from app.schemas.alert import AlertSubscribeRequest, AlertUnsubscribeRequest


def test_subscribe_request_accepts_user_id():
    body = AlertSubscribeRequest(
        channel="email",
        channel_address="user@example.com",
        state_codes=["up"],
        user_id="00000000-0000-0000-0000-000000000001",
    )
    assert body.user_id is not None
    assert body.state_codes == ["up"]


def test_unsubscribe_request_accepts_id_or_channel():
    by_id = AlertUnsubscribeRequest(id="00000000-0000-0000-0000-000000000001")
    by_channel = AlertUnsubscribeRequest(channel="email", channel_address="user@example.com")
    assert by_id.id is not None
    assert by_channel.channel == "email"


def test_telegram_rejects_username():
    import pytest

    with pytest.raises(ValueError, match="numeric"):
        AlertSubscribeRequest(channel="telegram", channel_address="@myuser")
