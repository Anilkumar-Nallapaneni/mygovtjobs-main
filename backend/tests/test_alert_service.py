"""Alert subscription service."""

from app.schemas.alert import AlertSubscribeRequest, AlertUnsubscribeRequest


def test_subscribe_request_does_not_accept_user_id():
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        AlertSubscribeRequest(
            channel="email",
            channel_address="user@example.com",
            state_codes=["up"],
            user_id="00000000-0000-0000-0000-000000000001",
        )


def test_subscribe_request_accepts_filters():
    body = AlertSubscribeRequest(
        channel="email",
        channel_address="user@example.com",
        state_codes=["up"],
    )
    assert body.state_codes == ["up"]


def test_unsubscribe_request_requires_id():
    import pytest
    from pydantic import ValidationError

    by_id = AlertUnsubscribeRequest(id="00000000-0000-0000-0000-000000000001")
    assert by_id.id is not None
    with pytest.raises(ValidationError):
        AlertUnsubscribeRequest(channel="email", channel_address="user@example.com")


def test_telegram_rejects_username():
    import pytest

    with pytest.raises(ValueError, match="numeric"):
        AlertSubscribeRequest(channel="telegram", channel_address="@myuser")
