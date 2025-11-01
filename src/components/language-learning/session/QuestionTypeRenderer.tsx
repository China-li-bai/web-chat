import React, { useMemo } from 'react';
import { Typography } from 'antd';
import { LearningFlashcard } from '@/components/language-learning/LearningFlashcard';
import { ChoiceQuestion } from '@/components/language-learning/ChoiceQuestion';
import { SpellingQuestion } from '@/components/language-learning/SpellingQuestion';
import { ListeningQuestion } from '@/components/language-learning/ListeningQuestion';
import { ClozeSpellingQuestion } from '@/components/language-learning/ClozeSpellingQuestion';
import { LetterFillSpellingQuestion } from '@/components/language-learning/LetterFillSpellingQuestion';
import { useLearningSessionStore } from '@/store/useLearningSessionStore';
import type { ScheduledItem } from '@/lib/memo/types';
import type { QuestionType } from '@/modules/qts';

const { Title, Paragraph, Text } = Typography;

interface QuestionTypeRendererProps {
  currentItem: ScheduledItem;
  questionType: QuestionType;
  onResponse: (response: 'again' | 'hard' | 'good' | 'easy') => void;
  onFlip: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const QuestionTypeRenderer: React.FC<QuestionTypeRendererProps> = ({
  currentItem,
  questionType,
  onResponse,
  onFlip,
  onSwipeLeft,
  onSwipeRight
}) => {
  const { 
    isFlipped, 
    segmentPolicy, 
    rolling 
  } = useLearningSessionStore();

  // Extract item details
  const details = useMemo(() => 
    (currentItem.item as any).details || {}, 
    [currentItem]
  );

  const word = useMemo(() => 
    String(((currentItem as any)?.item?.content) || ''), 
    [currentItem]
  );

  const definition = useMemo(() => 
    String((((currentItem as any)?.item?.details)?.definition) || ''), 
    [currentItem]
  );

  const translation = useMemo(() => 
    (currentItem as any)?.item?.details?.translation, 
    [currentItem]
  );

  const retrievability = useMemo(() => 
    (currentItem as any)?.memoryStrength?.retrievability, 
    [currentItem]
  );

  const rollingAccuracy = useMemo(() => {
    if (!rolling.length) return undefined as number | undefined;
    const n = Math.min(20, rolling.length);
    const slice = rolling.slice(-n);
    return slice.reduce((a, b) => a + (b ? 1 : 0), 0) / n;
  }, [rolling]);

  // Flashcard content preparation
  const frontContent = useMemo(() => (
    <Title level={2}>{currentItem.item.content}</Title>
  ), [currentItem.item.content]);

  const backContent = useMemo(() => (
    <div>
      <Title level={4}>{currentItem.item.content}</Title>
      <Text type="secondary">{details?.phonetic || ''}</Text>
      <hr style={{ margin: '12px 0' }} />
      <Paragraph>{details?.definition || 'No definition provided.'}</Paragraph>
      {details?.example && <Paragraph type="secondary">e.g., {details.example}</Paragraph>}
    </div>
  ), [currentItem.item.content, details]);

  // Render appropriate question type
  const renderQuestion = () => {
    switch (questionType) {
      case 'flashcard':
        return (
          <LearningFlashcard
            frontContent={frontContent}
            backContent={backContent}
            isFlipped={isFlipped}
            onFlip={onFlip}
            onSwipeLeft={onSwipeLeft}
            onSwipeRight={onSwipeRight}
            translation={details?.translation}
          />
        );

      case 'choice':
        return (
          <ChoiceQuestion
            word={word}
            definition={definition}
            translation={translation}
            retrievability={retrievability}
            rollingAccuracy={rollingAccuracy}
            allowHint={segmentPolicy.choiceHintAllowed}
            onAnswer={(ok) => onResponse(ok ? 'good' : 'again')}
          />
        );

      case 'spelling':
        // Complex spelling logic from original file
        if (word.length >= 4) {
          return (
            <LetterFillSpellingQuestion
              word={word}
              definition={definition}
              translation={translation}
              isFlipped={isFlipped}
              onResult={(ok) => onResponse(ok ? 'good' : 'again')}
            />
          );
        } else if (details?.example) {
          return (
            <ClozeSpellingQuestion
              word={word}
              sentence={String(details.example || '')}
              definition={definition}
              translation={translation}
              onResult={(ok) => onResponse(ok ? 'good' : 'again')}
            />
          );
        } else {
          return (
            <SpellingQuestion
              targetWord={word}
              definition={definition}
              translation={translation}
              onResult={(ok) => onResponse(ok ? 'good' : 'again')}
            />
          );
        }

      case 'listening':
        return (
          <ListeningQuestion
            word={word}
            translation={translation}
            isFlipped={isFlipped}
            onFlip={onFlip}
            onResult={(ok) => onResponse(ok ? 'good' : 'again')}
          />
        );

      default:
        // Fallback to flashcard
        return (
          <LearningFlashcard
            frontContent={frontContent}
            backContent={backContent}
            isFlipped={isFlipped}
            onFlip={onFlip}
            onSwipeLeft={onSwipeLeft}
            onSwipeRight={onSwipeRight}
            translation={details?.translation}
          />
        );
    }
  };

  return (
    <div className="question-type-container">
      {renderQuestion()}
    </div>
  );
};