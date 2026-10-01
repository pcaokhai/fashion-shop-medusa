/** Thrown by the release helpers instead of returning partial output. */
export class ReleaseError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReleaseError";
  }
}
