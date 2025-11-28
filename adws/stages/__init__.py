"""
Stages Package - Workflow stage implementations.

Each stage wraps an existing ADW script and implements the Stage interface.
"""

from stages.plan_stage import PlanStage
from stages.build_stage import BuildStage
from stages.test_stage import TestStage
from stages.review_stage import ReviewStage
from stages.document_stage import DocumentStage
from stages.merge_stage import MergeStage

__all__ = [
    "PlanStage",
    "BuildStage",
    "TestStage",
    "ReviewStage",
    "DocumentStage",
    "MergeStage",
]
