"""
Model configuration utilities for per-stage model selection.

This module provides helper functions for managing AI model configuration,
defaults, and validation across the ADW workflow system.
"""

from typing import Dict, Literal

ModelType = Literal["sonnet", "haiku", "opus"]

# Default model mappings for different stage types
STAGE_MODEL_DEFAULTS: Dict[str, ModelType] = {
    "plan": "opus",
    "build": "opus",
    "test": "sonnet",
    "review": "sonnet",
    "document": "sonnet",
    "merge": "haiku",
}

# Model metadata for display and cost/performance considerations
MODEL_METADATA: Dict[ModelType, Dict[str, str]] = {
    "sonnet": {
        "label": "Sonnet",
        "cost_tier": "medium",
        "performance_tier": "balanced",
        "description": "Balanced performance and cost",
    },
    "haiku": {
        "label": "Haiku",
        "cost_tier": "low",
        "performance_tier": "fast",
        "description": "Fast and economical",
    },
    "opus": {
        "label": "Opus",
        "cost_tier": "high",
        "performance_tier": "powerful",
        "description": "Most capable model",
    },
}


def get_default_model_for_stage(stage_name: str) -> ModelType:
    """
    Get the default AI model for a given stage.

    Args:
        stage_name: Name of the stage (e.g., "plan", "build", "test")

    Returns:
        The default model type for the stage. Falls back to "sonnet" for unknown stages.

    Examples:
        >>> get_default_model_for_stage("plan")
        "opus"
        >>> get_default_model_for_stage("merge")
        "haiku"
        >>> get_default_model_for_stage("unknown_stage")
        "sonnet"
    """
    stage_name_lower = stage_name.lower()
    return STAGE_MODEL_DEFAULTS.get(stage_name_lower, "sonnet")


def validate_model_choice(model: str) -> bool:
    """
    Validate that a model choice is valid.

    Args:
        model: The model name to validate

    Returns:
        True if the model is valid, False otherwise

    Examples:
        >>> validate_model_choice("sonnet")
        True
        >>> validate_model_choice("invalid")
        False
    """
    return model in ["sonnet", "haiku", "opus"]


def get_model_display_info(model: ModelType) -> Dict[str, str]:
    """
    Get display metadata for a model.

    Args:
        model: The model type

    Returns:
        Dictionary containing label, cost_tier, performance_tier, and description

    Examples:
        >>> info = get_model_display_info("opus")
        >>> info["cost_tier"]
        "high"
    """
    return MODEL_METADATA.get(model, {
        "label": model.title(),
        "cost_tier": "unknown",
        "performance_tier": "unknown",
        "description": "Unknown model",
    })


def normalize_model_name(model: str) -> ModelType:
    """
    Normalize a model name to a valid ModelType.

    Args:
        model: The model name (case-insensitive)

    Returns:
        The normalized model type. Falls back to "sonnet" for invalid models.

    Examples:
        >>> normalize_model_name("OPUS")
        "opus"
        >>> normalize_model_name("invalid")
        "sonnet"
    """
    model_lower = model.lower()
    if validate_model_choice(model_lower):
        return model_lower  # type: ignore
    return "sonnet"
