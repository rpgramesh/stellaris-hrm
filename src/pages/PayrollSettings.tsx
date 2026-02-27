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
import { Award, StatutoryRate, TaxTable } from '../types/payroll';
import { payrollSettingsService, PayrollSettings as IPayrollSettings } from '../services/payrollSettingsService';

interface TaxBracket {
  id: string;
  tableId: string;
  index: number;
  income_from: number;
  income_to: number | null;
  tax_rate: number;
  base_tax: number;
}

const getCurrentTaxYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Australian tax year runs from July 1 to June 30
  return month >= 6 ? year : year - 1;
};

export default function PayrollSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<IPayrollSettings>({
    id: '',
    companyName: '',
    abn: '',
    defaultPayFrequency: 'Monthly',
    financialYearStart: '2024-07-01',
    stpEnabled: true,
    superannuationGuaranteeRate: 11.5,
    payrollTaxThreshold: 75000,
    workersCompensationRate: 1.5
  });
  const [taxTables, setTaxTables] = useState<TaxBracket[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [statutoryRates, setStatutoryRates] = useState<StatutoryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'tax' | 'awards' | 'statutory'>('general');
  const [showAddAward, setShowAddAward] = useState(false);
  const [showAddRate, setShowAddRate] = useState(false);
  const [showAddTaxTable, setShowAddTaxTable] = useState(false);
  const [newTaxTable, setNewTaxTable] = useState<Partial<TaxTable>>({
    financialYear: `${getCurrentTaxYear()}-${getCurrentTaxYear() + 1}`,
    taxScale: 'TaxFreeThreshold',
    residencyStatus: 'Resident',
    payFrequency: 'Weekly',
    incomeThresholds: [],
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: `${getCurrentTaxYear() + 1}-06-30`,
    isActive: true
  });
  const [newAward, setNewAward] = useState<Partial<Award>>({
    code: '',
    name: '',
    industry: '',
    version: '1.0',
    effectiveFrom: new Date().toISOString().split('T')[0],
    isActive: true
  });
  const [newRate, setNewRate] = useState<Partial<StatutoryRate>>({
    rateType: 'payg-withholding' as any,
    financialYear: `${getCurrentTaxYear()}-${getCurrentTaxYear() + 1}`,
    rate: 0,
    threshold: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
    isActive: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [settingsData, taxData, awardsData, ratesData] = await Promise.all([
        payrollSettingsService.getSettings(),
        payrollSettingsService.getTaxTables(),
        supabase.from('awards').select('*').order('name'),
        supabase.from('statutory_rates').select('*').order('effective_from', { ascending: false })
      ]);

      if (settingsData) {
        setSettings(settingsData);
      }

      const flattened: TaxBracket[] = (taxData as TaxTable[]).flatMap((table) =>
        (table.incomeThresholds || []).map((thr, idx) => ({
          id: `${table.id}:${idx}`,
          tableId: table.id,
          index: idx,
          income_from: thr.from,
          income_to: thr.to ?? null,
          tax_rate: thr.taxRate,
          base_tax: thr.baseTax
        }))
      );
      setTaxTables(flattened);
      
      const mappedAwards: Award[] = (awardsData.data || []).map((award: any) => ({
        id: award.id,
        code: award.code,
        name: award.name,
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
        effectiveFrom: rate.effective_date || rate.effective_from || new Date().toISOString(),
        effectiveTo: rate.expiry_date || rate.effective_to || new Date().toISOString(),
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
      await payrollSettingsService.updateSettings(settings);
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTaxTableUpdate = async (bracketId: string, field: 'tax_rate' | 'base_tax', value: number) => {
    try {
      const [tableId, indexStr] = bracketId.split(':');
      const index = parseInt(indexStr, 10);
      const updates =
        field === 'tax_rate'
          ? { taxRate: value }
          : { baseTax: value };

      await payrollSettingsService.updateTaxBracket(tableId, index, updates);

      setTaxTables(prev =>
        prev.map(b =>
          b.id === bracketId ? { ...b, [field]: value } : b
        )
      );
    } catch (error) {
      console.error('Error updating tax table bracket:', error);
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
      if (field === 'name') stateField = 'name';
      if (field === 'code') stateField = 'code';

      setAwards(prev => prev.map(award => 
        award.id === id ? { ...award, [stateField]: value } : award
      ));
    } catch (error) {
      console.error('Error updating award:', error);
    }
  };

  const handleAddAward = async () => {
    try {
      const { data, error } = await supabase
        .from('awards')
        .insert({
          code: newAward.code,
          name: newAward.name,
          industry: newAward.industry,
          version: newAward.version,
          effective_from: newAward.effectiveFrom,
          is_active: newAward.isActive
        })
        .select()
        .single();

      if (error) throw error;

      setAwards(prev => [...prev, {
        id: data.id,
        code: data.code,
        name: data.name,
        industry: data.industry,
        version: data.version,
        effectiveFrom: data.effective_from,
        isActive: data.is_active,
        createdAt: data.created_at
      }]);
      setShowAddAward(false);
      setNewAward({
        code: '',
        name: '',
        industry: '',
        version: '1.0',
        effectiveFrom: new Date().toISOString().split('T')[0],
        isActive: true
      });
    } catch (error) {
      console.error('Error adding award:', error);
      alert('Error adding award');
    }
  };

  const handleAddRate = async () => {
    try {
      const { data, error } = await supabase
        .from('statutory_rates')
        .insert({
          rate_type: newRate.rateType,
          financial_year: newRate.financialYear,
          rate: newRate.rate,
          threshold: newRate.threshold,
          effective_from: newRate.effectiveFrom,
          is_active: newRate.isActive
        })
        .select()
        .single();

      if (error) throw error;

      setStatutoryRates(prev => [...prev, {
        id: data.id,
        rateType: data.rate_type,
        financialYear: data.financial_year,
        rate: data.rate,
        threshold: data.threshold,
        effectiveFrom: data.effective_from,
        effectiveTo: data.effective_to,
        isActive: data.is_active
      }]);
      setShowAddRate(false);
      setNewRate({
        rateType: 'payg-withholding' as any,
        financialYear: `${getCurrentTaxYear()}-${getCurrentTaxYear() + 1}`,
        rate: 0,
        threshold: 0,
        effectiveFrom: new Date().toISOString().split('T')[0],
        isActive: true
      });
    } catch (error) {
      console.error('Error adding statutory rate:', error);
      alert('Error adding statutory rate');
    }
  };

  const handleAddTaxTable = async () => {
    try {
      // Default brackets
      const defaultThresholds = [
        { from: 0, to: 18200, baseTax: 0, taxRate: 0 },
        { from: 18201, to: 45000, baseTax: 0, taxRate: 19 },
        { from: 45001, to: 120000, baseTax: 5092, taxRate: 32.5 },
        { from: 120001, to: 180000, baseTax: 29467, taxRate: 37 },
        { from: 180001, to: null, baseTax: 51667, taxRate: 45 }
      ];

      const { data, error } = await supabase
        .from('tax_tables')
        .insert({
          financial_year: newTaxTable.financialYear,
          tax_scale: newTaxTable.taxScale,
          residency_status: newTaxTable.residencyStatus,
          pay_frequency: newTaxTable.payFrequency,
          income_thresholds: defaultThresholds,
          effective_from: newTaxTable.effectiveFrom,
          effective_to: newTaxTable.effectiveTo,
          is_active: newTaxTable.isActive
        })
        .select()
        .single();

      if (error) throw error;

      // Reload all to refresh flattened view
      await loadSettings();
      setShowAddTaxTable(false);
    } catch (error) {
      console.error('Error adding tax table:', error);
      alert('Error adding tax table');
    }
  };

  const handleStatutoryRateDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;
    
    try {
      const { error } = await supabase
        .from('statutory_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setStatutoryRates(prev => prev.filter(rate => rate.id !== id));
    } catch (error) {
      console.error('Error deleting statutory rate:', error);
      alert('Error deleting statutory rate');
    }
  };

  const formatRateType = (type: string) => {
    // Handle kebab-case
    if (type.includes('-')) {
      return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    // Handle CamelCase
    return type.replace(/([A-Z])/g, ' $1').trim();
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
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowAddTaxTable(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  Add Tax Table
                </button>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
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
              <button 
                onClick={() => setShowAddAward(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
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
              <button 
                onClick={() => setShowAddRate(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
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
                        {formatRateType(rate.rateType)}
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
                          <button 
                            onClick={() => handleStatutoryRateDelete(rate.id)}
                            className="text-red-600 hover:text-red-900"
                          >
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

      {/* Add Award Modal */}
      {showAddAward && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add Modern Award</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Award Code</label>
                <input 
                  type="text" 
                  value={newAward.code} 
                  onChange={e => setNewAward({...newAward, code: e.target.value})}
                  className="w-full border rounded p-2"
                  placeholder="e.g. MA000002"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Award Name</label>
                <input 
                  type="text" 
                  value={newAward.name} 
                  onChange={e => setNewAward({...newAward, name: e.target.value})}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Industry</label>
                <input 
                  type="text" 
                  value={newAward.industry} 
                  onChange={e => setNewAward({...newAward, industry: e.target.value})}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Effective From</label>
                <input 
                  type="date" 
                  value={newAward.effectiveFrom} 
                  onChange={e => setNewAward({...newAward, effectiveFrom: e.target.value})}
                  className="w-full border rounded p-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setShowAddAward(false)} className="px-4 py-2 border rounded text-gray-600">Cancel</button>
              <button onClick={handleAddAward} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Statutory Rate Modal */}
      {showAddRate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add Statutory Rate</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rate Type</label>
                <select 
                  value={newRate.rateType} 
                  onChange={e => setNewRate({...newRate, rateType: e.target.value as any})}
                  className="w-full border rounded p-2"
                >
                  <option value="payg-withholding">PAYG Withholding</option>
                  <option value="superannuation-guarantee">Superannuation Guarantee</option>
                  <option value="payroll-tax">Payroll Tax</option>
                  <option value="workers-compensation">Workers Compensation</option>
                  <option value="medicare-levy">Medicare Levy</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Financial Year</label>
                <input 
                  type="text" 
                  value={newRate.financialYear} 
                  onChange={e => setNewRate({...newRate, financialYear: e.target.value})}
                  className="w-full border rounded p-2"
                  placeholder="e.g. 2024-2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rate (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newRate.rate} 
                  onChange={e => setNewRate({...newRate, rate: parseFloat(e.target.value)})}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Threshold ($)</label>
                <input 
                  type="number" 
                  value={newRate.threshold} 
                  onChange={e => setNewRate({...newRate, threshold: parseFloat(e.target.value)})}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Effective From</label>
                <input 
                  type="date" 
                  value={newRate.effectiveFrom} 
                  onChange={e => setNewRate({...newRate, effectiveFrom: e.target.value})}
                  className="w-full border rounded p-2"
                />
              </div>
            </div>
             <div className="mt-6 flex justify-end space-x-2">
               <button onClick={() => setShowAddRate(false)} className="px-4 py-2 border rounded text-gray-600">Cancel</button>
               <button onClick={handleAddRate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
             </div>
           </div>
         </div>
       )}

      {/* Add Tax Table Modal */}
      {showAddTaxTable && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add Tax Table</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Financial Year</label>
                <input 
                  type="text" 
                  value={newTaxTable.financialYear} 
                  onChange={e => setNewTaxTable({...newTaxTable, financialYear: e.target.value})}
                  className="w-full border rounded p-2"
                  placeholder="e.g. 2024-2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pay Frequency</label>
                <select 
                  value={newTaxTable.payFrequency} 
                  onChange={e => setNewTaxTable({...newTaxTable, payFrequency: e.target.value as any})}
                  className="w-full border rounded p-2"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Fortnightly">Fortnightly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tax Scale</label>
                <input 
                  type="text" 
                  value={newTaxTable.taxScale} 
                  onChange={e => setNewTaxTable({...newTaxTable, taxScale: e.target.value})}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Effective From</label>
                <input 
                  type="date" 
                  value={newTaxTable.effectiveFrom} 
                  onChange={e => setNewTaxTable({...newTaxTable, effectiveFrom: e.target.value})}
                  className="w-full border rounded p-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setShowAddTaxTable(false)} className="px-4 py-2 border rounded text-gray-600">Cancel</button>
              <button onClick={handleAddTaxTable} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create Table</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
