import type { MeetingEvent, ParentMeetingView, Student } from "../domain/models";

export type MeetingRepository = {
  findByCode: (meetingCode: string) => Promise<MeetingEvent | null>;
};

export type StudentRepository = {
  findBySchoolNumber: (params: {
    meetingCode: string;
    schoolNumber: string;
  }) => Promise<Student | null>;
};

export type ParentMeetingRepository = {
  getParentMeetingView: (params: {
    meetingCode: string;
    schoolNumber: string;
  }) => Promise<ParentMeetingView | null>;
};
