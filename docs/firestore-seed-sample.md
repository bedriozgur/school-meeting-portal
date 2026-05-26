# Firestore Seed Sample

Use this as a reference shape for manual test data. Document IDs are examples; keep cross-reference IDs aligned.

## `schools/atatürk-ortaokulu`

```json
{
  "name": "Atatürk Ortaokulu",
  "logoInitials": "OT",
  "schoolId": "atatürk-ortaokulu"
}
```

## `events/spring-2026-parent-meetings`

```json
{
  "schoolId": "atatürk-ortaokulu",
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
  "schoolId": "atatürk-ortaokulu",
  "name": "7-B",
  "grade": "7",
  "classTeacherId": "ayse-demir"
}
```

## `classes/class-6-a`

```json
{
  "schoolId": "atatürk-ortaokulu",
  "name": "6-A",
  "grade": "6",
  "classTeacherId": "mehmet-kaya"
}
```

## `students/student-2458`

```json
{
  "schoolId": "atatürk-ortaokulu",
  "schoolNumber": "2458",
  "fullName": "Ada Yıldırım",
  "classId": "class-7-b"
}
```

## `students/student-1934`

```json
{
  "schoolId": "atatürk-ortaokulu",
  "schoolNumber": "1934",
  "fullName": "Efe Aydın",
  "classId": "class-6-a"
}
```

## `teachers/ayse-demir`

```json
{
  "schoolId": "atatürk-ortaokulu",
  "fullName": "Ayşe Demir",
  "defaultSubject": "Türkçe"
}
```

## `teachers/mehmet-kaya`

```json
{
  "schoolId": "atatürk-ortaokulu",
  "fullName": "Mehmet Kaya",
  "defaultSubject": "Matematik"
}
```

## `meetingAssignments/assignment-ayse-demir-7-b`

```json
{
  "eventId": "spring-2026-parent-meetings",
  "schoolId": "atatürk-ortaokulu",
  "teacherId": "ayse-demir",
  "classId": "class-7-b",
  "subject": "Türkçe",
  "building": "A",
  "floor": 1,
  "classroom": "A-104",
  "isAvailable": true
}
```

## `meetingAssignments/assignment-mehmet-kaya-7-b`

```json
{
  "eventId": "spring-2026-parent-meetings",
  "schoolId": "atatürk-ortaokulu",
  "teacherId": "mehmet-kaya",
  "classId": "class-7-b",
  "subject": "Matematik",
  "building": "A",
  "floor": 1,
  "classroom": "A-108",
  "isAvailable": false
}
```
