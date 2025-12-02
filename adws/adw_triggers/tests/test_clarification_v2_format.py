"""Tests for clarification format in websocket models and API responses."""

import sys
import os
import pytest

# Add parent directories to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_triggers.websocket_models import ClarificationResult


class TestClarificationResult:
    """Tests for ClarificationResult model."""

    def test_high_confidence_result(self):
        """Test ClarificationResult with high confidence."""
        result = ClarificationResult(
            understanding="Got it! You want me to add drag-and-drop functionality to reorder tasks within columns.",
            confidence="high",
            questions=[],
            status="awaiting_approval"
        )

        assert result.understanding == "Got it! You want me to add drag-and-drop functionality to reorder tasks within columns."
        assert result.confidence == "high"
        assert result.questions == []
        assert result.status == "awaiting_approval"

    def test_medium_confidence_with_questions(self):
        """Test ClarificationResult with medium confidence and clarifying questions."""
        result = ClarificationResult(
            understanding="I understand you want to improve performance, but I need more context.",
            confidence="medium",
            questions=["Is the slowness in the UI or the API?", "When did this start?"],
            status="awaiting_approval"
        )

        assert result.understanding == "I understand you want to improve performance, but I need more context."
        assert result.confidence == "medium"
        assert len(result.questions) == 2
        assert "Is the slowness in the UI or the API?" in result.questions

    def test_low_confidence_result(self):
        """Test ClarificationResult with low confidence requiring clarification."""
        result = ClarificationResult(
            understanding="I see you have a request, but I need more details to understand what you want.",
            confidence="low",
            questions=["What specific feature are you referring to?", "Can you provide an example?"],
            status="awaiting_approval"
        )

        assert result.confidence == "low"
        assert len(result.questions) == 2

    def test_serialization_to_dict(self):
        """Test that ClarificationResult serializes correctly to dict/JSON."""
        result = ClarificationResult(
            understanding="Got it! You want dark mode.",
            confidence="high",
            questions=[],
            status="awaiting_approval"
        )

        result_dict = result.model_dump()

        assert result_dict["understanding"] == "Got it! You want dark mode."
        assert result_dict["confidence"] == "high"
        assert result_dict["questions"] == []
        assert result_dict["status"] == "awaiting_approval"


class TestClarificationResultValidation:
    """Tests for ClarificationResult validation."""

    def test_confidence_accepts_valid_values(self):
        """Test that confidence field accepts valid values."""
        for confidence in ["high", "medium", "low"]:
            result = ClarificationResult(
                understanding="Test understanding",
                confidence=confidence,
                questions=[],
                status="awaiting_approval"
            )
            assert result.confidence == confidence

    def test_status_defaults_to_awaiting_approval(self):
        """Test that status defaults to awaiting_approval."""
        result = ClarificationResult(
            understanding="Test",
            confidence="high"
        )
        assert result.status == "awaiting_approval"

    def test_questions_defaults_to_empty_list(self):
        """Test that questions defaults to empty list."""
        result = ClarificationResult(
            understanding="Test",
            confidence="high"
        )
        assert result.questions == []

    def test_required_fields(self):
        """Test that understanding and confidence are required."""
        # Both fields should be required - this should raise validation error
        with pytest.raises(Exception):
            ClarificationResult()
