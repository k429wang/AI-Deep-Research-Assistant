import { ResearchSessionStatus, ResearchSessionData, StateTransition } from './types';

/**
 * State machine for research sessions
 * Defines valid state transitions and conditions
 */
export class ResearchSessionStateMachine {
  private static transitions: StateTransition[] = [
    {
      from: ResearchSessionStatus.CREATED,
      to: ResearchSessionStatus.AWAITING_REFINEMENTS,
      condition: (session) => true, // Always can move to awaiting refinements
    },
    {
      from: ResearchSessionStatus.AWAITING_REFINEMENTS,
      to: ResearchSessionStatus.REFINEMENTS_IN_PROGRESS,
      condition: (session) => session.refinements.length > 0,
    },
    {
      from: ResearchSessionStatus.REFINEMENTS_IN_PROGRESS,
      to: ResearchSessionStatus.REFINEMENTS_COMPLETE,
      condition: (session) => {
        const unanswered = session.refinements.filter((r) => !r.answer);
        return unanswered.length === 0 && session.refinements.length > 0;
      },
    },
    {
      from: ResearchSessionStatus.REFINEMENTS_COMPLETE,
      to: ResearchSessionStatus.RUNNING_RESEARCH,
      condition: (session) => !!session.refinedPrompt,
    },
    {
      from: ResearchSessionStatus.RUNNING_RESEARCH,
      to: ResearchSessionStatus.COMPLETED,
      condition: (session) => !!(session.openaiResult && session.geminiResult),
    },
    // Failure transitions (can happen from any state)
    {
      from: ResearchSessionStatus.CREATED,
      to: ResearchSessionStatus.FAILED,
      condition: () => false, // Only set explicitly
    },
    {
      from: ResearchSessionStatus.AWAITING_REFINEMENTS,
      to: ResearchSessionStatus.FAILED,
      condition: () => false,
    },
    {
      from: ResearchSessionStatus.REFINEMENTS_IN_PROGRESS,
      to: ResearchSessionStatus.FAILED,
      condition: () => false,
    },
    {
      from: ResearchSessionStatus.REFINEMENTS_COMPLETE,
      to: ResearchSessionStatus.FAILED,
      condition: () => false,
    },
    {
      from: ResearchSessionStatus.RUNNING_RESEARCH,
      to: ResearchSessionStatus.FAILED,
      condition: () => false,
    },
  ];

  /**
   * Check if a state transition is valid
   */
  static canTransition(
    from: ResearchSessionStatus,
    to: ResearchSessionStatus,
    session: ResearchSessionData
  ): boolean {
    // Can always stay in the same state
    if (from === to) {
      return true;
    }

    // Can always transition to FAILED (error handling)
    if (to === ResearchSessionStatus.FAILED) {
      return true;
    }

    // Find matching transition
    const transition = this.transitions.find(
      (t) => t.from === from && t.to === to
    );

    if (!transition) {
      return false;
    }

    return transition.condition(session);
  }

  /**
   * Get the next valid states from the current state
   */
  static getNextStates(
    currentState: ResearchSessionStatus,
    session: ResearchSessionData
  ): ResearchSessionStatus[] {
    const nextStates: ResearchSessionStatus[] = [currentState]; // Can always stay in current state

    this.transitions
      .filter((t) => t.from === currentState)
      .forEach((transition) => {
        if (transition.condition(session)) {
          nextStates.push(transition.to);
        }
      });

    // Can always transition to FAILED
    if (currentState !== ResearchSessionStatus.FAILED) {
      nextStates.push(ResearchSessionStatus.FAILED);
    }

    return [...new Set(nextStates)];
  }

  /**
   * Validate and get the next state based on session data
   */
  static getNextState(session: ResearchSessionData): ResearchSessionStatus | null {
    const currentState = session.status;
    const nextStates = this.getNextStates(currentState, session);

    // Remove current state and FAILED from automatic progression
    const progressionStates = nextStates.filter(
      (s) => s !== currentState && s !== ResearchSessionStatus.FAILED
    );

    if (progressionStates.length === 0) {
      return null;
    }

    // Return the first valid progression state
    return progressionStates[0];
  }
}

