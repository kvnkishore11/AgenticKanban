# Project Specification: AI Developer Workflow (ADW) Kanban Board

## 1. Project Goal

The goal of this project is to develop a **frontend-only**, desktop-style web application that serves as a **Kanban board** for managing and visualizing **AI Developer Workflows (ADWs)**. The application will be designed to run locally (e.g., via `localhost`) and will act as a central hub for tracking the progress of individual features or tasks within a selected project.

## 2. Core Requirements

| ID | Requirement | Description |
| :--- | :--- | :--- |
| **R1.1** | **Frontend-Only** | The application must be built entirely using frontend technologies (HTML, CSS, JavaScript/Frameworks like React/Vue/Angular). **No backend server or database is required.** Data persistence should be handled via browser storage (e.g., LocalStorage) or simulated file system interaction if necessary for the desktop-like feel. |
| **R1.2** | **Kanban Board** | The main interface must be a Kanban board with distinct, configurable stages. |
| **R1.3** | **Project Selection** | The application must include a mechanism (simulated file picker or text input) to "open" or select a project directory. The application will then expect to find the project's root folder structure. |
| **R1.4** | **Project Structure Dependency** | The application must be designed to interact with a specific project folder structure, particularly the `.claude/commands` and `agentics/adws` directories, even if the interaction is simulated in the frontend. |
| **R1.5** | **Customizable ADW Pipeline Stages** | The application must support **custom, user-defined ADW pipeline configurations**. For each pipeline (e.g., a folder in `agentics/adws`), users should be able to select which Kanban stages (from the fixed list) are included for that workflow, and in what order. This customization is per pipeline/category, so tasks belonging to different pipelines can pass through different subsets/sequences of the main stages, according to user configuration. The board's logic for available transitions and visualization must respect these customized pipelines as defined by each ADW.


## 3. Application Components and Features

### 3.1. Kanban Stages

The Kanban board will feature the following **7 fixed stages (columns)**:

1.  **Plan**
2.  **Build**
3.  **Test**
4.  **Review**
5.  **Document**
6.  **PR (Pull Request)**
7.  **Errored** (A dedicated holding/terminal stage for failed tasks)

### 3.2. Feature/Task Input (Issue Tracker Simulation)

*   **Input Mechanism:** Before a task enters the pipeline, there must be a dedicated input area, simulating a **GitHub Issues** interface.
*   **Data Entry:** There should be a single input field where users enter a task description in free-form text. The application will automatically extract the title and description from this input during the plan stage, and these can then be displayed on each card.
*   **Pipeline Selection:** Crucially, upon creation, the user must select the **ADW Pipeline** the task will follow (see Section 3.4).

### 3.3. Kanban Cards (Feature Visualization)

Each card on the board represents a single feature or task. The card must display:

*   **Task Title/Summary**
*   **Current Stage** (Implicit by column, but useful for detail view)
*   **Basic Logging:** A visible, summarized log of the last few actions or commands executed for this feature.
*   **Detail View:** Clicking the card should open a detailed view showing the **full execution log** and the **selected ADW Pipeline**.

> **Note:** Unlike traditional Kanban boards, **the user does not manually drag a card between stages**. Instead, the stage of each card is **automatically progressed** based on the status reported by the corresponding ADW pipeline. The app must listen for or poll the state of the feature/task as delivered from the simulated ADW logic (which acts as an agentic workflow orchestrator) and reflect stage changes on the board as they occur. The Kanban visualization is reactive to each task's real status as determined by its current ADW state.

### 3.4. AI Developer Workflow (ADW) Pipeline Selection

The application must allow the user to select a predefined workflow for each issue, based on the expected contents of the `agentics/adws` folder.

*   **Workflow Primitives:** The application conceptually relies on commands found in the (simulated) project path: `.claude/commands/`. These primitives include: `implement`, `plan`, `prime`, `build`, etc.
*   **Predefined Pipelines:** The user must select from a list of predefined ADW pipelines, which are named after folders within `agentics/adws/`. Examples of these pipelines are:
    *   `plan`
    *   `build`
    *   `review`
    *   `test`
    *   `document`
    *   `plan-build`
    *   `plan-build-document`
*   **Pipeline Mapping:** The selected pipeline (e.g., `plan-build-document`) dictates the expected sequence of stages the card will pass through. **However, progression through the stages is handled automatically by the application based on the task’s ADW state, not by user action.**


## 4. Project File Structure (Conceptual)

The application is built around the conceptual existence of a specific project folder structure. The frontend must be designed to visualize and manage data related to these paths:

```
/selected-project-root
├── .claude/
│   └── commands/
│       ├── implement
│       ├── plan
│       ├── prime
│       └── build
├── agentics/
│   ├── specs/
│   ├── ai-docs/
│   ├── app-docs/
│   ├── scripts/
│   ├── agents/
│   ├── adws/
│       ├── plan/
│       ├── build/
│       ├── review/
│       ├── test/
│       ├── document/
│       ├── plan-build/
│       ├── plan-build-document/
│       └── logs/
└── ... other project files
```

## 5. Technical Considerations (Frontend)

*   **Technology Stack:** Choose a modern JavaScript framework (e.g., React, Vue, Svelte) to facilitate component-based development.
*   **Styling:** Implement a clean, desktop-application-like UI/UX.
*   **State Management:** The application state, including all tasks, their current stage, and logs, must be managed client-side.
*   **Persistence:** Use **Local Storage** to save and load the entire application state (tasks, stages, logs) so that the board state persists between browser sessions.

## 6. Development Tasks (Initial Focus)

1.  **Setup:** Initialize the project with the chosen framework (e.g., `manus-create-react-app`).
2.  **Kanban Layout:** Implement the 7-column Kanban board structure.
3.  **Task Input Form:** Create the GitHub Issues-style input form, including the dynamic dropdown for **ADW Pipeline Selection** (using the list from Section 3.4).
4.  **Card Component:** Develop the Kanban Card component (Section 3.3). **Card movement between stages should be automatic, driven by the task’s ADW workflow state, with the UI updated accordingly.**
5.  **Data Model:** Define the core JavaScript/TypeScript data model for a "Task" (ID, Title, Description, ADW Pipeline, Current Stage, Log History).
6.  **Persistence Layer:** Implement save/load functionality using Local Storage.

This specification provides a clear, structured guide for developing the **AI Developer Workflow (ADW) Kanban Board** application, **with stages progressing automatically in response to each ADW's internal task state** rather than manual intervention by the user.
