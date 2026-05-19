from app.services.mask import is_masked_api_key, mask_api_key


def test_mask_api_key_long():
    masked = mask_api_key("sk-abcdefghijklmnopqrstuvwxyz")
    assert masked.startswith("sk-a")
    assert masked.endswith("wxyz")
    assert "•" in masked


def test_is_masked_api_key():
    assert is_masked_api_key(mask_api_key("sk-1234567890abcdef"))
    assert not is_masked_api_key("sk-real-secret-key-value")
