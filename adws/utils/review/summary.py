"""Review summary formatting utilities."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.data_types import ReviewResult


def build_review_summary(review_result: ReviewResult) -> str:
    """Build a formatted summary of the review results for GitHub comment.

    Args:
        review_result: The review result containing summary, issues, and screenshot URLs

    Returns:
        Formatted markdown string for GitHub comment
    """
    summary_parts = [f"## 📊 Review Summary\n\n{review_result.review_summary}"]

    # Add review issues grouped by severity
    if review_result.review_issues:
        summary_parts.append("\n## 🔍 Issues Found")

        # Group by severity
        blockers = [i for i in review_result.review_issues if i.issue_severity == "blocker"]
        tech_debts = [i for i in review_result.review_issues if i.issue_severity == "tech_debt"]
        skippables = [i for i in review_result.review_issues if i.issue_severity == "skippable"]

        if blockers:
            summary_parts.append(f"\n### 🚨 Blockers ({len(blockers)})")
            for issue in blockers:
                summary_parts.append(f"- **Issue {issue.review_issue_number}**: {issue.issue_description}")
                summary_parts.append(f"  - Resolution: {issue.issue_resolution}")
                if issue.screenshot_url and issue.screenshot_url.startswith("http"):
                    summary_parts.append(f"  - ![Issue Screenshot]({issue.screenshot_url})")

        if tech_debts:
            summary_parts.append(f"\n### ⚠️ Tech Debt ({len(tech_debts)})")
            for issue in tech_debts:
                summary_parts.append(f"- **Issue {issue.review_issue_number}**: {issue.issue_description}")
                summary_parts.append(f"  - Resolution: {issue.issue_resolution}")
                if issue.screenshot_url and issue.screenshot_url.startswith("http"):
                    summary_parts.append(f"  - ![Issue Screenshot]({issue.screenshot_url})")

        if skippables:
            summary_parts.append(f"\n### 💡 Skippable ({len(skippables)})")
            for issue in skippables:
                summary_parts.append(f"- **Issue {issue.review_issue_number}**: {issue.issue_description}")
                summary_parts.append(f"  - Resolution: {issue.issue_resolution}")
                if issue.screenshot_url and issue.screenshot_url.startswith("http"):
                    summary_parts.append(f"  - ![Issue Screenshot]({issue.screenshot_url})")

    # Add screenshots section
    if review_result.screenshot_urls:
        summary_parts.append("\n## 📸 Screenshots")
        summary_parts.append(f"Captured {len(review_result.screenshot_urls)} screenshots\n")

        # Use uploaded URLs to display as inline images
        for i, screenshot_url in enumerate(review_result.screenshot_urls):
            if screenshot_url.startswith("http"):
                # Display as inline image
                summary_parts.append(f"### Screenshot {i+1}")
                summary_parts.append(f"![Screenshot {i+1}]({screenshot_url})\n")
            else:
                # Fallback to showing path if not a URL
                summary_parts.append(f"- Screenshot {i+1}: `{screenshot_url}`")

    return "\n".join(summary_parts)
