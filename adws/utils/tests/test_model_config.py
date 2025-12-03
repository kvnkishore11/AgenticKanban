"""
Unit tests for model configuration utilities.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.model_config import (
    get_default_model_for_stage,
    validate_model_choice,
    get_model_display_info,
    normalize_model_name,
    MODEL_METADATA,
)


class TestGetDefaultModelForStage:
    """Test get_default_model_for_stage function."""

    def test_plan_stage_defaults_to_opus(self):
        """Plan stage should default to opus."""
        assert get_default_model_for_stage("plan") == "opus"

    def test_build_stage_defaults_to_opus(self):
        """Build stage should default to opus."""
        assert get_default_model_for_stage("build") == "opus"

    def test_test_stage_defaults_to_sonnet(self):
        """Test stage should default to sonnet."""
        assert get_default_model_for_stage("test") == "sonnet"

    def test_review_stage_defaults_to_sonnet(self):
        """Review stage should default to sonnet."""
        assert get_default_model_for_stage("review") == "sonnet"

    def test_document_stage_defaults_to_sonnet(self):
        """Document stage should default to sonnet."""
        assert get_default_model_for_stage("document") == "sonnet"

    def test_merge_stage_defaults_to_haiku(self):
        """Merge stage should default to haiku."""
        assert get_default_model_for_stage("merge") == "haiku"

    def test_unknown_stage_defaults_to_sonnet(self):
        """Unknown stage should default to sonnet."""
        assert get_default_model_for_stage("unknown_stage") == "sonnet"
        assert get_default_model_for_stage("custom") == "sonnet"

    def test_case_insensitive(self):
        """Stage name matching should be case-insensitive."""
        assert get_default_model_for_stage("PLAN") == "opus"
        assert get_default_model_for_stage("Plan") == "opus"
        assert get_default_model_for_stage("BUILD") == "opus"
        assert get_default_model_for_stage("MERGE") == "haiku"


class TestValidateModelChoice:
    """Test validate_model_choice function."""

    def test_sonnet_is_valid(self):
        """Sonnet should be a valid model choice."""
        assert validate_model_choice("sonnet") is True

    def test_haiku_is_valid(self):
        """Haiku should be a valid model choice."""
        assert validate_model_choice("haiku") is True

    def test_opus_is_valid(self):
        """Opus should be a valid model choice."""
        assert validate_model_choice("opus") is True

    def test_invalid_model_is_rejected(self):
        """Invalid model names should be rejected."""
        assert validate_model_choice("invalid") is False
        assert validate_model_choice("gpt4") is False
        assert validate_model_choice("") is False

    def test_case_sensitive(self):
        """Model validation should be case-sensitive."""
        assert validate_model_choice("SONNET") is False
        assert validate_model_choice("Opus") is False
        assert validate_model_choice("Haiku") is False


class TestGetModelDisplayInfo:
    """Test get_model_display_info function."""

    def test_sonnet_metadata(self):
        """Sonnet metadata should be complete."""
        info = get_model_display_info("sonnet")
        assert info["label"] == "Sonnet"
        assert info["cost_tier"] == "medium"
        assert info["performance_tier"] == "balanced"
        assert "description" in info

    def test_haiku_metadata(self):
        """Haiku metadata should be complete."""
        info = get_model_display_info("haiku")
        assert info["label"] == "Haiku"
        assert info["cost_tier"] == "low"
        assert info["performance_tier"] == "fast"
        assert "description" in info

    def test_opus_metadata(self):
        """Opus metadata should be complete."""
        info = get_model_display_info("opus")
        assert info["label"] == "Opus"
        assert info["cost_tier"] == "high"
        assert info["performance_tier"] == "powerful"
        assert "description" in info

    def test_all_models_have_metadata(self):
        """All valid models should have complete metadata."""
        for model in ["sonnet", "haiku", "opus"]:
            info = get_model_display_info(model)  # type: ignore
            assert "label" in info
            assert "cost_tier" in info
            assert "performance_tier" in info
            assert "description" in info


class TestNormalizeModelName:
    """Test normalize_model_name function."""

    def test_lowercase_models_pass_through(self):
        """Lowercase model names should pass through unchanged."""
        assert normalize_model_name("sonnet") == "sonnet"
        assert normalize_model_name("haiku") == "haiku"
        assert normalize_model_name("opus") == "opus"

    def test_uppercase_models_normalized(self):
        """Uppercase model names should be normalized to lowercase."""
        assert normalize_model_name("SONNET") == "sonnet"
        assert normalize_model_name("HAIKU") == "haiku"
        assert normalize_model_name("OPUS") == "opus"

    def test_mixed_case_normalized(self):
        """Mixed case model names should be normalized to lowercase."""
        assert normalize_model_name("Sonnet") == "sonnet"
        assert normalize_model_name("Haiku") == "haiku"
        assert normalize_model_name("Opus") == "opus"

    def test_invalid_models_fallback_to_sonnet(self):
        """Invalid model names should fallback to sonnet."""
        assert normalize_model_name("invalid") == "sonnet"
        assert normalize_model_name("gpt4") == "sonnet"
        assert normalize_model_name("") == "sonnet"


class TestModelMetadata:
    """Test MODEL_METADATA constant."""

    def test_all_models_in_metadata(self):
        """All valid models should be in MODEL_METADATA."""
        assert "sonnet" in MODEL_METADATA
        assert "haiku" in MODEL_METADATA
        assert "opus" in MODEL_METADATA

    def test_metadata_structure(self):
        """MODEL_METADATA should have correct structure."""
        for model, info in MODEL_METADATA.items():
            assert isinstance(info, dict)
            assert "label" in info
            assert "cost_tier" in info
            assert "performance_tier" in info
            assert "description" in info
