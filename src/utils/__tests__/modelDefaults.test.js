/**
 * Unit tests for model default utilities
 */

import {
  getDefaultModelForStage,
  generateDefaultStageModels,
  isValidModel,
  getCostColor,
  getPerformanceColor,
  MODEL_INFO
} from '../modelDefaults';

describe('getDefaultModelForStage', () => {
  test('returns opus for plan stage', () => {
    expect(getDefaultModelForStage('plan')).toBe('opus');
    expect(getDefaultModelForStage('Plan')).toBe('opus');
    expect(getDefaultModelForStage('PLAN')).toBe('opus');
  });

  test('returns opus for build stage', () => {
    expect(getDefaultModelForStage('build')).toBe('opus');
    expect(getDefaultModelForStage('Build')).toBe('opus');
    expect(getDefaultModelForStage('BUILD')).toBe('opus');
  });

  test('returns sonnet for test stage', () => {
    expect(getDefaultModelForStage('test')).toBe('sonnet');
    expect(getDefaultModelForStage('Test')).toBe('sonnet');
    expect(getDefaultModelForStage('TEST')).toBe('sonnet');
  });

  test('returns sonnet for review stage', () => {
    expect(getDefaultModelForStage('review')).toBe('sonnet');
    expect(getDefaultModelForStage('Review')).toBe('sonnet');
  });

  test('returns sonnet for document stage', () => {
    expect(getDefaultModelForStage('document')).toBe('sonnet');
    expect(getDefaultModelForStage('Document')).toBe('sonnet');
  });

  test('returns haiku for merge stage', () => {
    expect(getDefaultModelForStage('merge')).toBe('haiku');
    expect(getDefaultModelForStage('Merge')).toBe('haiku');
    expect(getDefaultModelForStage('MERGE')).toBe('haiku');
  });

  test('returns sonnet for unknown stages', () => {
    expect(getDefaultModelForStage('unknown')).toBe('sonnet');
    expect(getDefaultModelForStage('custom')).toBe('sonnet');
    expect(getDefaultModelForStage('deployment')).toBe('sonnet');
  });

  test('returns sonnet for null or undefined', () => {
    expect(getDefaultModelForStage(null)).toBe('sonnet');
    expect(getDefaultModelForStage(undefined)).toBe('sonnet');
    expect(getDefaultModelForStage('')).toBe('sonnet');
  });
});

describe('generateDefaultStageModels', () => {
  test('generates correct mapping for full SDLC workflow', () => {
    const stages = ['plan', 'build', 'test', 'review', 'document', 'merge'];
    const models = generateDefaultStageModels(stages);

    expect(models).toEqual({
      plan: 'opus',
      build: 'opus',
      test: 'sonnet',
      review: 'sonnet',
      document: 'sonnet',
      merge: 'haiku'
    });
  });

  test('generates mapping for subset of stages', () => {
    const stages = ['plan', 'build'];
    const models = generateDefaultStageModels(stages);

    expect(models).toEqual({
      plan: 'opus',
      build: 'opus'
    });
  });

  test('handles empty array', () => {
    expect(generateDefaultStageModels([])).toEqual({});
  });

  test('handles non-array input', () => {
    expect(generateDefaultStageModels(null)).toEqual({});
    expect(generateDefaultStageModels(undefined)).toEqual({});
    expect(generateDefaultStageModels('not-an-array')).toEqual({});
  });

  test('handles mixed case stage names', () => {
    const stages = ['PLAN', 'Build', 'TEST'];
    const models = generateDefaultStageModels(stages);

    expect(models).toEqual({
      PLAN: 'opus',
      Build: 'opus',
      TEST: 'sonnet'
    });
  });
});

describe('isValidModel', () => {
  test('returns true for valid models', () => {
    expect(isValidModel('sonnet')).toBe(true);
    expect(isValidModel('haiku')).toBe(true);
    expect(isValidModel('opus')).toBe(true);
  });

  test('returns false for invalid models', () => {
    expect(isValidModel('invalid')).toBe(false);
    expect(isValidModel('gpt4')).toBe(false);
    expect(isValidModel('')).toBe(false);
    expect(isValidModel(null)).toBe(false);
    expect(isValidModel(undefined)).toBe(false);
  });

  test('is case-sensitive', () => {
    expect(isValidModel('Sonnet')).toBe(false);
    expect(isValidModel('OPUS')).toBe(false);
    expect(isValidModel('Haiku')).toBe(false);
  });
});

describe('getCostColor', () => {
  test('returns correct color for low cost', () => {
    expect(getCostColor('low')).toBe('text-green-600 bg-green-100');
  });

  test('returns correct color for medium cost', () => {
    expect(getCostColor('medium')).toBe('text-yellow-600 bg-yellow-100');
  });

  test('returns correct color for high cost', () => {
    expect(getCostColor('high')).toBe('text-red-600 bg-red-100');
  });

  test('returns default color for unknown cost', () => {
    expect(getCostColor('unknown')).toBe('text-gray-600 bg-gray-100');
    expect(getCostColor('')).toBe('text-gray-600 bg-gray-100');
  });
});

describe('getPerformanceColor', () => {
  test('returns correct color for fast tier', () => {
    expect(getPerformanceColor('fast')).toBe('text-blue-600 bg-blue-100');
  });

  test('returns correct color for balanced tier', () => {
    expect(getPerformanceColor('balanced')).toBe('text-purple-600 bg-purple-100');
  });

  test('returns correct color for powerful tier', () => {
    expect(getPerformanceColor('powerful')).toBe('text-orange-600 bg-orange-100');
  });

  test('returns default color for unknown tier', () => {
    expect(getPerformanceColor('unknown')).toBe('text-gray-600 bg-gray-100');
    expect(getPerformanceColor('')).toBe('text-gray-600 bg-gray-100');
  });
});

describe('MODEL_INFO', () => {
  test('contains all required models', () => {
    expect(MODEL_INFO).toHaveProperty('sonnet');
    expect(MODEL_INFO).toHaveProperty('haiku');
    expect(MODEL_INFO).toHaveProperty('opus');
  });

  test('each model has complete metadata', () => {
    const requiredFields = ['label', 'tier', 'cost', 'description', 'icon'];

    ['sonnet', 'haiku', 'opus'].forEach(model => {
      const info = MODEL_INFO[model];
      requiredFields.forEach(field => {
        expect(info).toHaveProperty(field);
        expect(info[field]).toBeTruthy();
      });
    });
  });

  test('sonnet has correct metadata', () => {
    expect(MODEL_INFO.sonnet).toEqual({
      label: 'Sonnet',
      tier: 'balanced',
      cost: 'medium',
      description: 'Balanced performance and cost',
      icon: 'Scale'
    });
  });

  test('haiku has correct metadata', () => {
    expect(MODEL_INFO.haiku).toEqual({
      label: 'Haiku',
      tier: 'fast',
      cost: 'low',
      description: 'Fast and economical',
      icon: 'Zap'
    });
  });

  test('opus has correct metadata', () => {
    expect(MODEL_INFO.opus).toEqual({
      label: 'Opus',
      tier: 'powerful',
      cost: 'high',
      description: 'Most capable model',
      icon: 'Crown'
    });
  });
});
