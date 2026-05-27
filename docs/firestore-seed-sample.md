# Firestore Seed Sample

Use this as a reference shape for manual test data. Document IDs are examples; keep cross-reference IDs aligned.

## `schools/ted-bursa`

```json
{
  "name": "TED Bursa Koleji",
  "shortName": "TED Bursa",
  "logoInitials": "TED",
  "isActive": true,
  "themePreset": "burgundy"
}
```

## `events/spring-2026-parent-meetings`

```json
{
  "schoolId": "ted-bursa",
  "meetingCode": "BAHAR2026",
  "status": "active",
  "includedClasses": ["class-7-b", "class-6-a"],
  "title": "Bahar Dönemi Veli Görüşmeleri",
  "date": "2026-05-26"
}
```

## `classes/class-7-b`

```json
{
  "schoolId": "ted-bursa",
  "name": "7-B",
  "grade": "7",
  "classTeacherId": "ayse-demir"
}
```

## `classes/class-6-a`

```json
{
  "schoolId": "ted-bursa",
  "name": "6-A",
  "grade": "6",
  "classTeacherId": "mehmet-kaya"
}
```

## `students/student-2458`

```json
{
  "schoolId": "ted-bursa",
  "schoolNumber": "2458",
  "fullName": "Ada Yıldırım",
  "classId": "class-7-b"
}
```

## `students/student-1934`

```json
{
  "schoolId": "ted-bursa",
  "schoolNumber": "1934",
  "fullName": "Efe Aydın",
  "classId": "class-6-a"
}
```

## `teachers/ayse-demir`

```json
{
  "schoolId": "ted-bursa",
  "fullName": "Ayşe Demir",
  "defaultSubject": "Türkçe"
}
```

## `teachers/mehmet-kaya`

```json
{
  "schoolId": "ted-bursa",
  "fullName": "Mehmet Kaya",
  "defaultSubject": "Matematik"
}
```

## `teachingAssignments/teaching-ayse-demir-7-b`

```json
{
  "schoolId": "ted-bursa",
  "teacherId": "ayse-demir",
  "classId": "class-7-b",
  "subject": "",
  "subjectOverride": null,
  "isActive": true
}
```

## `teachingAssignments/teaching-mehmet-kaya-7-b`

```json
{
  "schoolId": "ted-bursa",
  "teacherId": "mehmet-kaya",
  "classId": "class-7-b",
  "subject": "",
  "subjectOverride": null,
  "isActive": true
}
```

## `teachingAssignments/teaching-mehmet-kaya-7-b-geometry`

```json
{
  "schoolId": "ted-bursa",
  "teacherId": "mehmet-kaya",
  "classId": "class-7-b",
  "subject": "",
  "subjectOverride": "Geometri",
  "isActive": true
}
```

## `eventTeacherSetups/setup-ayse-demir-spring-2026-parent-meetings`

```json
{
  "eventId": "spring-2026-parent-meetings",
  "schoolId": "ted-bursa",
  "teacherId": "ayse-demir",
  "building": "A",
  "floor": 1,
  "classroom": "A-104",
  "isAvailable": true
}
```

## `eventTeacherSetups/setup-mehmet-kaya-spring-2026-parent-meetings`

```json
{
  "eventId": "spring-2026-parent-meetings",
  "schoolId": "ted-bursa",
  "teacherId": "mehmet-kaya",
  "building": "A",
  "floor": 1,
  "classroom": "A-108",
  "isAvailable": false
}
```
