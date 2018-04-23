import { describe, it } from 'mocha';
import { expect } from 'chai';

import reducers from '../../../src/dashboard/reducers/dashboardState';
import * as actions from '../../../src/dashboard/actions/dashboardState';
import { defaultFilters, dashboardState as initState } from './fixtures';

describe('Dashboard reducers', () => {
  it('should initialized', () => {
    expect(initState.sliceIds.size).to.equal(3);
  });

  it('should remove slice', () => {
    const action = {
      type: actions.REMOVE_SLICE,
      sliceId: 248,
    };

    const { sliceIds, filters, refresh } = reducers(initState, action);
    expect(sliceIds.size).to.be.equal(2);
    expect(filters).to.deep.equal(defaultFilters);
    expect(refresh).to.equal(false);
  });

  it('should remove filter slice', () => {
    const action = {
      type: actions.REMOVE_SLICE,
      sliceId: 256,
    };
    const initFilters = Object.keys(initState.filters);
    expect(initFilters).to.have.length(2);

    const { sliceIds, filters, refresh } = reducers(initState, action);
    expect(sliceIds.size).to.equal(2);
    expect(Object.keys(filters)).to.have.length(1);
    expect(refresh).to.equal(true);
  });
});
