import { describe, expect, it } from 'vitest';
import { eligibleDrivers, eligibleVehicles, seed } from '../../src/lib/store';
describe('dispatch eligibility', () => {
  it('only returns available usable vehicles', () =>
    expect(eligibleVehicles(seed()).map((v) => v.name)).toEqual(['Van-05']));
  it('blocks expired, suspended and unavailable drivers', () =>
    expect(eligibleDrivers(seed()).map((d) => d.name)).toEqual(['Alex']));
});
