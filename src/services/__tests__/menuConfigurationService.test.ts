
import { menuConfigurationService } from '@/services/menuConfigurationService';
import { supabase } from '@/lib/supabase';

// Mock supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('menuConfigurationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should validate display name length', async () => {
      const longName = 'A'.repeat(51);
      const result = await menuConfigurationService.update('test', longName);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Display name must be max 50 characters');
    });

    it('should validate special characters', async () => {
      const invalidName = 'Dashboard@#';
      const result = await menuConfigurationService.update('test', invalidName);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Special characters are not allowed except spaces and hyphens');
    });

    it('should call upsert with correct parameters', async () => {
      const mockUser = { user: { id: 'user-123' } };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: mockUser });
      
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await menuConfigurationService.update('dashboard', 'Main Dashboard');
      
      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          menu_key: 'dashboard',
          display_name: 'Main Dashboard',
          updated_by: 'user-123',
        },
        { onConflict: 'menu_key' }
      );
    });
  });
});
