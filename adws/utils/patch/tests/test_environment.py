"""Tests for patch environment module."""

import pytest
from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.patch.environment import validate_patch_environment
from utils.patch.types import PatchEnvContext


class TestValidatePatchEnvironment:
    """Tests for validate_patch_environment function."""

    @patch('utils.patch.environment.get_repo_url')
    @patch('utils.patch.environment.extract_repo_path')
    def test_validate_environment_success(self, mock_extract, mock_get_repo, mock_logger):
        """Test successful environment validation."""
        mock_get_repo.return_value = "https://github.com/user/repo"
        mock_extract.return_value = "user/repo"

        result = validate_patch_environment(mock_logger)

        assert isinstance(result, PatchEnvContext)
        assert result.github_repo_url == "https://github.com/user/repo"
        assert result.is_valid is True

    @patch('utils.patch.environment.get_repo_url')
    def test_validate_environment_repo_url_error_exits(self, mock_get_repo, mock_logger):
        """Test that error getting repo URL causes exit."""
        mock_get_repo.side_effect = ValueError("No remote URL found")

        with pytest.raises(SystemExit) as exc_info:
            validate_patch_environment(mock_logger)

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()

    @patch('utils.patch.environment.get_repo_url')
    @patch('utils.patch.environment.extract_repo_path')
    def test_validate_environment_logs_repo_url(self, mock_extract, mock_get_repo, mock_logger):
        """Test that repo URL is logged."""
        mock_get_repo.return_value = "https://github.com/org/project"
        mock_extract.return_value = "org/project"

        validate_patch_environment(mock_logger)

        mock_logger.debug.assert_called_with("Repository URL: https://github.com/org/project")
