from app.services.job_persist_service import _should_preserve_existing_publication


def test_preserve_existing_publication_only_for_frozen_recruitment_drafts():
    assert _should_preserve_existing_publication(
        auto_publish_verified=False,
        incoming_status="draft",
        incoming_document_type="RECRUITMENT",
        incoming_published_to_site=False,
    )

    assert not _should_preserve_existing_publication(
        auto_publish_verified=True,
        incoming_status="draft",
        incoming_document_type="RECRUITMENT",
        incoming_published_to_site=False,
    )
    assert not _should_preserve_existing_publication(
        auto_publish_verified=False,
        incoming_status="expired",
        incoming_document_type="RECRUITMENT",
        incoming_published_to_site=False,
    )
    assert not _should_preserve_existing_publication(
        auto_publish_verified=False,
        incoming_status="draft",
        incoming_document_type="TENDER",
        incoming_published_to_site=False,
    )
