"""
Model Configuration Utilities

Functions for extracting and validating per-stage model preferences
from orchestrator state.
"""

from typing import Dict, Optional, Any, List, Tuple

# Valid Claude model names
VALID_MODELS = {'opus', 'sonnet', 'haiku'}

# Default models per stage (fallback when not specified)
DEFAULT_STAGE_MODELS = {
    'plan': 'opus',
    'implement': 'opus',
    'build': 'opus',  # Alias for implement
    'test': 'sonnet',
    'review': 'sonnet',
    'document': 'sonnet',
    'clarify': 'haiku',
    'merge': 'haiku',
}


def get_stage_model(
    orchestrator_state: Dict[str, Any],
    stage_name: str,
    default: Optional[str] = None
) -> str:
    """
    Extract model preference for a specific stage from orchestrator state.

    Looks for stage-specific model in orchestrator_state['workflow']['stageModelPreferences'].
    Falls back to default parameter, then to DEFAULT_STAGE_MODELS, then to 'sonnet'.

    Args:
        orchestrator_state: The orchestrator state dict containing workflow config
        stage_name: Name of the stage (e.g., 'plan', 'test', 'implement')
        default: Optional default model if not found in preferences

    Returns:
        Model name (opus/sonnet/haiku)

    Example:
        >>> state = {'workflow': {'stageModelPreferences': {'plan': 'opus'}}}
        >>> get_stage_model(state, 'plan')
        'opus'
        >>> get_stage_model(state, 'test')
        'sonnet'
    """
    if not orchestrator_state or not isinstance(orchestrator_state, dict):
        return default or DEFAULT_STAGE_MODELS.get(stage_name, 'sonnet')

    # Try to get from workflow.stageModelPreferences
    workflow = orchestrator_state.get('workflow', {})
    if not isinstance(workflow, dict):
        return default or DEFAULT_STAGE_MODELS.get(stage_name, 'sonnet')

    stage_prefs = workflow.get('stageModelPreferences', {})
    if not isinstance(stage_prefs, dict):
        return default or DEFAULT_STAGE_MODELS.get(stage_name, 'sonnet')

    # Get model from preferences
    model = stage_prefs.get(stage_name)

    # Validate model
    if model and isinstance(model, str) and model.lower() in VALID_MODELS:
        return model.lower()

    # Fall back to default parameter, then DEFAULT_STAGE_MODELS, then 'sonnet'
    if default and default.lower() in VALID_MODELS:
        return default.lower()

    return DEFAULT_STAGE_MODELS.get(stage_name, 'sonnet')


def get_all_stage_models(orchestrator_state: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract all stage model preferences from orchestrator state.

    Returns a dict mapping stage names to their model preferences.
    Includes defaults for stages not explicitly configured.

    Args:
        orchestrator_state: The orchestrator state dict

    Returns:
        Dict mapping stage names to model names

    Example:
        >>> state = {'workflow': {'stageModelPreferences': {'plan': 'opus', 'test': 'haiku'}}}
        >>> models = get_all_stage_models(state)
        >>> models['plan']
        'opus'
        >>> models['test']
        'haiku'
    """
    result = {}

    if not orchestrator_state or not isinstance(orchestrator_state, dict):
        return DEFAULT_STAGE_MODELS.copy()

    workflow = orchestrator_state.get('workflow', {})
    if not isinstance(workflow, dict):
        return DEFAULT_STAGE_MODELS.copy()

    stage_prefs = workflow.get('stageModelPreferences', {})
    if not isinstance(stage_prefs, dict):
        return DEFAULT_STAGE_MODELS.copy()

    # Start with defaults
    result = DEFAULT_STAGE_MODELS.copy()

    # Override with configured preferences
    for stage_name, model in stage_prefs.items():
        if isinstance(model, str) and model.lower() in VALID_MODELS:
            result[stage_name] = model.lower()

    return result


def validate_model_preferences(model_prefs: Dict[str, str]) -> Tuple[bool, List[str]]:
    """
    Validate model preferences dict.

    Checks that all models are valid (opus/sonnet/haiku).

    Args:
        model_prefs: Dict mapping stage names to model names

    Returns:
        Tuple of (is_valid, error_messages)

    Example:
        >>> validate_model_preferences({'plan': 'opus', 'test': 'sonnet'})
        (True, [])
        >>> validate_model_preferences({'plan': 'gpt4'})
        (False, ['Invalid model "gpt4" for stage "plan"'])
    """
    if not isinstance(model_prefs, dict):
        return False, ['Model preferences must be a dictionary']

    errors = []

    for stage_name, model in model_prefs.items():
        if not isinstance(stage_name, str):
            errors.append(f'Stage name must be string, got {type(stage_name).__name__}')
            continue

        if not isinstance(model, str):
            errors.append(f'Model for stage "{stage_name}" must be string, got {type(model).__name__}')
            continue

        if model.lower() not in VALID_MODELS:
            valid_str = ', '.join(sorted(VALID_MODELS))
            errors.append(
                f'Invalid model "{model}" for stage "{stage_name}". '
                f'Valid models: {valid_str}'
            )

    return len(errors) == 0, errors


def is_valid_model(model: str) -> bool:
    """
    Check if a model name is valid.

    Args:
        model: Model name to check

    Returns:
        True if model is valid (opus/sonnet/haiku)

    Example:
        >>> is_valid_model('opus')
        True
        >>> is_valid_model('gpt4')
        False
    """
    return isinstance(model, str) and model.lower() in VALID_MODELS
