import { validateIdCheckSubmission, MIN_ID_CHECK_POINTS } from '../idCheckValidation';

describe('validateIdCheckSubmission', () => {
  it('fails when there are no drafts', () => {
    const result = validateIdCheckSubmission([]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'At least one primary document must be uploaded before submission'
    );
    expect(result.errors).toContain(
      `You currently have 0 points. You need at least ${MIN_ID_CHECK_POINTS} points before submitting.`
    );
  });

  it('fails when there is no primary document even if points are sufficient', () => {
    const result = validateIdCheckSubmission([
      { category: 'Secondary', points: 40 },
      { category: 'Secondary', points: 60 }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe(
      'At least one primary document must be uploaded before submission'
    );
  });

  it('fails when primary exists but total points are below minimum', () => {
    const result = validateIdCheckSubmission([
      { category: 'Primary', points: 70 }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      `You currently have 70 points. You need at least ${MIN_ID_CHECK_POINTS} points before submitting.`
    );
  });

  it('passes when there is at least one primary document and enough points', () => {
    const result = validateIdCheckSubmission([
      { category: 'Primary', points: 70 },
      { category: 'Secondary', points: 40 }
    ]);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.totalPoints).toBe(110);
  });
});

