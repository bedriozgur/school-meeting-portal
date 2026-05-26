export type FirestoreRepositoryErrorCode =
  | "missing-config"
  | "missing-event"
  | "missing-student"
  | "missing-school"
  | "missing-class"
  | "missing-teacher";

export class FirestoreRepositoryError extends Error {
  constructor(
    public readonly code: FirestoreRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FirestoreRepositoryError";
  }
}
