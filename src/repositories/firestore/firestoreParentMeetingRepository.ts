import { collection, getDocs, limit, query, where } from "firebase/firestore";
import type { ParentMeetingRepository } from "../interfaces";
import type { TeacherAssignment } from "../../domain/models";
import { sortTeacherAssignments } from "../../utils/teachers";
import { requireFirestore, findActiveOrDraftEventByCode, findStudentForEvent, getSchoolById, getClassById, getTeacherByIdOrNull, getTeachingAssignmentsForClass } from "./firestoreLookups";
import type { FirestoreEventTeacherSetupDocument } from "./firestoreTypes";

export const firestoreParentMeetingRepository: ParentMeetingRepository = {
  async getParentMeetingView({ meetingCode, schoolNumber }) {
    const db = requireFirestore();
    const meetingEvent = await findActiveOrDraftEventByCode(db, meetingCode);

    if (!meetingEvent) {
      return null;
    }

    const student = await findStudentForEvent({
      db,
      meetingCode,
      schoolNumber,
    });

    if (!student) {
      return null;
    }

    const [school, classData, teachingAssignments, setupSnapshot] = await Promise.all([
      getSchoolById(db, meetingEvent.schoolId),
      getClassById(db, student.classId),
      getTeachingAssignmentsForClass(db, student.classId),
      getDocs(
        query(
          collection(db, "eventTeacherSetups"),
          where("eventId", "==", meetingEvent.id),
          limit(100),
        ),
      ),
    ]);
    const classTeacher = classData.classTeacherId
      ? await getTeacherByIdOrNull(db, classData.classTeacherId)
      : null;
    const setupByTeacherId = new Map(
      setupSnapshot.docs.map((setupDocument) => [
        (setupDocument.data() as FirestoreEventTeacherSetupDocument).teacherId ?? "",
        setupDocument.data() as FirestoreEventTeacherSetupDocument,
      ] as const),
    );

    const teacherAssignments: TeacherAssignment[] = [];
    for (const assignment of teachingAssignments.filter((row) => row.isActive)) {
      const teacherId = assignment.teacherId;
      const teacher = await getTeacherByIdOrNull(db, teacherId);
      if (!teacher) {
        continue;
      }

      const setup = setupByTeacherId.get(teacherId);
      teacherAssignments.push({
        id: assignment.id,
        teacher,
        subject: assignment.subject,
        subjectMissing: !assignment.subject.trim(),
        building: setup?.building ?? "",
        floor: setup?.floor ?? 0,
        classroom: setup?.classroom ?? "",
        availability: setup?.isAvailable ? ("available" as const) : ("busy" as const),
        locationMissing: !setup,
      });
    }

    return {
      school,
      meetingEvent,
      student,
      classTeacher,
      teacherAssignments: sortTeacherAssignments(teacherAssignments),
    };
  },
};
