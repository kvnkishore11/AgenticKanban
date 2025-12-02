"""Analyzes task descriptions and generates structured clarification results using Claude Code CLI."""

import json
import re
from datetime import datetime
from typing import Optional
from adw_modules.data_types import (
    ClarificationResult,
    ClarificationStatus,
    ClarificationConfidence,
    AgentTemplateRequest,
)
from adw_modules.agent import execute_template


def analyze_task_description(
    description: str,
    user_feedback: Optional[str] = None,
    adw_id: Optional[str] = None,
    working_dir: Optional[str] = None,
    previous_understanding: Optional[str] = None,
    previous_questions: Optional[list] = None,
) -> ClarificationResult:
    """
    Analyze a task description and extract conversational understanding using Claude Code CLI.

    This function uses either:
    - /clarify: For initial analysis (reads PROJECT_CONTEXT.md, slower)
    - /clarify-refine: For refining based on feedback (fast, no file reads)

    Args:
        description: The task description to analyze
        user_feedback: Optional feedback from previous clarification attempt
        adw_id: Optional ADW ID for tracking (defaults to 'clarify')
        working_dir: Optional working directory for Claude Code execution
        previous_understanding: Previous understanding to refine (enables fast refinement)
        previous_questions: Previous questions asked (for refinement context)

    Returns:
        ClarificationResult with understanding, confidence, and questions

    Raises:
        ValueError: If description is empty or invalid
    """
    if not description or not description.strip():
        raise ValueError("Task description cannot be empty")

    # Use provided adw_id or default
    effective_adw_id = adw_id or "clarify"

    # Determine which command to use based on whether we have previous understanding
    if previous_understanding and user_feedback:
        # FAST PATH: Use /clarify-refine for quick refinement (no file reads)
        slash_command = "/clarify-refine"
        args = [
            json.dumps(previous_understanding),
            json.dumps(previous_questions or []),
            json.dumps(user_feedback),
        ]
    else:
        # INITIAL PATH: Use /clarify for first-time analysis
        slash_command = "/clarify"
        args = [json.dumps(description)]
        if user_feedback:
            args.append(json.dumps(user_feedback))
        else:
            args.append("")  # Empty feedback

    # Create the template request
    request = AgentTemplateRequest(
        agent_name="clarifier",
        slash_command=slash_command,
        args=args,
        adw_id=effective_adw_id,
        working_dir=working_dir,
    )

    try:
        # Execute via Claude Code CLI
        response = execute_template(request)

        if not response.success:
            # Claude Code execution failed
            return ClarificationResult(
                understanding=f"Error analyzing task: {response.output}",
                confidence=ClarificationConfidence.LOW,
                questions=["Please retry the clarification request."],
                status=ClarificationStatus.NEEDS_REVISION,
                timestamp=datetime.now(),
            )

        # Parse the JSON response from Claude Code output
        result_data = _parse_clarification_response(response.output)

        # Parse confidence
        confidence_str = result_data.get("confidence", "medium")
        try:
            confidence = ClarificationConfidence(confidence_str.lower())
        except ValueError:
            confidence = ClarificationConfidence.MEDIUM

        return ClarificationResult(
            understanding=result_data.get("understanding", ""),
            confidence=confidence,
            questions=result_data.get("questions", []),
            status=ClarificationStatus.PENDING,
            timestamp=datetime.now(),
        )

    except json.JSONDecodeError as e:
        # If JSON parsing fails, create a fallback result
        return ClarificationResult(
            understanding="Unable to parse AI response. Please try again.",
            confidence=ClarificationConfidence.LOW,
            questions=[f"JSON parsing error: {str(e)}"],
            status=ClarificationStatus.NEEDS_REVISION,
            timestamp=datetime.now(),
        )
    except Exception as e:
        # Handle other errors
        return ClarificationResult(
            understanding=f"Error analyzing task: {str(e)}",
            confidence=ClarificationConfidence.LOW,
            questions=["Please retry the clarification request."],
            status=ClarificationStatus.NEEDS_REVISION,
            timestamp=datetime.now(),
        )


def _parse_clarification_response(output: str) -> dict:
    """
    Parse the clarification response from Claude Code output.

    The output may contain the JSON directly or wrapped in markdown code blocks.

    Args:
        output: Raw output from Claude Code

    Returns:
        Parsed dictionary with clarification data

    Raises:
        json.JSONDecodeError: If no valid JSON found
    """
    # Try to parse as direct JSON first
    try:
        return json.loads(output.strip())
    except json.JSONDecodeError:
        pass

    # Try to extract JSON from markdown code blocks
    json_patterns = [
        r"```json\s*([\s\S]*?)\s*```",  # ```json ... ```
        r"```\s*([\s\S]*?)\s*```",  # ``` ... ```
        r"\{[\s\S]*\}",  # Raw JSON object
    ]

    for pattern in json_patterns:
        matches = re.findall(pattern, output)
        for match in matches:
            try:
                # Clean up the match
                json_str = match.strip()
                if not json_str.startswith("{"):
                    continue
                return json.loads(json_str)
            except json.JSONDecodeError:
                continue

    # If all parsing attempts fail, raise an error
    raise json.JSONDecodeError("No valid JSON found in output", output, 0)
