"use client";

import { useState, useEffect } from 'react';
import { performanceService } from '@/services/performanceService';
import { KPI, OKR, Feedback360 } from '@/types';

export default function PerformancePage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [feedback360, setFeedback360] = useState<Feedback360[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [kpisData, okrsData, feedbackData] = await Promise.all([
        performanceService.getKPIs(),
        performanceService.getOKRs(),
        performanceService.getFeedback360()
      ]);
      setKpis(kpisData);
      setOkrs(okrsData);
      setFeedback360(feedbackData);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate stats
  const completedGoals = kpis.filter(k => k.status === 'Completed').length;
  const totalGoals = kpis.length;
  const goalProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  
  const pendingFeedback = feedback360.filter(f => f.status === 'Pending').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Management</h1>
        <p className="text-gray-500">Track goals, OKRs, and performance reviews.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Team Goals</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              goalProgress >= 70 ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'
            }`}>
              {goalProgress >= 70 ? 'On Track' : 'In Progress'}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{goalProgress}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${goalProgress >= 70 ? 'bg-green-600' : 'bg-yellow-500'}`} 
              style={{ width: `${goalProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{completedGoals} Goals Completed / {totalGoals} Total</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Review Cycle</h3>
            <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-medium">In Progress</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">Q1 2024</div>
          <p className="text-sm text-gray-500">Performance reviews due soon.</p>
          <button className="mt-4 w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">Complete My Review</button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">360° Feedback</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              pendingFeedback > 0 ? 'text-orange-600 bg-orange-50' : 'text-green-600 bg-green-50'
            }`}>
              {pendingFeedback > 0 ? 'Pending' : 'Completed'}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{pendingFeedback}</div>
          <p className="text-sm text-gray-500">Pending requests for peer feedback.</p>
          {pendingFeedback > 0 && (
            <div className="flex -space-x-2 mt-4">
               <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 border-2 border-white">JD</div>
               <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-xs font-bold text-pink-700 border-2 border-white">AS</div>
            </div>
          )}
        </div>
      </div>

      {/* KPIs Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Key Performance Indicators (KPIs)</h2>
          <button className="text-blue-600 font-medium text-sm hover:underline">+ Add New KPI</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpis.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No KPIs found. Create one to get started.
            </div>
          ) : (
            kpis.map((kpi) => (
            <div key={kpi.id} className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">{kpi.title}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  kpi.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  kpi.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  kpi.status === 'At Risk' ? 'bg-yellow-100 text-yellow-800' :
                  kpi.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {kpi.status}
                </span>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Current</span>
                  <span className="font-medium">{kpi.currentValue} / {kpi.target}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      kpi.progress >= 80 ? 'bg-green-500' :
                      kpi.progress >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} 
                    style={{ width: `${kpi.progress}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                <p>Owner: {kpi.employeeName}</p>
                <p>Due: {new Date(kpi.dueDate).toLocaleDateString()}</p>
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      {/* OKRs Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Objectives & Key Results (OKRs)</h2>
          <button className="text-blue-600 font-medium text-sm hover:underline">+ Add New Goal</button>
        </div>

        <div className="space-y-6">
          {okrs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
              No OKRs found. Create one to set goals for the quarter.
            </div>
          ) : (
            okrs.map((okr) => (
            <div key={okr.id} className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{okr.objective}</h3>
                  <p className="text-sm text-gray-500">Owned by: {okr.employeeName}</p>
                  <p className="text-xs text-gray-400 mt-1">Period: {okr.quarter}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{okr.progress}%</div>
                  <span className="text-xs text-gray-400">Total Progress</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {okr.keyResults.map((kr) => (
                  <div key={kr.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">{kr.description}</span>
                      <span className="text-gray-500">{kr.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${kr.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                        style={{ width: `${kr.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* 360-Degree Feedback Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">360-Degree Feedback</h2>
          <button className="text-blue-600 font-medium text-sm hover:underline">+ Request Feedback</button>
        </div>

        <div className="space-y-4">
          {feedback360.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
              No feedback requests found.
            </div>
          ) : (
            feedback360.map((feedback) => (
            <div key={feedback.id} className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{feedback.employeeName}</h3>
                  <p className="text-sm text-gray-500">Reviewer: {feedback.reviewerName} ({feedback.reviewerRelationship})</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    feedback.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    feedback.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                    feedback.status === 'Pending' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {feedback.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">Due: {new Date(feedback.reviewPeriod.end).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">
                    {(feedback.competencies.reduce((acc, c) => acc + c.rating, 0) / feedback.competencies.length).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">Overall Rating</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {feedback.competencies.find(c => c.competency === 'Leadership')?.rating || '-'}
                  </div>
                  <div className="text-xs text-gray-500">Leadership</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {feedback.competencies.find(c => c.competency === 'Communication')?.rating || '-'}
                  </div>
                  <div className="text-xs text-gray-500">Communication</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {feedback.competencies.find(c => c.competency === 'Teamwork')?.rating || '-'}
                  </div>
                  <div className="text-xs text-gray-500">Teamwork</div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{feedback.competencies.length}</span> competencies evaluated
                </div>
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                  {feedback.status === 'Completed' ? 'View Results' : 'View Details'} &rarr;
                </button>
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}
