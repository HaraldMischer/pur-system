// pur-system/src/app/guards/guard-navigation.spec.ts

import { getInitialisierungsRueckkehrUrl } from './guard-navigation';

describe('getInitialisierungsRueckkehrUrl', () => {
  it('should preserve a valid internal route including query parameters', () => {
    expect(getInitialisierungsRueckkehrUrl('/mitarbeiter/liste?filter=aktiv')).toBe(
      '/mitarbeiter/liste?filter=aktiv',
    );
  });

  it.each([null, '', 'https://example.com', '//example.com', '/login', '/initialisierungsfehler'])(
    'should replace the unsafe return URL %s with the dashboard',
    (returnUrl) => {
      expect(getInitialisierungsRueckkehrUrl(returnUrl)).toBe('/dashboard');
    },
  );
});
