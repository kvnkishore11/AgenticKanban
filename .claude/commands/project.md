# Project Planning

Create a comprehensive project plan that breaks down large project requirements into manageable features using the exact specified markdown `Plan Format`. Follow the `Instructions` to create the plan use the `Relevant Files` to focus on the right files.

## Variables
project_description: $1
project_name: $2 (optional) - If not provided, extract from project_description

## Instructions

- IMPORTANT: You're writing a plan to break down a large project into manageable features that can be implemented incrementally.
- IMPORTANT: The `project_description` contains the high-level project requirements but remember we're not implementing the project, we're creating the plan that will break it down into features based on the `Plan Format` below.
- Create the plan in the `specs/` directory with filename: `project-{descriptive-name}-breakdown.md`
  - Replace `{descriptive-name}` with a short, descriptive name based on the project (e.g., "ecommerce-platform", "user-management-system", "analytics-dashboard")
- Use the `Plan Format` below to create the plan.
- Research the codebase to understand existing patterns, architecture, and conventions before planning the project breakdown.
- IMPORTANT: Replace every <placeholder> in the `Plan Format` with the requested value. Add as much detail as needed to break down the project successfully.
- Use your reasoning model: THINK HARD about the project requirements, prioritization, and logical feature breakdown.
- Follow existing patterns and conventions in the codebase. Don't reinvent the wheel.
- Design for incremental delivery and value-driven development.
- Consider dependencies between features and logical implementation order.
- Each feature should be independently valuable and deliverable.
- If you need new libraries, mention them in the `Notes` section of the `Plan Format`.
- Don't use decorators. Keep it simple.
- IMPORTANT: For each feature that includes UI components or user interactions:
  - Note that an E2E test should be created during feature implementation
  - Reference `.claude/commands/test_e2e.md` and `.claude/commands/e2e/test_basic_query.md` for E2E test patterns
- Respect requested files in the `Relevant Files` section.
- Start your research by reading the `README.md` file.



- Read `.claude/commands/conditional_docs.md` to check if your project breakdown requires additional documentation
- If your project matches any of the conditions listed, include those documentation files in the `Plan Format: Relevant Files` section of your plan

Ignore all other files in the codebase.

## Plan Format

```md
# Project: <project name>

## Project Overview
<describe the project in detail, including its purpose, scope, and value proposition>

## Project Goals
<list the main goals and objectives of the project>

## Target Users
<describe the target users and their needs>

## Project Scope
### In Scope
<list what is included in this project>

### Out of Scope
<list what is explicitly not included in this project>

## Technical Architecture Overview
<describe the high-level technical architecture and technology stack>

## Relevant Files
Use these files to understand the existing codebase structure:

<find and list the files that are relevant to understanding the existing architecture and patterns. Include any new files or directories that will need to be created for the project in an h3 'New Files' section.>

## Feature Breakdown

### Phase 1: Foundation Features (MVP)
<list the core foundational features needed for a minimum viable product>

#### Feature 1.1: <feature name>
- **Description**: <brief description of the feature>
- **User Story**: As a <user>, I want to <action> so that <benefit>
- **Acceptance Criteria**: <key criteria for completion>
- **Dependencies**: <any dependencies on other features or systems>
- **Estimated Complexity**: <Low/Medium/High>

#### Feature 1.2: <feature name>
- **Description**: <brief description of the feature>
- **User Story**: As a <user>, I want to <action> so that <benefit>
- **Acceptance Criteria**: <key criteria for completion>
- **Dependencies**: <any dependencies on other features or systems>
- **Estimated Complexity**: <Low/Medium/High>

<continue with additional Phase 1 features>

### Phase 2: Core Features
<list the main features that provide core functionality>

#### Feature 2.1: <feature name>
- **Description**: <brief description of the feature>
- **User Story**: As a <user>, I want to <action> so that <benefit>
- **Acceptance Criteria**: <key criteria for completion>
- **Dependencies**: <any dependencies on other features or systems>
- **Estimated Complexity**: <Low/Medium/High>

<continue with additional Phase 2 features>

### Phase 3: Advanced Features
<list advanced features that enhance the user experience>

#### Feature 3.1: <feature name>
- **Description**: <brief description of the feature>
- **User Story**: As a <user>, I want to <action> so that <benefit>
- **Acceptance Criteria**: <key criteria for completion>
- **Dependencies**: <any dependencies on other features or systems>
- **Estimated Complexity**: <Low/Medium/High>

<continue with additional Phase 3 features>

## Implementation Roadmap
### Development Sequence
<describe the recommended order for implementing features, considering dependencies and value delivery>

### Milestone Definitions
#### Milestone 1: <name>
- **Target**: <what will be achieved>
- **Features Included**: <list of features>
- **Success Criteria**: <how to measure success>

#### Milestone 2: <name>
- **Target**: <what will be achieved>
- **Features Included**: <list of features>
- **Success Criteria**: <how to measure success>

<continue with additional milestones>

## Risk Assessment
### Technical Risks
<list potential technical risks and mitigation strategies>

### Project Risks
<list potential project risks and mitigation strategies>

## Testing Strategy
### Overall Testing Approach
<describe the overall testing strategy for the project>

### Feature Testing Requirements
<describe specific testing requirements for different types of features>

## Validation Commands for Each Phase
### Phase 1 Validation
<list commands to validate Phase 1 completion>
- `cd app/server && uv run pytest` - Run server tests
- `cd app/client && bun tsc --noEmit` - Run frontend type checking
- `cd app/client && bun run build` - Run frontend build

### Phase 2 Validation
<list commands to validate Phase 2 completion>
- `cd app/server && uv run pytest` - Run server tests
- `cd app/client && bun tsc --noEmit` - Run frontend type checking
- `cd app/client && bun run build` - Run frontend build

### Phase 3 Validation
<list commands to validate Phase 3 completion>
- `cd app/server && uv run pytest` - Run server tests
- `cd app/client && bun tsc --noEmit` - Run frontend type checking
- `cd app/client && bun run build` - Run frontend build

## Next Steps
<describe the immediate next steps to begin project implementation>

1. **Create Individual Feature Plans**: Use `/feature` command to create detailed plans for each feature
2. **Set Up Project Infrastructure**: Establish any new directories, configurations, or dependencies
3. **Begin Phase 1 Implementation**: Start with the foundation features in the recommended order

## Notes
<optionally list any additional notes, considerations, or context that are relevant to the project>
```

## Project Description
Use the `project_description` variable to understand the project requirements and break them down into features.

## Report

- IMPORTANT: Return exclusively the path to the project plan file created and nothing else.