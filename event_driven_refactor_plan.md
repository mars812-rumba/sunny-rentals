# Refactoring CRM "Sunny Rentals" to Event-Driven Architecture

## Overview
Transition to an event-driven model where event history files (`events_{user_id}.json`) serve as the single source of truth. Compute user states dynamically from event logs instead of storing static statuses in the database. Ensure real-time synchronization between CRM and Bot processes.

## 1. Backend: Data Layer and Computed Statuses
Modify the `/api/crm/users` endpoint to compute user states on-the-fly from event history.

### Requirements:
- For each user, read their `events_{user_id}.json` file.
- Implement a "reducer" function that processes events to compute:
  - **Cloud Status**: Determined by the latest start/stop/pause events (e.g., Active, Paused, Offline).
  - **Last Responder**: Identify who sent the last message (manager, user, or AI).
  - **New Messages Indicator**: True if the last event is a user message without a read mark.
  - **Message Count**: Total number of messages in the history.
- Inject these computed fields as flat properties into the user object before sending to frontend.
- Remove reliance on pre-stored status fields in the database.

### Implementation Steps:
1. Update the endpoint logic to load and process event files.
2. Create helper functions for event reduction.
3. Ensure error handling for missing or corrupted event files.

## 2. Synchronization Between Processes (Bridge Management)
Establish a notification mechanism for inter-process communication between CRM and Bot.

### Requirements:
- When AI is activated/deactivated via CRM, the backend sends an internal request to the Bot process.
- The Bot updates its in-memory state and switches message handling logic accordingly.
- Use HTTP requests or a message queue for synchronization.

### Implementation Steps:
1. Define new endpoints for AI control (e.g., `/api/bot/activate_ai`, `/api/bot/deactivate_ai`).
2. Implement internal API calls from CRM backend to Bot.
3. Update Bot's logic to handle state changes dynamically.

## 3. Frontend: Visualization Based on Computations
Adapt the user card component in `CRMPage.tsx` to use computed fields.

### Requirements:
- Remove dependencies on old `dialog_status` structure.
- **Needs Reply Highlight**: If last responder is user, apply visual highlight (background/border) to the card.
- **AI Status Indicator**: Display Active/Offline status using semi-transparent elements (e.g., icons or badges).
- **Interactive Controls**:
  - "Start AI" and "Stop AI" buttons linked to synchronization endpoints.
  - "Open Chat" button switches the modal tab to "Chat".

### Implementation Steps:
1. Update component props and state to use new flat fields.
2. Modify rendering logic for highlights and indicators.
3. Bind button actions to API calls and modal navigation.

## 4. Bot Feedback: Event Logging
Ensure all incoming messages trigger event creation in the history.

### Requirements:
- Bot processes incoming messages and immediately logs events via backend API.
- This allows CRM to reflect status changes instantly upon data refresh.

### Implementation Steps:
1. Integrate event logging into Bot's message handling pipeline.
2. Create or use existing backend endpoint for appending events (e.g., `/api/events/log`).
3. Verify that events are written synchronously to maintain consistency.

## Overall Goals
- Achieve full synchronization between manager actions and bot responses.
- Display real-time dialog states based solely on event logs.
- Improve system reliability by eliminating stale data issues.

## Next Steps
1. Analyze current codebase for existing structures.
2. Implement backend changes incrementally.
3. Update frontend components.
4. Test synchronization mechanisms.
5. Validate event-driven computations.