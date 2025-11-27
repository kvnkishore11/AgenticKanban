"""Screenshot upload utilities for review workflow."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import logging
from adw_modules.data_types import ReviewResult
from adw_modules.r2_uploader import R2Uploader


def upload_review_screenshots(
    review_result: ReviewResult,
    adw_id: str,
    worktree_path: str,
    logger: logging.Logger
) -> None:
    """Upload screenshots to R2 and update review result with URLs.

    Args:
        review_result: Review result containing screenshot paths
        adw_id: ADW workflow ID
        worktree_path: Path to the worktree
        logger: Logger instance

    Note:
        This modifies review_result in-place by setting screenshot_urls
        and updating issue.screenshot_url fields.
    """
    if not review_result.screenshots:
        return

    logger.info(f"Uploading {len(review_result.screenshots)} screenshots")
    uploader = R2Uploader(logger)

    screenshot_urls = []
    for local_path in review_result.screenshots:
        # Convert relative path to absolute path within worktree
        abs_path = os.path.join(worktree_path, local_path)

        if not os.path.exists(abs_path):
            logger.warning(f"Screenshot not found: {abs_path}")
            continue

        # Upload with a nice path
        remote_path = f"adw/{adw_id}/review/{os.path.basename(local_path)}"
        url = uploader.upload_file(abs_path, remote_path)

        if url:
            screenshot_urls.append(url)
            logger.info(f"Uploaded screenshot to: {url}")
        else:
            logger.error(f"Failed to upload screenshot: {local_path}")
            # Fallback to local path if upload fails
            screenshot_urls.append(local_path)

    # Update review result with URLs
    review_result.screenshot_urls = screenshot_urls

    # Update issues with their screenshot URLs
    for issue in review_result.review_issues:
        if issue.screenshot_path:
            # Find corresponding URL
            for i, local_path in enumerate(review_result.screenshots):
                if local_path == issue.screenshot_path and i < len(screenshot_urls):
                    issue.screenshot_url = screenshot_urls[i]
                    break
