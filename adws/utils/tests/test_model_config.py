"""
Unit tests for model configuration utilities.
"""

from utils.model_config import (
    get_stage_model,
    get_all_stage_models,
    validate_model_preferences,
    is_valid_model,
    DEFAULT_STAGE_MODELS,
)


class TestGetStageModel:
    """Tests for get_stage_model function."""

    def test_get_stage_model_with_preference(self):
        """Should return stage-specific model when set in preferences."""
        state = {
            'workflow': {
                'stageModelPreferences': {
                    'plan': 'opus',
                    'test': 'haiku'
                }
            }
        }
        assert get_stage_model(state, 'plan') == 'opus'
        assert get_stage_model(state, 'test') == 'haiku'

    def test_get_stage_model_with_default(self):
        """Should use default when no preference set."""
        state = {'workflow': {'stageModelPreferences': {}}}
        # Plan defaults to opus
        assert get_stage_model(state, 'plan') == 'opus'
        # Test defaults to sonnet
        assert get_stage_model(state, 'test') == 'sonnet'

    def test_get_stage_model_invalid_model(self):
        """Should fall back to default for invalid model."""
        state = {
            'workflow': {
                'stageModelPreferences': {
                    'plan': 'gpt4'  # Invalid model
                }
            }
        }
        # Should fall back to default for plan (opus)
        assert get_stage_model(state, 'plan') == 'opus'

    def test_get_stage_model_empty_state(self):
        """Should handle empty state gracefully."""
        assert get_stage_model({}, 'plan') == 'opus'
        assert get_stage_model(None, 'test') == 'sonnet'

    def test_get_stage_model_no_workflow_key(self):
        """Should handle missing workflow key."""
        state = {'other': 'data'}
        assert get_stage_model(state, 'plan') == 'opus'

    def test_get_stage_model_custom_default(self):
        """Should use custom default parameter when provided."""
        state = {'workflow': {'stageModelPreferences': {}}}
        assert get_stage_model(state, 'unknown_stage', default='haiku') == 'haiku'

    def test_get_stage_model_case_insensitive(self):
        """Should handle model names case-insensitively."""
        state = {
            'workflow': {
                'stageModelPreferences': {
                    'plan': 'OPUS',
                    'test': 'Sonnet'
                }
            }
        }
        assert get_stage_model(state, 'plan') == 'opus'
        assert get_stage_model(state, 'test') == 'sonnet'


class TestGetAllStageModels:
    """Tests for get_all_stage_models function."""

    def test_get_all_stage_models_with_preferences(self):
        """Should return all stage models including preferences."""
        state = {
            'workflow': {
                'stageModelPreferences': {
                    'plan': 'sonnet',  # Override default
                    'test': 'haiku'     # Override default
                }
            }
        }
        models = get_all_stage_models(state)
        assert models['plan'] == 'sonnet'
        assert models['test'] == 'haiku'
        # Unchanged defaults
        assert models['implement'] == 'opus'
        assert models['review'] == 'sonnet'

    def test_get_all_stage_models_empty_state(self):
        """Should return all defaults for empty state."""
        models = get_all_stage_models({})
        assert models == DEFAULT_STAGE_MODELS

    def test_get_all_stage_models_invalid_models(self):
        """Should ignore invalid models in preferences."""
        state = {
            'workflow': {
                'stageModelPreferences': {
                    'plan': 'gpt4',     # Invalid
                    'test': 'sonnet'    # Valid
                }
            }
        }
        models = get_all_stage_models(state)
        # Should keep default for plan (invalid model ignored)
        assert models['plan'] == 'opus'
        # Should use preference for test
        assert models['test'] == 'sonnet'


class TestValidateModelPreferences:
    """Tests for validate_model_preferences function."""

    def test_validate_model_preferences_valid(self):
        """Should validate correct preferences."""
        prefs = {
            'plan': 'opus',
            'test': 'sonnet',
            'clarify': 'haiku'
        }
        is_valid, errors = validate_model_preferences(prefs)
        assert is_valid
        assert len(errors) == 0

    def test_validate_model_preferences_invalid_model(self):
        """Should reject invalid model names."""
        prefs = {
            'plan': 'opus',
            'test': 'gpt4'  # Invalid
        }
        is_valid, errors = validate_model_preferences(prefs)
        assert not is_valid
        assert len(errors) == 1
        assert 'gpt4' in errors[0]
        assert 'test' in errors[0]

    def test_validate_model_preferences_not_dict(self):
        """Should reject non-dict input."""
        is_valid, errors = validate_model_preferences("not a dict")
        assert not is_valid
        assert len(errors) == 1
        assert 'dictionary' in errors[0].lower()

    def test_validate_model_preferences_non_string_stage(self):
        """Should reject non-string stage names."""
        prefs = {
            123: 'opus'  # Non-string key
        }
        is_valid, errors = validate_model_preferences(prefs)
        assert not is_valid
        assert len(errors) > 0

    def test_validate_model_preferences_non_string_model(self):
        """Should reject non-string model values."""
        prefs = {
            'plan': 123  # Non-string value
        }
        is_valid, errors = validate_model_preferences(prefs)
        assert not is_valid
        assert 'plan' in errors[0]

    def test_validate_model_preferences_empty_dict(self):
        """Should accept empty preferences dict."""
        is_valid, errors = validate_model_preferences({})
        assert is_valid
        assert len(errors) == 0

    def test_validate_model_preferences_case_insensitive(self):
        """Should accept models with different casing."""
        prefs = {
            'plan': 'OPUS',
            'test': 'Sonnet',
            'clarify': 'haiku'
        }
        is_valid, errors = validate_model_preferences(prefs)
        assert is_valid
        assert len(errors) == 0


class TestIsValidModel:
    """Tests for is_valid_model function."""

    def test_is_valid_model_valid(self):
        """Should recognize valid models."""
        assert is_valid_model('opus')
        assert is_valid_model('sonnet')
        assert is_valid_model('haiku')

    def test_is_valid_model_invalid(self):
        """Should reject invalid models."""
        assert not is_valid_model('gpt4')
        assert not is_valid_model('claude-3')
        assert not is_valid_model('')
        assert not is_valid_model('invalid')

    def test_is_valid_model_case_insensitive(self):
        """Should accept different cases."""
        assert is_valid_model('OPUS')
        assert is_valid_model('Sonnet')
        assert is_valid_model('HAIKU')

    def test_is_valid_model_non_string(self):
        """Should reject non-string input."""
        assert not is_valid_model(123)
        assert not is_valid_model(None)
        assert not is_valid_model(['opus'])


class TestDefaultStageModels:
    """Tests for DEFAULT_STAGE_MODELS constant."""

    def test_default_stage_models_coverage(self):
        """Should have defaults for all expected stages."""
        expected_stages = ['plan', 'implement', 'build', 'test', 'review', 'document', 'clarify', 'merge']
        for stage in expected_stages:
            assert stage in DEFAULT_STAGE_MODELS
            assert DEFAULT_STAGE_MODELS[stage] in ['opus', 'sonnet', 'haiku']

    def test_default_stage_models_appropriate(self):
        """Should have appropriate defaults per stage."""
        # Complex stages should use opus
        assert DEFAULT_STAGE_MODELS['plan'] == 'opus'
        assert DEFAULT_STAGE_MODELS['implement'] == 'opus'
        assert DEFAULT_STAGE_MODELS['build'] == 'opus'

        # Moderate stages should use sonnet
        assert DEFAULT_STAGE_MODELS['test'] == 'sonnet'
        assert DEFAULT_STAGE_MODELS['review'] == 'sonnet'
        assert DEFAULT_STAGE_MODELS['document'] == 'sonnet'

        # Simple stages should use haiku
        assert DEFAULT_STAGE_MODELS['clarify'] == 'haiku'
        assert DEFAULT_STAGE_MODELS['merge'] == 'haiku'
