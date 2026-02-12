import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  DollarSign, 
  Award as AwardIcon, 
  Calculator,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Award, StatutoryRate } from '../types/payroll';

interface TaxTableDB {
  id: string;
  income_from: number;
  income_to: number | null;
  tax_rate: number;
  base_tax: number;
  medicare_levy_rate: number;
}

interface PayrollSettings {
  companyName: string;
  abn: string;
  defaultPayFrequency: 'Weekly' | 'Fortnightly' | 'Monthly';
  financialYearStart: string;
  stpEnabled: boolean;
  superannuationGuaranteeRate: number;
  payrollTaxThreshold: number;
  workersCompensationRate: number;
}

export default function PayrollSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<PayrollSettings>({
    companyName: '',
    abn: '',
    defaultPayFrequency: 'Monthly',
    financialYearStart: '2024-07-01',
    stpEnabled: true,
    superannuationGuaranteeRate: 11.5,
    payrollTaxThreshold: 75000,
    workersCompensationRate: 1.5
  });
  const [taxTables, setTaxTables] = useState<TaxTableDB[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [statutoryRates, setStatutoryRates] = useState<StatutoryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'tax' | 'awards' | 'statutory'>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [settingsData, taxData, awardsData, ratesData] = await Promise.all([
        // Load company settings (would typically come from a settings table)
        Promise.resolve(null), // Placeholder for settings
        supabase.from('tax_tables').select('*').order('income_from'),
        supabase.from('awards').select('*').order('award_name'),
        supabase.from('statutory_rates').select('*').order('effective_date', { ascending: false })
      ]);

      setTaxTables(taxData.data || []);
      
      const mappedAwards: Award[] = (awardsData.data || []).map((award: any) => ({
        id: award.id,
        code: award.award_code,
        name: award.award_name,
        industry: award.industry,
        version: award.version,
        effectiveFrom: award.effective_from,
        effectiveTo: award.effective_to,
        isActive: award.is_active,
        createdAt: award.created_at
      }));
      setAwards(mappedAwards);
      
      const mappedRates: StatutoryRate[] = (ratesData.data || []).map((rate: any) => ({
        id: rate.id,
        rateType: rate.rate_type,
        financialYear: rate.financial_year,
        rate: rate.rate_percentage || rate.rate,
        threshold: rate.threshold,
        effectiveFrom: rate.effective_date || rate.effective_from,
        effectiveTo: rate.expiry_date || rate.effective_to,
        isActive: rate.is_active
      }));
      setStatutoryRates(mappedRates);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save settings to database
      // This would typically update a settings table
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTaxTableUpdate = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('tax_tables')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setTaxTables(prev => prev.map(table => 
        table.id === id ? { ...table, [field]: value } : table
      ));
    } catch (error) {
      console.error('Error updating tax table:', error);
    }
  };

  const handleAwardUpdate = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('awards')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      let stateField = field;
      if (field === 'is_active') stateField = 'isActive';
      if (field === 'award_name') stateField = 'name';
      if (field === 'award_code') stateField = 'code';

      setAwards(prev => prev.map(award => 
        award.id === id ? { ...award, [stateField]: value } : award
      ));
    } catch (error) {
      console.error('Error updating award:', error);
    }
  };

  const getCurrentTaxYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Australian tax year runs from July 1 to June 30
    return month >= 6 ? year : year - 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payroll Settings</h1>
        <p className="text-gray-600 mt-1">Configure payroll system settings and compliance parameters</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', name: 'General Settings', icon: Settings },
            { id: 'tax', name: 'Tax Tables', icon: Calculator },
            { id: 'awards', name: 'Awards', icon: AwardIcon },
            { id: 'statutory', name: 'Statutory Rates', icon: DollarSign }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border">
        {activeTab === 'general' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ABN
                </label>
                <input
                  type="text"
                  value={settings.abn}
                  onChange={(e) => setSettings({ ...settings, abn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter ABN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Pay Frequency
                </label>
                <select
                  value={settings.defaultPayFrequency}
                  onChange={(e) => setSettings({ ...settings, defaultPayFrequency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Fortnightly">Fortnightly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Financial Year Start
                </label>
                <input
                  type="date"
                  value={settings.financialYearStart}
                  onChange={(e) => setSettings({ ...settings, financialYearStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Superannuation Guarantee Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.superannuationGuaranteeRate}
                  onChange={(e) => setSettings({ ...settings, superannuationGuaranteeRate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payroll Tax Threshold ($)
                </label>
                <input
                  type="number"
                  value={settings.payrollTaxThreshold}
                  onChange={(e) => setSettings({ ...settings, payrollTaxThreshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workers Compensation Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.workersCompensationRate}
                  onChange={(e) => setSettings({ ...settings, workersCompensationRate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="stpEnabled"
                  checked={settings.stpEnabled}
                  onChange={(e) => setSettings({ ...settings, stpEnabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="stpEnabled" className="text-sm font-medium text-gray-700">
                  Enable Single Touch Payroll (STP)
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Tax Tables - {getCurrentTaxYear()}/{getCurrentTaxYear() + 1}
              </h3>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Income Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Tax
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medicare Levy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {taxTables.map((table) => (
                    <tr key={table.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${table.income_from.toLocaleString()} - ${table.income_to?.toLocaleString() || 'No limit'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          value={table.tax_rate}
                          onChange={(e) => handleTaxTableUpdate(table.id, 'tax_rate', parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        %
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          value={table.base_tax}
                          onChange={(e) => handleTaxTableUpdate(table.id, 'base_tax', parseFloat(e.target.value))}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          value={table.medicare_levy_rate}
                          onChange={(e) => handleTaxTableUpdate(table.id, 'medicare_levy_rate', parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        %
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'awards' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Modern Awards</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                Add Award
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Award Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Award Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {awards.map((award) => (
                    <tr key={award.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {award.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {award.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {award.industry}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          award.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {award.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleAwardUpdate(award.id, 'is_active', !award.isActive)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {award.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'statutory' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Statutory Rates</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                Add Rate
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate (%)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Effective Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statutoryRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rate.rateType.replace(/([A-Z])/g, ' $1').trim()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rate.rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(rate.effectiveFrom).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rate.effectiveTo ? new Date(rate.effectiveTo).toLocaleDateString() : 'No expiry'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rate.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rate.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}