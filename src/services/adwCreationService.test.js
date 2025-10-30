import adwCreationService from './adwCreationService';

describe('ADWCreationService', () => {
  describe('generateWorkflowName', () => {
    it('should return adw_general_iso for empty stages', () => {
      expect(adwCreationService.generateWorkflowName([])).toBe('adw_general_iso');
      expect(adwCreationService.generateWorkflowName(null)).toBe('adw_general_iso');
    });

    it('should return adw_sdlc_iso when all SDLC stages are present', () => {
      const stages = ['plan', 'implement', 'test', 'review', 'document'];
      expect(adwCreationService.generateWorkflowName(stages)).toBe('adw_sdlc_iso');
    });

    it('should return adw_sdlc_iso when SDLC stages are in different order', () => {
      const stages = ['document', 'test', 'plan', 'review', 'implement'];
      expect(adwCreationService.generateWorkflowName(stages)).toBe('adw_sdlc_iso');
    });

    it('should return adw_sdlc_iso when additional stages are included with SDLC', () => {
      const stages = ['plan', 'implement', 'test', 'review', 'document', 'pr'];
      expect(adwCreationService.generateWorkflowName(stages)).toBe('adw_sdlc_iso');
    });

    it('should return dynamic workflow name for partial SDLC stages', () => {
      const stages = ['plan', 'implement', 'test'];
      expect(adwCreationService.generateWorkflowName(stages)).toBe('adw_plan_build_test_iso');
    });

    it('should map implement to build in dynamic workflow names', () => {
      const stages = ['implement'];
      expect(adwCreationService.generateWorkflowName(stages)).toBe('adw_build_iso');
    });

    it('should handle pr stage mapping to ship', () => {
      const stages = ['pr'];
      expect(adwCreationService.generateWorkflowName(stages)).toBe('adw_ship_iso');
    });

    it('should not return sdlc_iso when missing one SDLC stage', () => {
      const stages = ['plan', 'implement', 'test', 'review']; // missing document
      expect(adwCreationService.generateWorkflowName(stages)).not.toBe('adw_sdlc_iso');
      expect(adwCreationService.generateWorkflowName(stages)).toBe('adw_plan_build_test_review_iso');
    });

    it('should handle duplicate stages correctly', () => {
      const stages = ['plan', 'plan', 'implement', 'implement'];
      expect(adwCreationService.generateWorkflowName(stages)).toBe('adw_plan_build_iso');
    });

    it('should handle all SDLC stages with duplicates', () => {
      const stages = ['plan', 'implement', 'test', 'review', 'document', 'plan'];
      expect(adwCreationService.generateWorkflowName(stages)).toBe('adw_sdlc_iso');
    });
  });

  describe('createAdwConfiguration', () => {
    it('should create valid ADW configuration', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        workItemType: 'feature',
        queuedStages: ['plan', 'implement'],
        images: []
      };

      const config = adwCreationService.createAdwConfiguration(taskData);

      expect(config).toHaveProperty('adw_id');
      expect(config).toHaveProperty('workflow_name');
      expect(config).toHaveProperty('state');
      expect(config).toHaveProperty('worktree');
      expect(config).toHaveProperty('execution_context');
      expect(config.workflow_name).toBe('adw_plan_build_iso');
    });

    it('should use adw_sdlc_iso for full SDLC stages', () => {
      const taskData = {
        description: 'Full SDLC task',
        workItemType: 'feature',
        queuedStages: ['plan', 'implement', 'test', 'review', 'document']
      };

      const config = adwCreationService.createAdwConfiguration(taskData);

      expect(config.workflow_name).toBe('adw_sdlc_iso');
    });
  });

  describe('validateAdwConfiguration', () => {
    it('should validate a complete configuration', () => {
      const config = {
        adw_id: 'test_123',
        workflow_name: 'adw_sdlc_iso',
        task_metadata: { description: 'Test' },
        state: { workspace: {}, task: {} }
      };

      const validation = adwCreationService.validateAdwConfiguration(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const config = {
        workflow_name: 'adw_sdlc_iso'
      };

      const validation = adwCreationService.validateAdwConfiguration(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('ADW ID is required');
      expect(validation.errors).toContain('State configuration is required');
    });
  });
});