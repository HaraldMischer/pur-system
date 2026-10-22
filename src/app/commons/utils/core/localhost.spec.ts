// pur-system/src/app/commons/utils/core/localhost.spec.ts

import { isLocalhost } from './localhost';

describe('isLocalhost', () => {
  it('should recognize only local hostnames', () => {
    expect(isLocalhost('localhost')).toBe(true);
    expect(isLocalhost('127.0.0.1')).toBe(true);
    expect(isLocalhost('::1')).toBe(true);
    expect(isLocalhost('pur-filiale.web.app')).toBe(false);
    expect(isLocalhost('192.168.1.10')).toBe(false);
  });
});
