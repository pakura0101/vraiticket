"""Tests for core security utilities: password hashing and JWT."""
import pytest
from jose import JWTError

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token


class TestPasswordHashing:
    def test_hash_differs_from_plain(self):
        hashed = hash_password("mysecret")
        assert hashed != "mysecret"

    def test_verify_correct_password(self):
        hashed = hash_password("correct-horse-battery")
        assert verify_password("correct-horse-battery", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt produces different salts each time."""
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2

    def test_empty_password_hashes(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True


class TestJWT:
    def test_create_and_decode_token(self):
        token = create_access_token(subject=42, extra_claims={"role": "admin"})
        payload = decode_access_token(token)
        assert payload["sub"] == "42"
        assert payload["role"] == "admin"

    def test_token_has_expiry(self):
        token = create_access_token(subject=1)
        payload = decode_access_token(token)
        assert "exp" in payload

    def test_tampered_token_raises(self):
        token = create_access_token(subject=1)
        bad_token = token + "tampered"
        with pytest.raises(JWTError):
            decode_access_token(bad_token)

    def test_token_subject_is_string(self):
        token = create_access_token(subject=99)
        payload = decode_access_token(token)
        assert isinstance(payload["sub"], str)
        assert payload["sub"] == "99"

    def test_extra_claims_are_included(self):
        token = create_access_token(subject=1, extra_claims={"email": "a@b.com", "foo": "bar"})
        payload = decode_access_token(token)
        assert payload["email"] == "a@b.com"
        assert payload["foo"] == "bar"
