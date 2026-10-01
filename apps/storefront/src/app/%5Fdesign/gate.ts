// /_design is a dev/test review surface (docs/13 §6); production routing must 404 it (R-009-25).
export const isDesignRouteEnabled = (env: { NODE_ENV?: string | undefined }): boolean =>
  env.NODE_ENV === "development" || env.NODE_ENV === "test";
