import { useMutation } from '@tanstack/react-query';
import { postData } from '../client';

/** Grade a single flashcard swipe (know / again / skip). */
export interface SwipeGradeBody {
  card_id: number;
  grade: 'know' | 'again' | 'skip';
}

export function useSwipeCard(productSlug: string) {
  return useMutation({
    mutationFn: (body: SwipeGradeBody) =>
      postData<null>(`/learn/${productSlug}/flashcards/swipe`, body),
  });
}
