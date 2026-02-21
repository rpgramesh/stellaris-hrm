export type IDCategory = 'Primary' | 'Secondary' | 'Tertiary';

export interface IDDraftForValidation {
  category: IDCategory;
  points: number;
}

export interface IDCheckValidationResult {
  valid: boolean;
  errors: string[];
  totalPoints: number;
}

export const MIN_ID_CHECK_POINTS = 100;

export const validateIdCheckSubmission = (
  drafts: IDDraftForValidation[]
): IDCheckValidationResult => {
  const totalPoints = drafts.reduce((sum, draft) => sum + draft.points, 0);
  const hasPrimary = drafts.some(draft => draft.category === 'Primary');

  const errors: string[] = [];

  if (!hasPrimary) {
    errors.push('At least one primary document must be uploaded before submission');
  }

  if (totalPoints < MIN_ID_CHECK_POINTS) {
    errors.push(
      `You currently have ${totalPoints} points. You need at least ${MIN_ID_CHECK_POINTS} points before submitting.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    totalPoints
  };
};

