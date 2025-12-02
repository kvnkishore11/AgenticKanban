"""
Task Clarification API endpoint.

Analyzes task descriptions and returns structured understanding.
"""
import os
import sys
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


class ClarificationRequest(BaseModel):
    """Request model for clarification endpoint."""
    task_id: int
    description: str
    adw_id: str
    feedback: Optional[str] = None


class ClarificationResult(BaseModel):
    """Response model for clarification endpoint."""
    objective: str
    requirements: List[str]
    assumptions: List[str]
    questions: List[str]
    status: str = "pending"


def get_adws_directory() -> Path:
    """Get the path to the adws directory."""
    current_file = Path(__file__).resolve()
    current_root = current_file.parent.parent.parent

    path_parts = current_root.parts
    if 'trees' in path_parts:
        trees_index = path_parts.index('trees')
        main_project_root = Path(*path_parts[:trees_index])
        adws_dir = main_project_root / "adws"
    else:
        adws_dir = current_root / "adws"

    return adws_dir


@router.post("/clarify", response_model=ClarificationResult)
async def clarify_task(request: ClarificationRequest):
    """
    Analyze a task description and return structured understanding.

    This endpoint uses the clarification analyzer to extract:
    - Objective: What is being requested
    - Requirements: Specific actionable requirements
    - Assumptions: Assumptions being made
    - Questions: Clarifications needed
    """
    logger.info(f"Clarification request for task {request.task_id}, ADW: {request.adw_id}")

    try:
        # Try to import and use the clarification analyzer
        adws_dir = get_adws_directory()
        sys.path.insert(0, str(adws_dir))

        try:
            from utils.clarify.clarification_analyzer import analyze_task_description

            result = analyze_task_description(
                request.description,
                request.feedback
            )

            return ClarificationResult(
                objective=result.objective,
                requirements=result.requirements,
                assumptions=result.assumptions,
                questions=result.questions,
                status="awaiting_approval"
            )
        except ImportError as e:
            logger.warning(f"Could not import clarification analyzer: {e}")
            # Fallback to simple extraction
            return generate_simple_clarification(request.description, request.feedback)
        finally:
            # Clean up sys.path
            if str(adws_dir) in sys.path:
                sys.path.remove(str(adws_dir))

    except Exception as e:
        logger.error(f"Clarification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def generate_simple_clarification(description: str, feedback: Optional[str] = None) -> ClarificationResult:
    """
    Generate a simple clarification without AI.
    Used as fallback when the analyzer is not available.
    """
    # Simple extraction based on description
    lines = description.strip().split('\n')

    # First line or sentence as objective
    objective = lines[0] if lines else description[:100]
    if len(objective) > 150:
        objective = objective[:147] + "..."

    # Extract bullet points as requirements
    requirements = []
    for line in lines:
        line = line.strip()
        if line.startswith(('-', '*', '•', '1.', '2.', '3.')):
            requirements.append(line.lstrip('-*•0123456789. '))

    if not requirements:
        requirements = ["Implement the requested functionality as described"]

    # Default assumptions
    assumptions = [
        "The implementation should follow existing code patterns",
        "Tests should be written for new functionality",
        "Changes should be backward compatible"
    ]

    # Default questions
    questions = [
        "Are there any specific edge cases to consider?",
        "Should this integrate with existing features?",
        "What is the expected timeline for this task?"
    ]

    # Include feedback context if provided
    if feedback:
        objective = f"{objective} (Additional context: {feedback[:100]})"

    return ClarificationResult(
        objective=objective,
        requirements=requirements,
        assumptions=assumptions,
        questions=questions,
        status="awaiting_approval"
    )
