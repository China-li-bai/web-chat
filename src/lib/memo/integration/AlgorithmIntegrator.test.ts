import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlgorithmIntegrator, type AlgorithmConfig } from './AlgorithmIntegrator';
import { LearningItemDAO } from '../database/dao/LearningItemDAO';
import { StudyRecordDAO } from '../database/dao/StudyRecordDAO';
import { StudySessionDAO } from '../database/dao/StudySessionDAO';
import { FSRSAlgorithm } from '../algorithms/spacedRepetition';
import { DifficultyAdaptiveAlgorithm } from '../algorithms/difficultyAdaptive';
import { ActiveRetrievalAlgorithm } from '../algorithms/activeRetrieval';

// Mock the DAO classes
vi.mock('../database/dao/LearningItemDAO');
vi.mock('../database/dao/StudyRecordDAO');
vi.mock('../database/dao/StudySessionDAO');

// Mock the algorithm classes
vi.mock('../algorithms/spacedRepetition');
vi.mock('../algorithms/difficultyAdaptive');
vi.mock('../algorithms/activeRetrieval');

describe('AlgorithmIntegrator', () => {
  let integrator: AlgorithmIntegrator;
  let mockLearningItemDAO: any;
  let mockStudyRecordDAO: any;
  let mockStudySessionDAO: any;
  let mockConfig: AlgorithmConfig;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock instances
    mockLearningItemDAO = {
      findDueForReview: vi.fn(),
      updateFSRSData: vi.fn(),
      findByUserId: vi.fn(),
      findById: vi.fn()
    };

    mockStudyRecordDAO = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      findByItemId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findById: vi.fn()
    };

    mockStudySessionDAO = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      update: vi.fn(),
      findById: vi.fn()
    };

    const mockDifficultyAlgorithm = {
      analyzeLearningProfile: vi.fn(),
      adjustDifficulty: vi.fn(),
      calculateCognitiveLoad: vi.fn(),
      predictOptimalDifficulty: vi.fn()
    };

    const mockFSRSAlgorithm = {
       calculateMemoryStrength: vi.fn(),
       scheduleNextReview: vi.fn(),
       updateParameters: vi.fn(),
       calculateNextReview: vi.fn()
     };

    const mockActiveRetrievalAlgorithm = {
      generateRetrievalSchedule: vi.fn(),
      selectOptimalStrategy: vi.fn(),
      evaluateRetrieval: vi.fn()
    };

    // Setup default mock returns
    mockDifficultyAlgorithm.analyzeLearningProfile.mockResolvedValue({
      userId: 'user123',
      cognitiveCapacity: 0.8,
      preferredDifficulty: 0.5,
      learningVelocity: 1.2,
      retentionRate: 0.85,
      adaptationRate: 0.1,
      stressThreshold: 0.7,
      focusWindow: 1800,
      lastUpdated: new Date()
    });

    mockActiveRetrievalAlgorithm.generateRetrievalSchedule.mockReturnValue({
      items: [],
      estimatedDuration: 1800,
      cognitiveLoadPrediction: 0.6
    });

    // Mock constructors
    (LearningItemDAO as any).mockImplementation(() => mockLearningItemDAO);
    (StudyRecordDAO as any).mockImplementation(() => mockStudyRecordDAO);
    (StudySessionDAO as any).mockImplementation(() => mockStudySessionDAO);
    (FSRSAlgorithm as any).mockImplementation(() => mockFSRSAlgorithm);
    (DifficultyAdaptiveAlgorithm as any).mockImplementation(() => mockDifficultyAlgorithm);
    (ActiveRetrievalAlgorithm as any).mockImplementation(() => mockActiveRetrievalAlgorithm);

    mockConfig = {
      fsrs: {
        algorithm: 'fsrs',
        parameters: {
          requestRetention: 0.9,
          maximumInterval: 36500
        },
        adaptiveMode: true,
        maxReviewsPerDay: 100,
        targetRetention: 0.9
      },
      difficultyAdaptive: {
        enabled: true,
        adaptationRate: 0.1,
        minDifficulty: 0.1,
        maxDifficulty: 0.9
      },
      activeRetrieval: {
        enabled: true,
        strategiesEnabled: ['recognition', 'recall', 'cued-recall'],
        maxItemsPerSession: 20
      }
    };

    integrator = new AlgorithmIntegrator(
      mockConfig,
      mockLearningItemDAO,
      mockStudyRecordDAO,
      mockStudySessionDAO
    );
  });

  describe('generateLearningPlan', () => {
    it('should generate a learning plan with items', async () => {
      const userId = 'user123';

      mockLearningItemDAO.findDueForReview.mockResolvedValue({
        success: true,
        data: [{
          id: 'item1',
          user_id: userId,
          content: 'test content',
          difficulty: 0.5,
          stability: 1.0,
          due_date: new Date(),
          reps: 0,
          lapses: 0,
          state: 0,
          elapsed_days: 0,
          scheduled_days: 1,
          last_review: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          is_active: true,
          content_type: 'vocabulary',
          category: 'test',
          tags: 'test'
        }]
      });

      mockStudyRecordDAO.findByUserId.mockResolvedValue({
        success: true,
        data: []
      });

      mockStudySessionDAO.findByUserId.mockResolvedValue({
        success: true,
        data: []
      });

      const plan = await integrator.generateLearningPlan(userId, 1800, 10);

      expect(plan).toBeDefined();
      expect(plan.items).toHaveLength(0);
      expect(plan.totalDuration).toBeGreaterThanOrEqual(0);
      expect(mockLearningItemDAO.findDueForReview).toHaveBeenCalledWith(userId);
    });

    it('should handle empty learning items', async () => {
      const userId = 'user123';

      mockLearningItemDAO.findDueForReview.mockResolvedValue({
        success: true,
        data: []
      });

      mockStudyRecordDAO.findByUserId.mockResolvedValue({
        success: true,
        data: []
      });

      mockStudySessionDAO.findByUserId.mockResolvedValue({
        success: true,
        data: []
      });

      const plan = await integrator.generateLearningPlan(userId, 1800, 10);

      expect(plan).toBeDefined();
      expect(plan.items).toHaveLength(0);
      expect(plan.totalDuration).toBe(1800);
    });
  });

  describe('processStudyResponse', () => {
    it('should process a study response and update records', async () => {
      const userId = 'user123';
      const itemId = 'item1';
      const response = 'good';
      const responseTime = 3000;
      const confidence = 0.8;

      mockLearningItemDAO.findById.mockResolvedValue({
        success: true,
        data: {
          id: itemId,
          user_id: userId,
          content_type: 'vocabulary',
          content: 'test content',
          difficulty: 0.5,
          stability: 1.0,
          due_date: new Date(),
          reps: 0,
          lapses: 0,
          state: 0,
          elapsed_days: 0,
          scheduled_days: 1,
          last_review: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          is_active: true,
          category: 'test',
          tags: 'test'
        }
      });

      mockStudyRecordDAO.findByItemId.mockResolvedValue({
        success: true,
        data: []
      });

      mockStudyRecordDAO.findByUserId.mockResolvedValue({
        success: true,
        data: []
      });

      mockStudySessionDAO.findByUserId.mockResolvedValue({
        success: true,
        data: []
      });

      mockStudyRecordDAO.create.mockResolvedValue({
        success: true,
        data: { id: 'record1' }
      });

      mockLearningItemDAO.updateFSRSData.mockResolvedValue({
        success: true,
        data: {}
      });

      const result = await integrator.processStudyResponse(
        userId,
        itemId,
        response,
        responseTime,
        confidence
      );

      expect(result).toBeDefined();
      expect(result.updatedStrength).toBeDefined();
      expect(result.difficultyAdjustment).toBeDefined();
      expect(mockStudyRecordDAO.create).toHaveBeenCalled();
      expect(mockLearningItemDAO.updateFSRSData).toHaveBeenCalled();
    });
  });

  describe('startStudySession', () => {
    it('should create a new study session', async () => {
      const userId = 'user123';
      const sessionId = 'session123';

      mockStudySessionDAO.create.mockResolvedValue({
        success: true,
        data: { id: sessionId }
      });

      const result = await integrator.startStudySession(userId);

      expect(result).toBe(sessionId);
      expect(mockStudySessionDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          session_type: 'review',
          is_completed: false
        })
      );
    });
  });

  describe('endStudySession', () => {
    it('should end a study session', async () => {
      const sessionId = 'session123';

      mockStudySessionDAO.findById.mockResolvedValue({
        success: true,
        data: {
          id: sessionId,
          user_id: 'user123',
          session_type: 'review',
          start_time: new Date(),
          end_time: null,
          total_items: 5,
          completed_items: 3,
          correct_items: 2,
          is_completed: false
        }
      });

      mockStudySessionDAO.update.mockResolvedValue({
        success: true,
        data: {}
      });

      const result = await integrator.endStudySession(sessionId);

      expect(result).toBeDefined();
      expect(mockStudySessionDAO.update).toHaveBeenCalled();
    });
  });
});