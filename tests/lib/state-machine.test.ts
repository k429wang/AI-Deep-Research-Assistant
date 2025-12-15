import { ResearchSessionStateMachine } from '@/lib/state-machine';
import { ResearchSessionStatus, ResearchSessionData } from '@/lib/types';

describe('ResearchSessionStateMachine', () => {
  const mockSession: ResearchSessionData = {
    id: '1',
    userId: 'user1',
    initialPrompt: 'Test prompt',
    status: ResearchSessionStatus.CREATED,
    createdAt: new Date(),
    updatedAt: new Date(),
    refinements: [],
  };

  describe('canTransition', () => {
    it('should allow transition from CREATED to AWAITING_REFINEMENTS', () => {
      const canTransition = ResearchSessionStateMachine.canTransition(
        ResearchSessionStatus.CREATED,
        ResearchSessionStatus.AWAITING_REFINEMENTS,
        mockSession
      );
      expect(canTransition).toBe(true);
    });

    it('should allow transition to FAILED from any state', () => {
      const canTransition = ResearchSessionStateMachine.canTransition(
        ResearchSessionStatus.CREATED,
        ResearchSessionStatus.FAILED,
        mockSession
      );
      expect(canTransition).toBe(true);
    });

    it('should not allow invalid transitions', () => {
      const canTransition = ResearchSessionStateMachine.canTransition(
        ResearchSessionStatus.CREATED,
        ResearchSessionStatus.COMPLETED,
        mockSession
      );
      expect(canTransition).toBe(false);
    });
  });

  describe('getNextStates', () => {
    it('should return valid next states', () => {
      const nextStates = ResearchSessionStateMachine.getNextStates(
        ResearchSessionStatus.CREATED,
        mockSession
      );
      expect(nextStates).toContain(ResearchSessionStatus.CREATED);
      expect(nextStates).toContain(ResearchSessionStatus.AWAITING_REFINEMENTS);
      expect(nextStates).toContain(ResearchSessionStatus.FAILED);
    });
  });
});

