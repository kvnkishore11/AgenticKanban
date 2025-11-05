"""
Tests for Summarization Service module

Tests AI summary generation, caching, and fallback behavior.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from server.modules.summarization_service import SummarizationService


class TestSummarizationServiceInit:
    """Initialization tests"""

    def test_fallback_mode_when_no_sdk(self):
        """Test initialization falls back when no SDK available"""
        with patch.dict('os.environ', {}, clear=True):
            service = SummarizationService()

            assert service._provider == 'fallback'
            assert service.model == 'fallback'
            assert service._client is None

    @patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('server.modules.summarization_service.Anthropic')
    def test_initialization_with_anthropic(self, mock_anthropic):
        """Test initialization with Anthropic SDK"""
        mock_client = Mock()
        mock_anthropic.return_value = mock_client

        service = SummarizationService()

        assert service._provider == 'anthropic'
        assert service.model == 'claude-3-haiku-20240307'
        assert service._client == mock_client

    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    @patch('server.modules.summarization_service.OpenAI')
    def test_initialization_with_openai(self, mock_openai):
        """Test initialization with OpenAI SDK"""
        with patch('server.modules.summarization_service.Anthropic', side_effect=ImportError):
            mock_client = Mock()
            mock_openai.return_value = mock_client

            service = SummarizationService()

            assert service._provider == 'openai'
            assert service.model == 'gpt-3.5-turbo'
            assert service._client == mock_client

    @patch.dict('os.environ', {'SUMMARIZATION_MODEL': 'custom-model'})
    @patch('server.modules.summarization_service.Anthropic')
    def test_custom_model_from_env(self, mock_anthropic):
        """Test using custom model from environment variable"""
        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
            mock_anthropic.return_value = Mock()

            service = SummarizationService()

            assert service.model == 'custom-model'


class TestFileChangeSummarization:
    """File change summarization tests"""

    def test_fallback_file_summary(self):
        """Test fallback file summary generation"""
        service = SummarizationService()  # Will use fallback

        summary = service.summarize_file_change(
            file_path="/path/to/test.py",
            diff="some diff",
            operation="modified"
        )

        assert "test.py" in summary.lower()
        assert "modified" in summary.lower()

    def test_file_summary_caching(self):
        """Test that file summaries are cached"""
        service = SummarizationService()

        summary1 = service.summarize_file_change(
            file_path="/path/to/test.py",
            diff="some diff",
            operation="modified"
        )

        summary2 = service.summarize_file_change(
            file_path="/path/to/test.py",
            diff="some diff",
            operation="modified"
        )

        # Should be identical (from cache)
        assert summary1 == summary2
        assert service.get_cache_size() > 0

    def test_different_diffs_not_cached(self):
        """Test that different diffs generate new summaries"""
        service = SummarizationService()

        summary1 = service.summarize_file_change(
            file_path="/path/to/test.py",
            diff="diff1",
            operation="modified"
        )

        summary2 = service.summarize_file_change(
            file_path="/path/to/test.py",
            diff="diff2",
            operation="modified"
        )

        # Should generate new summary for different diff
        # (In fallback mode, both will be same, but cache keys are different)
        assert service.get_cache_size() >= 2

    @patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('server.modules.summarization_service.Anthropic')
    def test_file_summary_with_anthropic(self, mock_anthropic):
        """Test file summary generation with Anthropic"""
        # Setup mock
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock(text="Refactored authentication logic")]
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        service = SummarizationService()

        summary = service.summarize_file_change(
            file_path="/path/to/auth.py",
            diff="some diff",
            operation="modified"
        )

        assert summary == "Refactored authentication logic"
        mock_client.messages.create.assert_called_once()

    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    @patch('server.modules.summarization_service.OpenAI')
    def test_file_summary_with_openai(self, mock_openai):
        """Test file summary generation with OpenAI"""
        with patch('server.modules.summarization_service.Anthropic', side_effect=ImportError):
            # Setup mock
            mock_client = Mock()
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content="Updated user model"))]
            mock_client.chat.completions.create.return_value = mock_response
            mock_openai.return_value = mock_client

            service = SummarizationService()

            summary = service.summarize_file_change(
                file_path="/path/to/user.py",
                diff="some diff",
                operation="modified"
            )

            assert summary == "Updated user model"
            mock_client.chat.completions.create.assert_called_once()


class TestToolUseSummarization:
    """Tool use summarization tests"""

    def test_fallback_tool_summary_read(self):
        """Test fallback tool summary for Read"""
        service = SummarizationService()

        summary = service.summarize_tool_use(
            tool_name="Read",
            input_data={"file_path": "/path/to/test.py"},
            output_data="file contents"
        )

        assert "test.py" in summary.lower()
        assert "read" in summary.lower()

    def test_fallback_tool_summary_write(self):
        """Test fallback tool summary for Write"""
        service = SummarizationService()

        summary = service.summarize_tool_use(
            tool_name="Write",
            input_data={"file_path": "/path/to/new.py"},
            output_data="success"
        )

        assert "new.py" in summary.lower()
        assert "created" in summary.lower()

    def test_fallback_tool_summary_edit(self):
        """Test fallback tool summary for Edit"""
        service = SummarizationService()

        summary = service.summarize_tool_use(
            tool_name="Edit",
            input_data={"file_path": "/path/to/existing.py"},
            output_data="success"
        )

        assert "existing.py" in summary.lower()
        assert "edited" in summary.lower()

    def test_tool_summary_caching(self):
        """Test that tool summaries are cached"""
        service = SummarizationService()

        input_data = {"file_path": "/path/to/test.py"}

        summary1 = service.summarize_tool_use(
            tool_name="Read",
            input_data=input_data,
            output_data="output"
        )

        summary2 = service.summarize_tool_use(
            tool_name="Read",
            input_data=input_data,
            output_data="output"
        )

        assert summary1 == summary2


class TestSessionSummarization:
    """Session summarization tests"""

    def test_fallback_session_summary(self):
        """Test fallback session summary"""
        service = SummarizationService()

        file_changes = {
            "read": ["/path/to/file1.py", "/path/to/file2.py"],
            "modified": ["/path/to/file1.py"]
        }
        tool_uses = ["Read", "Edit", "Write"]

        summary = service.summarize_session(
            file_changes=file_changes,
            tool_uses=tool_uses,
            duration_seconds=45
        )

        assert "modified" in summary.lower() or "file" in summary.lower()
        assert "45" in summary

    def test_session_summary_empty(self):
        """Test session summary with no changes"""
        service = SummarizationService()

        file_changes = {"read": [], "modified": []}
        tool_uses = []

        summary = service.summarize_session(
            file_changes=file_changes,
            tool_uses=tool_uses,
            duration_seconds=10
        )

        assert "10" in summary
        assert len(summary) > 0

    @patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('server.modules.summarization_service.Anthropic')
    def test_session_summary_with_anthropic(self, mock_anthropic):
        """Test session summary with Anthropic"""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock(text="Implemented authentication feature")]
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        service = SummarizationService()

        file_changes = {
            "read": ["/path/to/file1.py"],
            "modified": ["/path/to/file1.py"]
        }

        summary = service.summarize_session(
            file_changes=file_changes,
            tool_uses=["Read", "Edit"],
            duration_seconds=30
        )

        assert summary == "Implemented authentication feature"


class TestAsyncSummarization:
    """Async summarization tests"""

    @pytest.mark.asyncio
    async def test_async_summarize_file_change(self):
        """Test async file change summarization"""
        service = SummarizationService()

        # Mock WebSocket manager
        ws_manager = Mock()
        ws_manager.broadcast_summary_update = Mock(return_value=None)

        # Convert to async mock
        async def mock_broadcast(*args, **kwargs):
            pass

        ws_manager.broadcast_summary_update = mock_broadcast

        # This should not block or raise
        await service.async_summarize_file_change(
            file_path="/path/to/test.py",
            diff="some diff",
            operation="modified",
            adw_id="test123",
            ws_manager=ws_manager
        )

        # Give async task time to complete
        import asyncio
        await asyncio.sleep(0.1)


class TestCaching:
    """Caching tests"""

    def test_clear_cache(self):
        """Test clearing the cache"""
        service = SummarizationService()

        # Generate some summaries to populate cache
        service.summarize_file_change("/path/to/test.py", "diff", "modified")
        service.summarize_tool_use("Read", {"file_path": "/test.py"}, "output")

        assert service.get_cache_size() > 0

        # Clear cache
        service.clear_cache()

        assert service.get_cache_size() == 0

    def test_get_cache_size(self):
        """Test getting cache size"""
        service = SummarizationService()

        assert service.get_cache_size() == 0

        # Add summaries
        service.summarize_file_change("/path/to/test1.py", "diff1", "modified")
        assert service.get_cache_size() == 1

        service.summarize_file_change("/path/to/test2.py", "diff2", "modified")
        assert service.get_cache_size() == 2


class TestProviderMethods:
    """Provider-specific method tests"""

    def test_get_provider(self):
        """Test getting current provider"""
        service = SummarizationService()

        provider = service.get_provider()
        assert provider in ['anthropic', 'openai', 'fallback']

    @patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('server.modules.summarization_service.Anthropic')
    def test_anthropic_provider(self, mock_anthropic):
        """Test Anthropic provider identification"""
        mock_anthropic.return_value = Mock()

        service = SummarizationService()

        assert service.get_provider() == 'anthropic'

    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    @patch('server.modules.summarization_service.OpenAI')
    def test_openai_provider(self, mock_openai):
        """Test OpenAI provider identification"""
        with patch('server.modules.summarization_service.Anthropic', side_effect=ImportError):
            mock_openai.return_value = Mock()

            service = SummarizationService()

            assert service.get_provider() == 'openai'


class TestErrorHandling:
    """Error handling tests"""

    @patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('server.modules.summarization_service.Anthropic')
    def test_api_error_fallback(self, mock_anthropic):
        """Test that API errors fall back to generic summary"""
        mock_client = Mock()
        mock_client.messages.create.side_effect = Exception("API Error")
        mock_anthropic.return_value = mock_client

        service = SummarizationService()

        # Should not raise, should return fallback
        summary = service.summarize_file_change(
            file_path="/path/to/test.py",
            diff="diff",
            operation="modified"
        )

        assert "test.py" in summary.lower()
        assert "modified" in summary.lower()

    def test_long_diff_truncation(self):
        """Test that long diffs are truncated"""
        service = SummarizationService()

        # Create a very long diff
        long_diff = "+" * 5000

        # Should not crash
        summary = service.summarize_file_change(
            file_path="/path/to/test.py",
            diff=long_diff,
            operation="modified"
        )

        assert len(summary) > 0
