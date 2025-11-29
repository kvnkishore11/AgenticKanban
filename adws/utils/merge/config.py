"""Merge workflow configuration file restoration utilities."""

import json
import subprocess
import os
import logging
from typing import List

from .types import MergeConfigContext


def restore_config_files(repo_root: str, logger: logging.Logger) -> MergeConfigContext:
    """Restore config files that may have been modified in worktree.

    This fixes the issue where worktrees modify .mcp.json and playwright-mcp-config.json
    to point to worktree-specific paths, which breaks the main repository after merge.

    Args:
        repo_root: Repository root directory
        logger: Logger instance

    Returns:
        MergeConfigContext with restoration results
    """
    logger.info("Restoring configuration files to main repository paths...")

    config_files_fixed: List[str] = []

    # Fix .mcp.json
    mcp_config_path = os.path.join(repo_root, ".mcp.json")
    if os.path.exists(mcp_config_path):
        try:
            with open(mcp_config_path, 'r') as f:
                mcp_config = json.load(f)

            # Check if playwright config path contains 'trees/'
            if 'mcpServers' in mcp_config and 'playwright' in mcp_config['mcpServers']:
                args = mcp_config['mcpServers']['playwright'].get('args', [])
                for i, arg in enumerate(args):
                    if isinstance(arg, str) and 'trees/' in arg and 'playwright-mcp-config.json' in arg:
                        # Fix the path to point to main repo
                        correct_path = os.path.join(repo_root, "playwright-mcp-config.json")
                        args[i] = correct_path
                        config_files_fixed.append('.mcp.json')
                        logger.info(f"  Fixed .mcp.json playwright config path: {correct_path}")

                        # Write back the fixed config
                        with open(mcp_config_path, 'w') as f:
                            json.dump(mcp_config, f, indent=2)
                        break
        except Exception as e:
            logger.warning(f"Error fixing .mcp.json: {e}")

    # Fix playwright-mcp-config.json
    playwright_config_path = os.path.join(repo_root, "playwright-mcp-config.json")
    if os.path.exists(playwright_config_path):
        try:
            with open(playwright_config_path, 'r') as f:
                playwright_config = json.load(f)

            # Check if videos directory contains 'trees/'
            if 'browser' in playwright_config:
                context_options = playwright_config['browser'].get('contextOptions', {})
                record_video = context_options.get('recordVideo', {})
                video_dir = record_video.get('dir', '')

                if 'trees/' in video_dir:
                    # Fix the path to point to main repo
                    correct_path = os.path.join(repo_root, "videos")
                    playwright_config['browser']['contextOptions']['recordVideo']['dir'] = correct_path
                    config_files_fixed.append('playwright-mcp-config.json')
                    logger.info(f"  Fixed playwright-mcp-config.json videos directory: {correct_path}")

                    # Write back the fixed config
                    with open(playwright_config_path, 'w') as f:
                        json.dump(playwright_config, f, indent=2)
        except Exception as e:
            logger.warning(f"Error fixing playwright-mcp-config.json: {e}")

    # Stage and commit the fixed files if any were modified
    if config_files_fixed:
        logger.info(f"✅ Restored {len(config_files_fixed)} config file(s): {', '.join(config_files_fixed)}")
        _stage_and_amend_config_changes(repo_root, logger)
    else:
        logger.info("✅ No config files needed fixing")

    return MergeConfigContext(
        files_fixed=config_files_fixed,
        success=True,
        error=None
    )


def _stage_and_amend_config_changes(repo_root: str, logger: logging.Logger) -> None:
    """Stage config file changes and amend the merge commit.

    Args:
        repo_root: Repository root directory
        logger: Logger instance
    """
    # Stage the changes
    for file in ['.mcp.json', 'playwright-mcp-config.json']:
        file_path = os.path.join(repo_root, file)
        if os.path.exists(file_path):
            result = subprocess.run(
                ["git", "add", file],
                capture_output=True,
                text=True,
                cwd=repo_root
            )
            if result.returncode != 0:
                logger.warning(f"Failed to stage {file}: {result.stderr}")

    # Check if we need to amend the last commit or create a new one
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True,
        cwd=repo_root
    )

    if result.stdout.strip():  # There are staged changes
        # Amend the last commit to include config fixes
        result = subprocess.run(
            ["git", "commit", "--amend", "--no-edit"],
            capture_output=True,
            text=True,
            cwd=repo_root
        )
        if result.returncode == 0:
            logger.info("  Amended merge commit with config fixes")
        else:
            logger.warning(f"Failed to amend commit: {result.stderr}")
