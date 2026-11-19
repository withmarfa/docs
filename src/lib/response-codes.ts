/**
 * The response codes of an operation, split for its two controls: the success
 * codes stay tabs, and the error codes (4xx and 5xx) go in one select. A page
 * of fifteen codes is then two controls instead of a row of fifteen tabs.
 */
export const isErrorCode = (code: string) => /^[45]\d\d$/.test(code);

export function splitResponseCodes(codes: string[]): { success: string[]; errors: string[] } {
  return {
    success: codes.filter((code) => !isErrorCode(code)),
    errors: codes.filter(isErrorCode),
  };
}

/** The page that says what each error code means; the select links to it. */
export const ERRORS_PAGE = '/reference/errors';
