import { validatePassword } from '../utils/passwordPolicy';

describe('Password policy', () => {
  it('rejects passwords shorter than 8 chars (boundary)', () => {
    expect(() => validatePassword('Aa1!aaa')).toThrow('Password must be at least 8 characters');
  });

  it('rejects missing lowercase/uppercase/number/special (equivalence partitions)', () => {
    expect(() => validatePassword('AAAAAAA1!')).toThrow('Password must contain a lowercase letter');
    expect(() => validatePassword('aaaaaaa1!')).toThrow('Password must contain an uppercase letter');
    expect(() => validatePassword('Aaaaaaa!!')).toThrow('Password must contain a number');
    expect(() => validatePassword('Aaaaaaa11')).toThrow('Password must contain a special character');
  });

  it('accepts a valid strong password', () => {
    expect(() => validatePassword('Strong@123')).not.toThrow();
  });
});
