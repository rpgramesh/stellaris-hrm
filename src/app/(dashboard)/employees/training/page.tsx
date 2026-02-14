'use client';

import { useState, useEffect } from 'react';
import { Training, Employee, Course, Trainer } from '@/types';
import { trainingService } from '@/services/trainingService';
import { employeeService } from '@/services/employeeService';
import { courseService } from '@/services/courseService';
import { trainerService } from '@/services/trainerService';

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // New Item State
  const [addingItemType, setAddingItemType] = useState<'course' | 'trainer' | null>(null);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesData, trainingsData, coursesData, trainersData] = await Promise.all([
          employeeService.getAll(),
          trainingService.getAll(),
          courseService.getAll(),
          trainerService.getAll()
        ]);
        setEmployees(employeesData);
        setTrainings(trainingsData);
        setCourses(coursesData);
        setTrainers(trainersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Form State
  const [formData, setFormData] = useState<Partial<Training>>({
    date: '',
    course: '',
    courseId: '',
    trainer: '',
    trainerId: '',
    result: '',
    remark: ''
  });

  const handleView = (training: Training) => {
    setFormData(training);
    setEditingId(training.id);
    setIsViewing(true);
    setIsAdding(true);
  };

  const handleEdit = (training: Training) => {
    setFormData(training);
    setEditingId(training.id);
    setIsViewing(false);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this training record?')) {
      setTrainings(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleAddItem = (type: 'course' | 'trainer') => {
    setAddingItemType(type);
    setNewItemName('');
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachment: prev.attachment ? prev.attachment.filter((_, i) => i !== index) : []
    }));
  };

  const saveItem = async () => {
    if (!newItemName.trim() || !addingItemType) return;
    try {
      if (addingItemType === 'course') {
        const newCourse = await courseService.create({ name: newItemName });
        setCourses(prev => [...prev, newCourse]);
        setFormData(prev => ({ ...prev, course: newCourse.name, courseId: newCourse.id }));
      } else {
        const newTrainer = await trainerService.create({ name: newItemName });
        setTrainers(prev => [...prev, newTrainer]);
        setFormData(prev => ({ ...prev, trainer: newTrainer.name, trainerId: newTrainer.id }));
      }
      setAddingItemType(null);
    } catch (error) {
      console.error(`Error adding ${addingItemType}:`, error);
      alert(`Failed to add ${addingItemType}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewing) return;

    const employee = employees.find(e => e.id === formData.employeeId);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';

    setUploading(true);
    try {
      let attachmentUrls: string[] = formData.attachment || [];

      if (selectedFiles.length > 0) {
        const newUrls = await trainingService.uploadAttachments(selectedFiles);
        attachmentUrls = [...attachmentUrls, ...newUrls];
      }

      if (editingId) {
        const updatedTraining = await trainingService.update(editingId, { ...formData, attachment: attachmentUrls });
        setTrainings(prev => prev.map(t => t.id === editingId ? updatedTraining : t));
      } else {
        const newTraining = await trainingService.create({
          employeeId: formData.employeeId || '',
          date: formData.date || '',
          course: formData.course || '',
          courseId: formData.courseId,
          trainer: formData.trainer || '',
          trainerId: formData.trainerId,
          result: formData.result,
          attachment: attachmentUrls,
          remark: formData.remark
        });
        setTrainings([newTraining, ...trainings]);
      }
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (error: any) {
      console.error('Failed to save training:', error);
      alert(`Failed to save training record: ${error?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      course: '',
      courseId: '',
      trainer: '',
      trainerId: '',
      result: '',
      remark: ''
    });
    setSelectedFiles([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training</h1>
          <p className="text-gray-500">Manage employee training records.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setIsViewing(false);
            resetForm();
            setIsAdding(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Training
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {isViewing ? 'View Training' : (editingId ? 'Edit Training' : 'Add Training')}
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  disabled={isViewing}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                <div className="flex gap-2">
                  <select
                    required
                    disabled={isViewing}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.courseId || ''}
                    onChange={(e) => {
                      const selectedCourse = courses.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData, 
                        courseId: e.target.value,
                        course: selectedCourse ? selectedCourse.name : ''
                      });
                    }}
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {!isViewing && (
                    <button
                      type="button"
                      onClick={() => handleAddItem('course')}
                      className="bg-yellow-400 p-2 rounded-md hover:bg-yellow-500 text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Trainer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trainer *</label>
                <div className="flex gap-2">
                  <select
                    required
                    disabled={isViewing}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.trainerId || ''}
                    onChange={(e) => {
                      const selectedTrainer = trainers.find(t => t.id === e.target.value);
                      setFormData({
                        ...formData, 
                        trainerId: e.target.value,
                        trainer: selectedTrainer ? selectedTrainer.name : ''
                      });
                    }}
                  >
                    <option value="">Select Trainer</option>
                    {trainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {!isViewing && (
                    <button
                      type="button"
                      onClick={() => handleAddItem('trainer')}
                      className="bg-yellow-400 p-2 rounded-md hover:bg-yellow-500 text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Result */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                <input
                  type="text"
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.result || ''}
                  onChange={(e) => setFormData({...formData, result: e.target.value})}
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachment</label>
                {!isViewing && (
                  <div className="mb-2">
                    <input
                      type="file"
                      multiple
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      onChange={(e) => {
                        if (e.target.files) {
                          setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                        }
                      }}
                    />
                  </div>
                )}
                
                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="mb-2 space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase">Selected Files:</p>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md border">
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing Attachments List */}
                {formData.attachment && formData.attachment.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase">Existing Attachments:</p>
                    {formData.attachment.map((url, index) => (
                      <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded-md border border-blue-100">
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-blue-600 hover:underline truncate flex-1"
                        >
                          View Document {index + 1}
                        </a>
                        {!isViewing && (
                          <button
                            type="button"
                            onClick={() => removeExistingAttachment(index)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {!isViewing && selectedFiles.length === 0 && (!formData.attachment || formData.attachment.length === 0) && (
                  <p className="text-sm text-gray-500 italic">No files selected</p>
                )}
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark (200 characters max)</label>
                <textarea
                  maxLength={200}
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  rows={3}
                  value={formData.remark || ''}
                  onChange={(e) => setFormData({...formData, remark: e.target.value})}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                {!isViewing && (
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : (editingId ? 'Update' : 'Save')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {addingItemType && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-[60] flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-xl w-80">
            <h4 className="font-bold text-lg mb-3">
              New {addingItemType === 'course' ? 'Course' : 'Trainer'}
            </h4>
            <input
              type="text"
              className="w-full border border-gray-300 rounded p-2 mb-3"
              placeholder={`Enter ${addingItemType} name`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAddingItemType(null)}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trainer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trainings.map((training) => (
              <tr key={training.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{training.employeeName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{training.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{training.course}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{training.trainer}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{training.result || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleView(training)}
                      className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                      title="View"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(training)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(training.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
