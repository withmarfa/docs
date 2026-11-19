import { describe, expect, it } from 'vitest';
import { ERRORS_PAGE, isErrorCode, splitResponseCodes } from './response-codes';
import { source } from './source';
import spec from '../../openapi.json';

describe('splitResponseCodes', () => {
  it('keeps the success codes as tabs and gathers the 4xx and 5xx codes for the select', () => {
    expect(splitResponseCodes(['200', '201', '400', '404', '429', '500', '507'])).toEqual({
      success: ['200', '201'],
      errors: ['400', '404', '429', '500', '507'],
    });
  });

  it('holds a code that is neither, such as a redirect, with the tabs', () => {
    expect(splitResponseCodes(['204', '304', 'default'])).toEqual({ success: ['204', '304', 'default'], errors: [] });
    expect(isErrorCode('399')).toBe(false);
    expect(isErrorCode('600')).toBe(false);
  });

  it('turns the widest operation in the spec into at most four success tabs and one select', () => {
    const widest = Math.max(
      ...Object.values(spec.paths).flatMap((operations) => Object.values(operations).map((operation) => splitResponseCodes(Object.keys((operation as { responses?: object }).responses ?? {})).success.length)),
    );
    expect(widest).toBeLessThanOrEqual(4);
  });

  it('links an Errors page that exists', () => {
    expect(source.getPage(ERRORS_PAGE.replace(/^\//, '').split('/'))).toBeDefined();
  });
});
