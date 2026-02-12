// Simple test to check if SalaryAdjustments component loads
const SalaryAdjustments = require('./src/pages/SalaryAdjustments.tsx');

console.log('Testing SalaryAdjustments component...');
try {
  console.log('Component exported:', typeof SalaryAdjustments);
  console.log('Component test completed successfully');
} catch (error) {
  console.error('Error testing component:', error);
}