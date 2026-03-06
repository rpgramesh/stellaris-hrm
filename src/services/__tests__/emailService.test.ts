import { emailService, EmailType } from '../emailService';
import { supabase } from '@/lib/supabase';

// Mock supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      upsert: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }
}));

describe('EmailService Enable/Disable Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveTemplateByType', () => {
    it('should return null if the email type is disabled', async () => {
      // Setup mock response for assignment (disabled)
      const mockMaybeSingle = supabase.from('email_template_assignments').select('').eq('').maybeSingle as jest.Mock;
      mockMaybeSingle.mockResolvedValue({
        data: { template_id: 'tpl-123', is_enabled: false },
        error: null
      });

      const result = await emailService.resolveTemplateByType('WELCOME');
      expect(result).toBeNull();
    });

    it('should return the template if the email type is enabled', async () => {
      const mockMaybeSingle = supabase.from('email_template_assignments').select('').eq('').maybeSingle as jest.Mock;
      
      // First call for assignment
      mockMaybeSingle.mockResolvedValueOnce({
        data: { template_id: 'tpl-123', is_enabled: true },
        error: null
      });

      // Second call for template
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'tpl-123', name: 'Welcome Template', subject: 'Hi', body: 'Hello' },
        error: null
      });

      const result = await emailService.resolveTemplateByType('WELCOME');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('tpl-123');
    });

    it('should treat undefined is_enabled as true (default behavior)', async () => {
      const mockMaybeSingle = supabase.from('email_template_assignments').select('').eq('').maybeSingle as jest.Mock;
      
      // First call for assignment
      mockMaybeSingle.mockResolvedValueOnce({
        data: { template_id: 'tpl-123' }, // is_enabled is missing
        error: null
      });

      // Second call for template
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'tpl-123', name: 'Welcome Template' },
        error: null
      });

      const result = await emailService.resolveTemplateByType('WELCOME');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('tpl-123');
    });
  });

  describe('toggleEmailTypeEnabled', () => {
    it('should call supabase update with correct parameters', async () => {
      const mockUpdate = supabase.from('email_template_assignments').update as jest.Mock;
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });

      await emailService.toggleEmailTypeEnabled('WELCOME', false);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        is_enabled: false
      }));
      expect(mockEq).toHaveBeenCalledWith('email_type', 'WELCOME');
    });
  });
});
