/**
 * The shape of what the checker writes into the store.
 *
 * The checker lives in another repository and owns both of these documents;
 * this file is a reader's copy of that contract, not a definition of it. Two
 * things follow. Anything added there is invisible here until it is added here
 * too, which is the intended direction. And nothing here may be assumed
 * present just because the type says so — see `parseState`.
 */

/** One outage. `start` is an array; see `incidentDuration`. */
export type IncidentRecord = {
  start: number[];
  end: number | null;
  error: string[];
};

export type LatencyRecord = {
  time: number;
  ping: number;
  loc: string;
};

/**
 * The `state` key. Columnar, because it is rewritten every few minutes and the
 * checker runs on a CPU budget: incidents are three parallel arrays, and
 * latency is hex-packed little-endian integers with run-length-encoded colo.
 */
export type CompactedState = {
  lastUpdate: number;
  overallUp: number;
  overallDown: number;
  incident: Record<
    string,
    {
      start: number[][];
      end: (number | null)[];
      error: string[][];
    }
  >;
  latency: Record<
    string,
    {
      loc: { v: string[]; c: number[] };
      ping: string;
      time: string;
    }
  >;
};

/** The `meta` key: everything needed to turn monitor ids into a page. */
export type PageMeta = {
  title?: string;
  /**
   * Epoch seconds of the earliest moment the checker can show evidence of
   * having watched anything. Absent on a store written before the checker
   * recorded it, which the reader treats as "cannot vouch for any of it".
   */
  since?: number;
  group?: Record<string, string[]>;
  monitors: {
    id: string;
    name: string;
    tooltip?: string;
    statusPageLink?: string;
    /**
     * Epoch seconds this monitor started being watched. The document-level
     * `since` is one number for the whole store, so a monitor added later
     * inherits it and gets painted green for days it did not exist.
     *
     * Absent on a store written before the checker recorded it, and on a
     * monitor the checker does not label, in which case the document-level
     * value is the best answer available.
     */
    since?: number;
  }[];
  maintenances: unknown[];
};
