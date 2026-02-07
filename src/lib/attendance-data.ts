import { AttendanceRecord } from "@/types";

export const mockAttendance: AttendanceRecord[] = [
  {
    id: 'ATT001',
    employeeId: 'EMP001',
    date: '2023-10-26',
    clockIn: '2023-10-26T08:55:00',
    clockOut: '2023-10-26T17:05:00',
    location: {
      lat: 40.7128,
      lng: -74.0060,
      address: 'New York, NY',
    },
    status: 'Present',
    workerType: 'Permanent',
    projectCode: 'PJ-101',
    notes: 'Completed website redesign tasks',
    breaks: [
      {
        id: 'BR001',
        startTime: '2023-10-26T12:00:00',
        endTime: '2023-10-26T12:30:00',
        type: 'Lunch'
      }
    ],
    totalBreakMinutes: 30,
    overtimeMinutes: 5
  },
  {
    id: 'ATT002',
    employeeId: 'EMP001',
    date: '2023-10-25',
    clockIn: '2023-10-25T09:10:00',
    clockOut: '2023-10-25T17:00:00',
    location: {
      lat: 40.7128,
      lng: -74.0060,
      address: 'New York, NY',
    },
    status: 'Late',
    workerType: 'Permanent',
    projectCode: 'PJ-102',
    notes: 'Mobile app development - delayed by traffic',
    breaks: [
      {
        id: 'BR002',
        startTime: '2023-10-25T12:15:00',
        endTime: '2023-10-25T12:45:00',
        type: 'Lunch'
      }
    ],
    totalBreakMinutes: 30
  },
  {
    id: 'ATT003',
    employeeId: 'EMP001',
    date: '2023-10-24',
    clockIn: '2023-10-24T08:50:00',
    clockOut: '2023-10-24T17:10:00',
    location: {
      lat: 40.7128,
      lng: -74.0060,
      address: 'New York, NY',
    },
    status: 'Present',
    workerType: 'Casual',
    projectCode: 'PJ-103',
    notes: 'Maintenance work - casual shift',
    breaks: [
      {
        id: 'BR003',
        startTime: '2023-10-24T11:45:00',
        endTime: '2023-10-24T12:15:00',
        type: 'Lunch'
      },
      {
        id: 'BR004',
        startTime: '2023-10-24T15:00:00',
        endTime: '2023-10-24T15:15:00',
        type: 'Short'
      }
    ],
    totalBreakMinutes: 45,
    overtimeMinutes: 10,
    isFieldWork: true
  },
];
