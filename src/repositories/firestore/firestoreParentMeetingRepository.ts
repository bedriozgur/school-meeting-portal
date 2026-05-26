import { collection, getDocs, limit, query, where } from "firebase/firestore";
import type { ParentMeetingRepository } from "../interfaces";
import { sortTeacherAssignments } from "../../utils/teachers";
import { mapTeacherAssignment } from "./firestoreMappers";
import type { FirestoreMeetingAssignmentDocument } from "./firestoreTypes";
import {
  findActiveOrDraftEventByCode,
  findStudentForEvent,
  getClassById,
  getSchoolById,
  getTeacherById,
  requireFirestore,
} from "./firestoreLookups";

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

    const [school, classData] = await Promise.all([
      getSchoolById(db, meetingEvent.schoolId),
      getClassById(db, student.classId),
    ]);
    const classTeacher = classData.classTeacherId
      ? await getTeacherById(db, classData.classTeacherId)
      : null;
    const assignmentsSnapshot = await getDocs(
      query(
        collection(db, "meetingAssignments"),
        where("eventId", "==", meetingEvent.id),
        where("schoolId", "==", meetingEvent.schoolId),
        where("classId", "==", student.classId),
        limit(50),
      ),
    );
    const teacherAssignments = await Promise.all(
      assignmentsSnapshot.docs.map(async (assignmentDocument) => {
        const assignmentData =
          assignmentDocument.data() as FirestoreMeetingAssignmentDocument;
        const teacher = await getTeacherById(db, assignmentData.teacherId ?? "");

        return mapTeacherAssignment({
          id: assignmentDocument.id,
          assignmentData,
          teacher,
        });
      }),
    );

    return {
      school,
      meetingEvent,
      student,
      classTeacher,
      teacherAssignments: sortTeacherAssignments(teacherAssignments),
    };
  },
};
